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
		.select("id, colocation_id, role, display_name")
		.eq("user_id", user.id)
		.single();

	if (!member) throw new Error("Membre introuvable");
	return member;
}

/**
 * Enregistre un clic camion de pompier avec notation et envoie la notification.
 */
export async function recordFiretruckClick(
	colocationId: string,
	rating: number,
) {
	if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
		throw new Error("La note doit être entre 1 et 5");
	}

	const member = await getAuthenticatedMember();

	if (member.colocation_id !== colocationId) {
		throw new Error("Colocation introuvable");
	}

	const admin = createAdminClient();

	// Vérifier la permission (ou rôle pompier)
	if (member.role !== "pompier") {
		const { data: permission } = await admin
			.from("emergency_button_permissions")
			.select("id")
			.eq("colocation_id", colocationId)
			.eq("member_id", member.id)
			.single();

		if (!permission) {
			throw new Error("Vous n'avez pas la permission d'utiliser ce bouton");
		}
	}

	// Insérer le clic
	await admin.from("firetruck_clicks").insert({
		colocation_id: colocationId,
		member_id: member.id,
		rating,
	});

	// Envoyer la notification push aux membres autorisés
	const { data: permittedMembers } = await admin
		.from("emergency_button_permissions")
		.select("member_id")
		.eq("colocation_id", colocationId);

	// Ajouter les membres pompier de la coloc
	const { data: pompierMembers } = await admin
		.from("members")
		.select("id")
		.eq("colocation_id", colocationId)
		.eq("role", "pompier");

	const allPermittedIds = new Set([
		...(permittedMembers || []).map((p) => p.member_id as string),
		...(pompierMembers || []).map((p) => p.id as string),
	]);

	if (allPermittedIds.size === 0) return { success: true };

	const { data: subs } = await admin
		.from("push_subscriptions")
		.select("endpoint, p256dh, auth")
		.in("member_id", [...allPermittedIds]);

	if (!subs || subs.length === 0) return { success: true };

	const senderName = member.display_name || "Quelqu'un";

	const result = await sendPushToMany(
		subs.map((s) => ({
			endpoint: s.endpoint,
			p256dh: s.p256dh,
			auth: s.auth,
		})),
		{
			title: NOTIF_FIRETRUCK.title,
			body: NOTIF_FIRETRUCK.body(senderName, rating),
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

// ─── Statistiques ───────────────────────────────────────────────────────────

const MEMBER_COLORS = [
	"#6366f1", // indigo
	"#f43f5e", // rose
	"#10b981", // emerald
	"#f59e0b", // amber
	"#3b82f6", // blue
	"#8b5cf6", // violet
	"#ec4899", // pink
	"#14b8a6", // teal
];

export interface MonthlyStatEntry {
	memberId: string;
	memberName: string;
	clickCount: number;
	avgRating: number;
	color: string;
}

export interface YearlyStatEntry {
	month: number; // 1-12
	members: {
		memberId: string;
		memberName: string;
		clickCount: number;
		color: string;
	}[];
}

/**
 * Statistiques mensuelles pour le camembert.
 */
export async function getFiretruckMonthlyStats(
	colocationId: string,
): Promise<MonthlyStatEntry[]> {
	const member = await getAuthenticatedMember();
	if (member.colocation_id !== colocationId) {
		throw new Error("Colocation introuvable");
	}

	const admin = createAdminClient();
	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

	const { data: clicks } = await admin
		.from("firetruck_clicks")
		.select("member_id, rating")
		.eq("colocation_id", colocationId)
		.gte("clicked_at", monthStart.toISOString())
		.lt("clicked_at", monthEnd.toISOString());

	if (!clicks || clicks.length === 0) return [];

	// Agréger par membre
	const byMember = new Map<
		string,
		{ count: number; totalRating: number }
	>();
	for (const click of clicks) {
		const existing = byMember.get(click.member_id) || {
			count: 0,
			totalRating: 0,
		};
		existing.count++;
		existing.totalRating += click.rating;
		byMember.set(click.member_id, existing);
	}

	// Récupérer les noms des membres
	const memberIds = [...byMember.keys()];
	const { data: members } = await admin
		.from("members")
		.select("id, display_name")
		.in("id", memberIds);

	const memberMap = new Map(
		(members || []).map((m) => [m.id, m.display_name as string]),
	);

	// Construire le résultat avec couleurs assignées par index stable
	const { data: allColMembers } = await admin
		.from("members")
		.select("id")
		.eq("colocation_id", colocationId)
		.order("created_at");

	const colorIndex = new Map(
		(allColMembers || []).map((m, i) => [m.id, i % MEMBER_COLORS.length]),
	);

	return memberIds
		.map((id) => {
			const stats = byMember.get(id)!;
			return {
				memberId: id,
				memberName: memberMap.get(id) || "Inconnu",
				clickCount: stats.count,
				avgRating: Math.round((stats.totalRating / stats.count) * 10) / 10,
				color: MEMBER_COLORS[colorIndex.get(id) ?? 0],
			};
		})
		.sort((a, b) => b.clickCount - a.clickCount);
}

/**
 * Statistiques annuelles pour l'histogramme en bâtons.
 */
export async function getFiretruckYearlyStats(
	colocationId: string,
): Promise<YearlyStatEntry[]> {
	const member = await getAuthenticatedMember();
	if (member.colocation_id !== colocationId) {
		throw new Error("Colocation introuvable");
	}

	const admin = createAdminClient();
	const now = new Date();
	const yearStart = new Date(now.getFullYear(), 0, 1);
	const yearEnd = new Date(now.getFullYear() + 1, 0, 1);

	const { data: clicks } = await admin
		.from("firetruck_clicks")
		.select("member_id, clicked_at")
		.eq("colocation_id", colocationId)
		.gte("clicked_at", yearStart.toISOString())
		.lt("clicked_at", yearEnd.toISOString());

	if (!clicks || clicks.length === 0) return [];

	// Agréger par mois et membre
	const byMonthMember = new Map<string, number>(); // "month-memberId" -> count
	const memberIds = new Set<string>();

	for (const click of clicks) {
		const month = new Date(click.clicked_at).getMonth() + 1;
		const key = `${month}-${click.member_id}`;
		byMonthMember.set(key, (byMonthMember.get(key) || 0) + 1);
		memberIds.add(click.member_id);
	}

	// Récupérer les noms
	const { data: members } = await admin
		.from("members")
		.select("id, display_name")
		.in("id", [...memberIds]);

	const memberMap = new Map(
		(members || []).map((m) => [m.id, m.display_name as string]),
	);

	// Couleurs stables
	const { data: allColMembers } = await admin
		.from("members")
		.select("id")
		.eq("colocation_id", colocationId)
		.order("created_at");

	const colorIndex = new Map(
		(allColMembers || []).map((m, i) => [m.id, i % MEMBER_COLORS.length]),
	);

	// Construire les données pour les 12 mois
	const result: YearlyStatEntry[] = [];
	for (let month = 1; month <= 12; month++) {
		const monthMembers: YearlyStatEntry["members"] = [];
		for (const id of memberIds) {
			const count = byMonthMember.get(`${month}-${id}`) || 0;
			if (count > 0) {
				monthMembers.push({
					memberId: id,
					memberName: memberMap.get(id) || "Inconnu",
					clickCount: count,
					color: MEMBER_COLORS[colorIndex.get(id) ?? 0],
				});
			}
		}
		result.push({ month, members: monthMembers });
	}

	return result;
}
