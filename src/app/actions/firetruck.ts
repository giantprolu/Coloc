"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { NOTIF_FIRETRUCK } from "@/lib/notification-strings";
import { sendPushToMany } from "@/lib/push";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { FiretruckFeedItem, FiretruckLocationType } from "@/types";

function createAdminClient() {
	return createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!,
	);
}

/** Identifie l'utilisateur courant : soit membre coloc, soit pompier externe. */
async function getAuthenticatedUser() {
	const supabase = await createServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Non authentifié");

	// Essayer membre coloc d'abord
	const { data: member } = await supabase
		.from("members")
		.select("id, colocation_id, display_name")
		.eq("user_id", user.id)
		.single();

	if (member) {
		return { type: "member" as const, ...member };
	}

	// Sinon pompier
	const { data: pompier } = await supabase
		.from("pompier_users")
		.select("id, colocation_id, display_name")
		.eq("user_id", user.id)
		.single();

	if (pompier) {
		return { type: "pompier" as const, ...pompier };
	}

	throw new Error("Utilisateur introuvable");
}

/**
 * Enregistre un clic camion de pompier avec notation et envoie la notification.
 * pompierUserId est fourni quand l'appel vient de l'app pompier.
 */
export async function recordFiretruckClick(
	colocationId: string,
	rating: number,
	pompierUserId?: string,
	locationType?: FiretruckLocationType | null,
	description?: string | null,
) {
	if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
		throw new Error("La note doit être entre 1 et 5");
	}

	const currentUser = await getAuthenticatedUser();

	if (currentUser.colocation_id !== colocationId) {
		throw new Error("Colocation introuvable");
	}

	const admin = createAdminClient();

	// Vérifier la permission pour les membres coloc
	if (currentUser.type === "member") {
		const { data: permission } = await admin
			.from("emergency_button_permissions")
			.select("id")
			.eq("colocation_id", colocationId)
			.eq("member_id", currentUser.id)
			.single();

		if (!permission) {
			throw new Error("Vous n'avez pas la permission d'utiliser ce bouton");
		}
	}

	const extraFields = {
		...(locationType ? { location_type: locationType } : {}),
		...(description?.trim() ? { description: description.trim() } : {}),
	};

	// Insérer le clic avec le bon type d'utilisateur
	if (currentUser.type === "pompier") {
		await admin.from("firetruck_clicks").insert({
			colocation_id: colocationId,
			pompier_user_id: pompierUserId || currentUser.id,
			rating,
			...extraFields,
		});
	} else {
		await admin.from("firetruck_clicks").insert({
			colocation_id: colocationId,
			member_id: currentUser.id,
			rating,
			...extraFields,
		});
	}

	// Envoyer les notifications push
	// 1. Membres coloc avec permission
	const { data: permittedMembers } = await admin
		.from("emergency_button_permissions")
		.select("member_id")
		.eq("colocation_id", colocationId);

	const memberIds = (permittedMembers || []).map(
		(p) => p.member_id as string,
	);

	// 2. Pompier users de la coloc
	const { data: pompierUsers } = await admin
		.from("pompier_users")
		.select("id")
		.eq("colocation_id", colocationId);

	const pompierIds = (pompierUsers || []).map((p) => p.id as string);

	// Récupérer les push subscriptions (member_id OU pompier_user_id)
	const allSubs: { endpoint: string; p256dh: string; auth: string }[] = [];

	if (memberIds.length > 0) {
		const { data: memberSubs } = await admin
			.from("push_subscriptions")
			.select("endpoint, p256dh, auth")
			.in("member_id", memberIds);
		if (memberSubs) allSubs.push(...memberSubs);
	}

	if (pompierIds.length > 0) {
		const { data: pompierSubs } = await admin
			.from("push_subscriptions")
			.select("endpoint, p256dh, auth")
			.in("pompier_user_id", pompierIds);
		if (pompierSubs) allSubs.push(...pompierSubs);
	}

	if (allSubs.length === 0) return { success: true };

	const senderName = currentUser.display_name || "Quelqu'un";

	const result = await sendPushToMany(
		allSubs.map((s) => ({
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

	revalidatePath("/pompier");
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
	participantId: string;
	participantName: string;
	clickCount: number;
	avgRating: number;
	color: string;
}

export interface YearlyStatEntry {
	month: number;
	members: {
		participantId: string;
		participantName: string;
		clickCount: number;
		color: string;
	}[];
}

/** Construit un index nom/couleur pour tous les participants (members + pompiers). */
async function getParticipantIndex(
	admin: ReturnType<typeof createAdminClient>,
	colocationId: string,
) {
	const [{ data: members }, { data: pompiers }] = await Promise.all([
		admin
			.from("members")
			.select("id, display_name")
			.eq("colocation_id", colocationId)
			.order("created_at"),
		admin
			.from("pompier_users")
			.select("id, display_name")
			.eq("colocation_id", colocationId)
			.order("created_at"),
	]);

	const nameMap = new Map<string, string>();
	const colorMap = new Map<string, string>();
	let idx = 0;

	for (const m of members || []) {
		nameMap.set(`m:${m.id}`, m.display_name);
		colorMap.set(`m:${m.id}`, MEMBER_COLORS[idx % MEMBER_COLORS.length]);
		idx++;
	}
	for (const p of pompiers || []) {
		nameMap.set(`p:${p.id}`, p.display_name);
		colorMap.set(`p:${p.id}`, MEMBER_COLORS[idx % MEMBER_COLORS.length]);
		idx++;
	}

	return { nameMap, colorMap };
}

function participantKey(click: {
	member_id: string | null;
	pompier_user_id: string | null;
}): string {
	return click.member_id ? `m:${click.member_id}` : `p:${click.pompier_user_id}`;
}

/**
 * Statistiques mensuelles pour le camembert.
 */
export async function getFiretruckMonthlyStats(
	colocationId: string,
): Promise<MonthlyStatEntry[]> {
	const currentUser = await getAuthenticatedUser();
	if (currentUser.colocation_id !== colocationId) {
		throw new Error("Colocation introuvable");
	}

	const admin = createAdminClient();
	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

	const { data: clicks } = await admin
		.from("firetruck_clicks")
		.select("member_id, pompier_user_id, rating")
		.eq("colocation_id", colocationId)
		.gte("clicked_at", monthStart.toISOString())
		.lt("clicked_at", monthEnd.toISOString());

	if (!clicks || clicks.length === 0) return [];

	const { nameMap, colorMap } = await getParticipantIndex(admin, colocationId);

	// Agréger par participant
	const byParticipant = new Map<
		string,
		{ count: number; totalRating: number }
	>();
	for (const click of clicks) {
		const key = participantKey(click);
		const existing = byParticipant.get(key) || { count: 0, totalRating: 0 };
		existing.count++;
		existing.totalRating += click.rating;
		byParticipant.set(key, existing);
	}

	return [...byParticipant.entries()]
		.map(([key, stats]) => ({
			participantId: key,
			participantName: nameMap.get(key) || "Inconnu",
			clickCount: stats.count,
			avgRating: Math.round((stats.totalRating / stats.count) * 10) / 10,
			color: colorMap.get(key) || MEMBER_COLORS[0],
		}))
		.sort((a, b) => b.clickCount - a.clickCount);
}

/**
 * Statistiques annuelles pour l'histogramme en bâtons.
 */
export async function getFiretruckYearlyStats(
	colocationId: string,
): Promise<YearlyStatEntry[]> {
	const currentUser = await getAuthenticatedUser();
	if (currentUser.colocation_id !== colocationId) {
		throw new Error("Colocation introuvable");
	}

	const admin = createAdminClient();
	const now = new Date();
	const yearStart = new Date(now.getFullYear(), 0, 1);
	const yearEnd = new Date(now.getFullYear() + 1, 0, 1);

	const { data: clicks } = await admin
		.from("firetruck_clicks")
		.select("member_id, pompier_user_id, clicked_at")
		.eq("colocation_id", colocationId)
		.gte("clicked_at", yearStart.toISOString())
		.lt("clicked_at", yearEnd.toISOString());

	if (!clicks || clicks.length === 0) return [];

	const { nameMap, colorMap } = await getParticipantIndex(admin, colocationId);

	// Agréger par mois et participant
	const byMonthParticipant = new Map<string, number>();
	const participantIds = new Set<string>();

	for (const click of clicks) {
		const month = new Date(click.clicked_at).getMonth() + 1;
		const key = participantKey(click);
		const mapKey = `${month}-${key}`;
		byMonthParticipant.set(mapKey, (byMonthParticipant.get(mapKey) || 0) + 1);
		participantIds.add(key);
	}

	const result: YearlyStatEntry[] = [];
	for (let month = 1; month <= 12; month++) {
		const monthMembers: YearlyStatEntry["members"] = [];
		for (const pid of participantIds) {
			const count = byMonthParticipant.get(`${month}-${pid}`) || 0;
			if (count > 0) {
				monthMembers.push({
					participantId: pid,
					participantName: nameMap.get(pid) || "Inconnu",
					clickCount: count,
					color: colorMap.get(pid) || MEMBER_COLORS[0],
				});
			}
		}
		result.push({ month, members: monthMembers });
	}

	return result;
}

// ─── Feed avec réactions ────────────────────────────────────────────────────

/**
 * Récupère les derniers clics firetruck avec leurs réactions (feed style chat).
 */
export async function getFiretruckFeed(
	colocationId: string,
): Promise<FiretruckFeedItem[]> {
	const currentUser = await getAuthenticatedUser();
	if (currentUser.colocation_id !== colocationId) {
		throw new Error("Colocation introuvable");
	}

	const admin = createAdminClient();

	const { data: clicks } = await admin
		.from("firetruck_clicks")
		.select("id, member_id, pompier_user_id, rating, location_type, description, clicked_at")
		.eq("colocation_id", colocationId)
		.order("clicked_at", { ascending: true })
		.limit(50);

	if (!clicks || clicks.length === 0) return [];

	const { nameMap } = await getParticipantIndex(admin, colocationId);

	// Récupérer les réactions pour tous ces clics
	const clickIds = clicks.map((c) => c.id);
	const { data: reactions } = await admin
		.from("firetruck_click_reactions")
		.select("id, click_id, member_id, pompier_user_id, emoji")
		.in("click_id", clickIds);

	// Déterminer l'identifiant courant
	const currentKey =
		currentUser.type === "member"
			? `m:${currentUser.id}`
			: `p:${currentUser.id}`;

	// Construire le feed
	return clicks.map((click) => {
		const key = participantKey(click);
		const clickReactions = (reactions || []).filter(
			(r) => r.click_id === click.id,
		);

		// Agréger les réactions par emoji
		const emojiMap = new Map<
			string,
			{ count: number; hasOwn: boolean; names: string[] }
		>();
		for (const r of clickReactions) {
			const rKey = r.member_id ? `m:${r.member_id}` : `p:${r.pompier_user_id}`;
			const entry = emojiMap.get(r.emoji) || {
				count: 0,
				hasOwn: false,
				names: [],
			};
			entry.count++;
			if (rKey === currentKey) entry.hasOwn = true;
			const name = nameMap.get(rKey);
			if (name) entry.names.push(name);
			emojiMap.set(r.emoji, entry);
		}

		return {
			id: click.id,
			displayName: nameMap.get(key) || "Inconnu",
			rating: click.rating,
			locationType: click.location_type ?? null,
			description: click.description ?? null,
			clickedAt: click.clicked_at,
			isOwn: key === currentKey,
			reactions: Array.from(emojiMap.entries()).map(([emoji, info]) => ({
				emoji,
				count: info.count,
				hasOwn: info.hasOwn,
				names: info.names,
			})),
		};
	});
}

/**
 * Ajoute ou retire une réaction emoji sur un clic firetruck.
 */
export async function toggleFiretruckClickReaction(
	clickId: string,
	emoji: string,
) {
	const currentUser = await getAuthenticatedUser();
	const admin = createAdminClient();

	// Vérifier que le clic existe et est dans la même coloc
	const { data: click } = await admin
		.from("firetruck_clicks")
		.select("id, colocation_id")
		.eq("id", clickId)
		.single();

	if (!click || click.colocation_id !== currentUser.colocation_id) {
		throw new Error("Clic introuvable");
	}

	const userFilter =
		currentUser.type === "member"
			? { member_id: currentUser.id }
			: { pompier_user_id: currentUser.id };

	// Vérifier si la réaction existe déjà
	const { data: existing } = await admin
		.from("firetruck_click_reactions")
		.select("id")
		.eq("click_id", clickId)
		.eq("emoji", emoji)
		.match(userFilter)
		.single();

	if (existing) {
		await admin
			.from("firetruck_click_reactions")
			.delete()
			.eq("id", existing.id);
	} else {
		await admin.from("firetruck_click_reactions").insert({
			click_id: clickId,
			emoji,
			...userFilter,
		});
	}

	revalidatePath("/pompier");
}

// ─── Stats de localisation ──────────────────────────────────────────────────

export interface LocationStats {
	domicile: number;
	exterieur: number;
	unknown: number;
}

/**
 * Compte la répartition domicile / extérieur pour le mois en cours.
 */
export async function getFiretruckLocationStats(
	colocationId: string,
): Promise<LocationStats> {
	const currentUser = await getAuthenticatedUser();
	if (currentUser.colocation_id !== colocationId) {
		throw new Error("Colocation introuvable");
	}

	const admin = createAdminClient();
	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

	const { data: clicks } = await admin
		.from("firetruck_clicks")
		.select("location_type")
		.eq("colocation_id", colocationId)
		.gte("clicked_at", monthStart.toISOString())
		.lt("clicked_at", monthEnd.toISOString());

	const stats: LocationStats = { domicile: 0, exterieur: 0, unknown: 0 };
	for (const c of clicks || []) {
		if (c.location_type === "domicile") stats.domicile++;
		else if (c.location_type === "exterieur") stats.exterieur++;
		else stats.unknown++;
	}
	return stats;
}
