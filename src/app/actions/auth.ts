"use server";

import { createClient } from "@/lib/supabase/server";

export async function resetPasswordForEmail(email: string) {
	const supabase = await createClient();
	const origin =
		process.env.NEXT_PUBLIC_SITE_URL || "https://app.trouve-tout-conseil.fr";

	const { error } = await supabase.auth.resetPasswordForEmail(email, {
		redirectTo: `${origin}/auth/callback?next=/reset-password`,
	});

	if (error) {
		return { error: error.message };
	}

	return { error: null };
}
