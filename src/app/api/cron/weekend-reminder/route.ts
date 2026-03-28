import { timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { NOTIF_WEEKEND_REMINDER } from "@/lib/notification-strings";
import { sendPushToMany } from "@/lib/push";

function createAdminClient() {
	return createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!,
	);
}

function isValidCronSecret(authHeader: string | null): boolean {
	const expected = `Bearer ${process.env.CRON_SECRET}`;
	if (!authHeader || authHeader.length !== expected.length) return false;
	return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
}

// Cron : envoie un rappel chaque vendredi pour remplir les dispos weekend
export async function GET(request: Request) {
	const authHeader = request.headers.get("authorization");
	if (!isValidCronSecret(authHeader)) {
		return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
	}

	const supabase = createAdminClient();

	// Récupérer toutes les colocations
	const { data: colocations } = await supabase
		.from("colocations")
		.select("id");

	let totalSent = 0;
	const allExpiredEndpoints: string[] = [];

	for (const coloc of colocations || []) {
		// Récupérer les membres (exclure les pompiers qui n'ont pas la feature weekend)
		const { data: members } = await supabase
			.from("members")
			.select("id")
			.eq("colocation_id", coloc.id)
			.neq("role", "pompier");

		if (!members?.length) continue;

		const memberIds = members.map((m) => m.id);

		// Filtrer les membres qui ont désactivé les annonces
		const { data: disabledPrefs } = await supabase
			.from("notification_preferences")
			.select("member_id")
			.in("member_id", memberIds)
			.eq("announcements", false);

		const disabledIds = new Set(
			(disabledPrefs || []).map((p) => p.member_id),
		);
		const eligibleIds = memberIds.filter((id) => !disabledIds.has(id));

		if (eligibleIds.length === 0) continue;

		const { data: subscriptions } = await supabase
			.from("push_subscriptions")
			.select("*")
			.in("member_id", eligibleIds);

		if (!subscriptions?.length) continue;

		const result = await sendPushToMany(
			subscriptions.map((s) => ({
				endpoint: s.endpoint,
				p256dh: s.p256dh,
				auth: s.auth,
			})),
			{
				title: NOTIF_WEEKEND_REMINDER.title,
				body: NOTIF_WEEKEND_REMINDER.body,
				url: NOTIF_WEEKEND_REMINDER.url,
				tag: NOTIF_WEEKEND_REMINDER.tag,
			},
		);

		totalSent += result.success;
		allExpiredEndpoints.push(...result.expiredEndpoints);
	}

	// Nettoie les abonnements expirés
	if (allExpiredEndpoints.length > 0) {
		await supabase
			.from("push_subscriptions")
			.delete()
			.in("endpoint", allExpiredEndpoints);
	}

	return NextResponse.json({
		success: true,
		colocations: colocations?.length || 0,
		sent: totalSent,
		cleaned: allExpiredEndpoints.length,
	});
}
