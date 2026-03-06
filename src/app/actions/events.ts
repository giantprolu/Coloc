"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { sendPushToMany } from "@/lib/push";
import { createClient as createServerClient } from "@/lib/supabase/server";

function createAdminClient() {
	return createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!,
	);
}

/**
 * Supprime (hard delete) tous les événements passés et annulés d'une colocation.
 * Réservé aux admins.
 */
export async function cleanupEvents(colocationId: string) {
	const supabase = await createServerClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Non authentifié");

	const { data: member } = await supabase
		.from("members")
		.select("id, role, colocation_id")
		.eq("user_id", user.id)
		.single();

	if (
		!member ||
		member.role !== "admin" ||
		member.colocation_id !== colocationId
	) {
		throw new Error("Seuls les admins peuvent nettoyer les événements");
	}

	const admin = createAdminClient();
	const now = new Date().toISOString();

	// Supprime les événements annulés
	await admin
		.from("events")
		.delete()
		.eq("colocation_id", colocationId)
		.eq("status", "cancelled");

	// Supprime les événements passés (end_at < now)
	await admin
		.from("events")
		.delete()
		.eq("colocation_id", colocationId)
		.lt("end_at", now);

	revalidatePath("/calendar");
}

/**
 * Supprime un événement spécifique (admin ou créateur).
 */
export async function deleteEvent(eventId: string) {
	const supabase = await createServerClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Non authentifié");

	const { data: member } = await supabase
		.from("members")
		.select("id, role, colocation_id")
		.eq("user_id", user.id)
		.single();

	if (!member) throw new Error("Membre introuvable");

	const { data: event } = await supabase
		.from("events")
		.select("id, created_by, colocation_id")
		.eq("id", eventId)
		.single();

	if (!event || event.colocation_id !== member.colocation_id) {
		throw new Error("Événement introuvable");
	}

	const isCreator = event.created_by === member.id;
	const isAdmin = member.role === "admin";

	if (!isCreator && !isAdmin) {
		throw new Error("Vous n'avez pas la permission de supprimer cet événement");
	}

	const admin = createAdminClient();
	const { error } = await admin
		.from("events")
		.update({ status: "cancelled" })
		.eq("id", eventId);

	if (error) throw new Error("Impossible de supprimer l'événement");

	// Notification push : événement annulé
	try {
		const { data: subs } = await admin
			.from("push_subscriptions")
			.select("endpoint, p256dh, auth, member_id")
			.in(
				"member_id",
				await admin
					.from("members")
					.select("id")
					.eq("colocation_id", member.colocation_id)
					.neq("id", member.id)
					.then((r) => (r.data || []).map((m) => m.id)),
			);

		if (subs && subs.length > 0) {
			const result = await sendPushToMany(
				subs.map((s) => ({
					endpoint: s.endpoint,
					p256dh: s.p256dh,
					auth: s.auth,
				})),
				{
					title: "Événement annulé",
					body: `Un événement a été annulé`,
					url: "/calendar",
					tag: "event_cancelled",
				},
			);
			if (result.expiredEndpoints.length > 0) {
				await admin
					.from("push_subscriptions")
					.delete()
					.in("endpoint", result.expiredEndpoints);
			}
		}
	} catch (e) {
		console.error("Erreur envoi notification annulation:", e);
	}

	revalidatePath("/calendar");
}

/**
 * Met à jour un événement existant (admin ou créateur).
 */
export async function updateEvent(
	eventId: string,
	data: {
		title: string;
		description: string | null;
		start_at: string;
		end_at: string;
		guest_count: number;
		noise_level: string;
		space_ids: string[];
	},
) {
	const supabase = await createServerClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Non authentifié");

	const { data: member } = await supabase
		.from("members")
		.select("id, role, colocation_id")
		.eq("user_id", user.id)
		.single();

	if (!member) throw new Error("Membre introuvable");

	const { data: event } = await supabase
		.from("events")
		.select("id, created_by, colocation_id, title")
		.eq("id", eventId)
		.single();

	if (!event || event.colocation_id !== member.colocation_id) {
		throw new Error("Événement introuvable");
	}

	const isCreator = event.created_by === member.id;
	const isAdmin = member.role === "admin";

	if (!isCreator && !isAdmin) {
		throw new Error("Vous n'avez pas la permission de modifier cet événement");
	}

	const admin = createAdminClient();

	// Met à jour l'événement
	const { error } = await admin
		.from("events")
		.update({
			title: data.title,
			description: data.description,
			start_at: data.start_at,
			end_at: data.end_at,
			guest_count: data.guest_count,
			noise_level: data.noise_level,
		})
		.eq("id", eventId);

	if (error) throw new Error("Impossible de modifier l'événement");

	// Met à jour les espaces : supprime les anciens, insère les nouveaux
	await admin.from("event_spaces").delete().eq("event_id", eventId);

	if (data.space_ids.length > 0) {
		await admin.from("event_spaces").insert(
			data.space_ids.map((spaceId) => ({
				event_id: eventId,
				space_id: spaceId,
			})),
		);
	}

	// Notification push : événement modifié
	try {
		const { data: subs } = await admin
			.from("push_subscriptions")
			.select("endpoint, p256dh, auth, member_id")
			.in(
				"member_id",
				await admin
					.from("members")
					.select("id")
					.eq("colocation_id", member.colocation_id)
					.neq("id", member.id)
					.then((r) => (r.data || []).map((m) => m.id)),
			);

		if (subs && subs.length > 0) {
			const result = await sendPushToMany(
				subs.map((s) => ({
					endpoint: s.endpoint,
					p256dh: s.p256dh,
					auth: s.auth,
				})),
				{
					title: `Événement modifié : ${data.title}`,
					body: `${data.title} a été mis à jour`,
					url: `/events/${eventId}`,
					tag: "event_modified",
				},
			);
			if (result.expiredEndpoints.length > 0) {
				await admin
					.from("push_subscriptions")
					.delete()
					.in("endpoint", result.expiredEndpoints);
			}
		}
	} catch (e) {
		console.error("Erreur envoi notification modification:", e);
	}

	revalidatePath(`/events/${eventId}`);
	revalidatePath("/calendar");
}
