"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";

function createAdminClient() {
	return createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!,
	);
}

export async function toggleWeekendPresence(
	weekendDate: string,
	isPresent: boolean,
) {
	const supabase = await createServerClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Non authentifié");

	const { data: member } = await supabase
		.from("members")
		.select("id")
		.eq("user_id", user.id)
		.single();

	if (!member) throw new Error("Membre introuvable");

	const admin = createAdminClient();

	const { error } = await admin.from("weekend_presence").upsert(
		{
			member_id: member.id,
			weekend_date: weekendDate,
			is_present: isPresent,
		},
		{ onConflict: "member_id,weekend_date" },
	);

	if (error) throw new Error("Impossible de mettre à jour la présence");

	revalidatePath("/dashboard");
}

/**
 * Récupère les présences weekend pour un ensemble de dates.
 */
export async function fetchWeekendPresences(weekendDates: string[]) {
	if (weekendDates.length === 0) return [];

	const supabase = await createServerClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Non authentifié");

	const { data: member } = await supabase
		.from("members")
		.select("id, colocation_id")
		.eq("user_id", user.id)
		.single();

	if (!member) throw new Error("Membre introuvable");

	const admin = createAdminClient();

	const { data: members } = await admin
		.from("members")
		.select("id")
		.eq("colocation_id", member.colocation_id);

	const { data } = await admin
		.from("weekend_presence")
		.select("member_id, weekend_date, is_present")
		.in("weekend_date", weekendDates)
		.in(
			"member_id",
			(members || []).map((m) => m.id),
		);

	return data || [];
}
