import { timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendPushToMany } from "@/lib/push";
import { formatEventDate } from "@/lib/utils";

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

// Cron : envoie des rappels 24h avant chaque événement
export async function GET(request: Request) {
	// Vérifie le secret cron
	const authHeader = request.headers.get("authorization");
	if (!isValidCronSecret(authHeader)) {
		return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
	}

	const supabase = createAdminClient();

	const now = new Date();
	const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
	const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

	// Événements qui commencent dans 24-25h
	const { data: events } = await supabase
		.from("events")
		.select("*, colocation:colocations(*)")
		.gte("start_at", in24h.toISOString())
		.lte("start_at", in25h.toISOString())
		.neq("status", "cancelled");

	let totalSent = 0;
	const allExpiredEndpoints: string[] = [];

	for (const event of events || []) {
		const { data: members } = await supabase
			.from("members")
			.select("id")
			.eq("colocation_id", event.colocation_id);

		if (!members?.length) continue;

		const memberIds = members.map((m) => m.id);

		// Filtre les membres qui ont activé les rappels
		// Si pas de préférence enregistrée, on considère que c'est activé par défaut
		const { data: disabledPrefs } = await supabase
			.from("notification_preferences")
			.select("member_id")
			.in("member_id", memberIds)
			.eq("events_reminder", false);

		const disabledIds = new Set((disabledPrefs || []).map((p) => p.member_id));
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
				title: `Rappel : ${event.title} demain`,
				body: `${formatEventDate(event.start_at, event.end_at)}`,
				url: `/events/${event.id}`,
				tag: "event_reminder",
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
		processed: events?.length || 0,
		sent: totalSent,
		cleaned: allExpiredEndpoints.length,
	});
}
