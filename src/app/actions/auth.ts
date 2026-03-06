"use server";

import { createClient } from "@/lib/supabase/server";

export async function resetPasswordForEmail(email: string) {
	const supabase = await createClient();
	const origin =
		process.env.NEXT_PUBLIC_SITE_URL || "https://app.trouve-tout-conseil.fr";

	console.log("[forgot-password] Sending reset email to:", email);
	console.log(
		"[forgot-password] Redirect URL:",
		`${origin}/auth/callback?next=/reset-password`,
	);

	const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
		redirectTo: `${origin}/auth/callback?next=/reset-password`,
	});

	if (error) {
		console.error("[forgot-password] Error:", error.message, error);
		return { error: error.message };
	}

	console.log("[forgot-password] Success, response:", JSON.stringify(data));
	return { error: null };
}
