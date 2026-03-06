"use server";

import { createClient } from "@supabase/supabase-js";
import { NOTIF_FIRETRUCK } from "@/lib/notification-strings";
import { sendPushToMany } from "@/lib/push";
import { createClient as createServerClient } from "@/lib/supabase/server";

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

	const { data: member } = await supabase
		.from("members")
		.select("id, colocation_id, role")
		.eq("user_id", user.id)
		.single();

	if (!member) throw new Error("Membre introuvable");
	return member;
}

/**
 * Récupère les permissions de bouton d'urgence pour une colocation.
 */
export async function getEmergencyPermissions(colocationId: string) {
	const admin = createAdminClient();

	const { data } = await admin
		.from("emergency_button_permissions")
		.select("member_id")
		.eq("colocation_id", colocationId);

	return (data || []).map((d) => d.member_id as string);
}

/**
 * Toggle la permission d'urgence pour un membre (admin uniquement).
 */
export async function toggleEmergencyPermission(memberId: string) {
	const member = await getAuthenticatedMember();

	if (member.role !== "admin") {
		throw new Error(
			"Seuls les admins peuvent modifier les permissions d'urgence",
		);
	}

	const admin = createAdminClient();

	// Vérifier que le membre cible est dans la même coloc
	const { data: targetMember } = await admin
		.from("members")
		.select("id, colocation_id")
		.eq("id", memberId)
		.single();

	if (!targetMember || targetMember.colocation_id !== member.colocation_id) {
		throw new Error("Membre introuvable");
	}

	// Check if permission exists
	const { data: existing } = await admin
		.from("emergency_button_permissions")
		.select("id")
		.eq("colocation_id", member.colocation_id)
		.eq("member_id", memberId)
		.single();

	if (existing) {
		await admin
			.from("emergency_button_permissions")
			.delete()
			.eq("id", existing.id);
		return { action: "removed" as const };
	} else {
		await admin.from("emergency_button_permissions").insert({
			colocation_id: member.colocation_id,
			member_id: memberId,
			granted_by: member.id,
		});
		return { action: "granted" as const };
	}
}

/**
 * Envoie une notification 🚒 aux membres qui ont le bouton activé.
 * Bypass les préférences de notification.
 */
export async function sendEmergencyNotification(colocationId: string) {
	const member = await getAuthenticatedMember();

	if (member.colocation_id !== colocationId) {
		throw new Error("Colocation introuvable");
	}

	// Vérifier que le membre a la permission
	const admin = createAdminClient();
	const { data: permission } = await admin
		.from("emergency_button_permissions")
		.select("id")
		.eq("colocation_id", colocationId)
		.eq("member_id", member.id)
		.single();

	if (!permission) {
		throw new Error("Vous n'avez pas la permission d'utiliser ce bouton");
	}

	// Récupérer le nom de l'expéditeur
	const { data: memberInfo } = await admin
		.from("members")
		.select("display_name")
		.eq("id", member.id)
		.single();

	// Récupérer uniquement les membres qui ont le bouton activé
	const { data: permittedMembers } = await admin
		.from("emergency_button_permissions")
		.select("member_id")
		.eq("colocation_id", colocationId);

	if (!permittedMembers || permittedMembers.length === 0)
		return { success: true };

	const permittedIds = permittedMembers.map((p) => p.member_id as string);

	const { data: subs } = await admin
		.from("push_subscriptions")
		.select("endpoint, p256dh, auth")
		.in("member_id", permittedIds);

	if (!subs || subs.length === 0) return { success: true };

	const senderName = memberInfo?.display_name || "Quelqu'un";

	const result = await sendPushToMany(
		subs.map((s) => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })),
		{
			title: NOTIF_FIRETRUCK.title,
			body: NOTIF_FIRETRUCK.body(senderName),
			url: NOTIF_FIRETRUCK.url,
			tag: NOTIF_FIRETRUCK.tag,
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
