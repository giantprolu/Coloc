"use server";

import { createClient } from "@supabase/supabase-js";
import {
	NOTIF_TEST_CHAT,
	NOTIF_TEST_FIRETRUCK,
	NOTIF_TEST_MENTION,
} from "@/lib/notification-strings";
import { sendPushToMany } from "@/lib/push";
import { createClient as createServerClient } from "@/lib/supabase/server";

async function getAuthenticatedPompier() {
	const supabase = await createServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Non authentifié");

	const admin = createAdminClient();
	const { data: pompier } = await admin
		.from("pompier_users")
		.select("id, colocation_id, display_name")
		.eq("user_id", user.id)
		.single();

	if (!pompier) throw new Error("Utilisateur pompier introuvable");
	return pompier;
}

function createAdminClient() {
	return createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!,
	);
}

async function getAuthenticatedMember() {
	const supabase = await createServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Non authentifié");

	const admin = createAdminClient();
	const { data: member } = await admin
		.from("members")
		.select("id, colocation_id, role")
		.eq("user_id", user.id)
		.single();

	if (!member) throw new Error("Membre introuvable");
	return member;
}

/**
 * Récupère les permissions dev pour une colocation.
 */
export async function getDevPermissions(colocationId: string) {
	const admin = createAdminClient();
	const { data } = await admin
		.from("dev_permissions")
		.select("member_id")
		.eq("colocation_id", colocationId);

	return (data || []).map((d) => d.member_id as string);
}

/**
 * Toggle la permission dev pour un membre (admin uniquement).
 */
export async function toggleDevPermission(memberId: string) {
	const member = await getAuthenticatedMember();
	if (member.role !== "admin") {
		throw new Error("Seuls les admins peuvent modifier les permissions dev");
	}

	const admin = createAdminClient();

	const { data: targetMember } = await admin
		.from("members")
		.select("id, colocation_id")
		.eq("id", memberId)
		.single();

	if (!targetMember || targetMember.colocation_id !== member.colocation_id) {
		throw new Error("Membre introuvable");
	}

	const { data: existing } = await admin
		.from("dev_permissions")
		.select("id")
		.eq("colocation_id", member.colocation_id)
		.eq("member_id", memberId)
		.single();

	if (existing) {
		await admin.from("dev_permissions").delete().eq("id", existing.id);
		return { action: "removed" as const };
	} else {
		await admin.from("dev_permissions").insert({
			colocation_id: member.colocation_id,
			member_id: memberId,
			granted_by: member.id,
		});
		return { action: "granted" as const };
	}
}

/**
 * Vérifie si le membre courant a les permissions dev.
 */
export async function checkDevPermission(
	memberId: string,
	colocationId: string,
) {
	const admin = createAdminClient();
	const { data } = await admin
		.from("dev_permissions")
		.select("id")
		.eq("colocation_id", colocationId)
		.eq("member_id", memberId)
		.single();

	return !!data;
}

/**
 * Envoie une notification de test à un seul membre (soi-même).
 */
export async function sendTestPush(
	memberId: string,
	type: "chat" | "mention" | "firetruck" = "chat",
) {
	const member = await getAuthenticatedMember();

	// Vérifie que le membre correspond
	if (member.id !== memberId) throw new Error("Membre introuvable");

	// Vérifie la permission dev
	const admin = createAdminClient();
	const { data: devPerm } = await admin
		.from("dev_permissions")
		.select("id")
		.eq("colocation_id", member.colocation_id)
		.eq("member_id", member.id)
		.single();

	if (!devPerm) throw new Error("Accès réservé aux utilisateurs dev");

	const { data: subs } = await admin
		.from("push_subscriptions")
		.select("endpoint, p256dh, auth")
		.eq("member_id", memberId);

	if (!subs || subs.length === 0) {
		throw new Error(
			"Aucune souscription push trouvée. Activez les notifications d'abord.",
		);
	}

	const payloads = {
		chat: {
			title: NOTIF_TEST_CHAT.title,
			body: NOTIF_TEST_CHAT.body,
			url: NOTIF_TEST_CHAT.url,
			tag: NOTIF_TEST_CHAT.tag,
		},
		mention: {
			title: NOTIF_TEST_MENTION.title,
			body: NOTIF_TEST_MENTION.body,
			url: NOTIF_TEST_MENTION.url,
			tag: NOTIF_TEST_MENTION.tag,
		},
		firetruck: {
			title: NOTIF_TEST_FIRETRUCK.title,
			body: NOTIF_TEST_FIRETRUCK.body,
			url: NOTIF_TEST_FIRETRUCK.url,
			tag: NOTIF_TEST_FIRETRUCK.tag,
		},
	};

	const result = await sendPushToMany(
		subs.map((s) => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })),
		payloads[type],
	);

	if (result.expiredEndpoints.length > 0) {
		await admin
			.from("push_subscriptions")
			.delete()
			.in("endpoint", result.expiredEndpoints);
	}

	return { success: true };
}

// ─── Actions dev Pompier ─────────────────────────────────────────────────────

/**
 * Envoie une notification de test au pompier "test".
 * Réservé à l'utilisateur dont le display_name est "test".
 */
export async function sendTestPushPompier() {
	const pompier = await getAuthenticatedPompier();
	if (pompier.display_name.toLowerCase() !== "test") {
		throw new Error("Réservé à l'utilisateur test");
	}

	const admin = createAdminClient();
	const { data: subs } = await admin
		.from("push_subscriptions")
		.select("endpoint, p256dh, auth")
		.eq("pompier_user_id", pompier.id);

	if (!subs || subs.length === 0) {
		throw new Error("Aucune souscription push. Active les notifications d'abord.");
	}

	const result = await sendPushToMany(
		subs.map((s) => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })),
		{
			title: NOTIF_TEST_FIRETRUCK.title,
			body: NOTIF_TEST_FIRETRUCK.body,
			url: "/pompier",
			tag: "firetruck",
		},
	);

	if (result.expiredEndpoints.length > 0) {
		await admin
			.from("push_subscriptions")
			.delete()
			.in("endpoint", result.expiredEndpoints);
	}

	return { success: true };
}

/**
 * Enregistre un clic test sans envoyer de notifications.
 * Réservé à l'utilisateur dont le display_name est "test".
 */
export async function recordTestFiretruckClick(
	rating: number,
	locationType?: "domicile" | "exterieur" | null,
	description?: string | null,
) {
	const pompier = await getAuthenticatedPompier();
	if (pompier.display_name.toLowerCase() !== "test") {
		throw new Error("Réservé à l'utilisateur test");
	}

	const admin = createAdminClient();
	await admin.from("firetruck_clicks").insert({
		colocation_id: pompier.colocation_id,
		pompier_user_id: pompier.id,
		rating,
		...(locationType ? { location_type: locationType } : {}),
		...(description?.trim() ? { description: description.trim() } : {}),
	});

	return { success: true };
}
