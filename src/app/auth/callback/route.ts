import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
	const { searchParams, origin } = new URL(request.url);
	const code = searchParams.get("code");
	const token_hash = searchParams.get("token_hash");
	const type = searchParams.get("type");
	const next = searchParams.get("next") ?? "/dashboard";

	const supabase = await createClient();
	let authError = null;

	if (code) {
		// PKCE flow (signUp email confirmation)
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		authError = error;
	} else if (token_hash && type) {
		// Token flow (email confirmation)
		const { error } = await supabase.auth.verifyOtp({
			token_hash,
			type: type as "email" | "signup" | "recovery",
		});
		authError = error;
	} else {
		return NextResponse.redirect(`${origin}/login?error=missing_params`);
	}

	if (!authError) {
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (user) {
			const { data: member } = await supabase
				.from("members")
				.select("id, role")
				.eq("user_id", user.id)
				.single();

			if (!member) {
				// Redirige vers l'onboarding pompier si l'utilisateur vient de /pompier
				const redirectTo = next.startsWith("/pompier")
					? "/pompier/onboarding"
					: "/onboarding";
				return NextResponse.redirect(`${origin}${redirectTo}`);
			}

			// Si l'utilisateur est pompier, toujours rediriger vers /pompier
			if (member.role === "pompier") {
				return NextResponse.redirect(`${origin}/pompier`);
			}
		}

		return NextResponse.redirect(`${origin}${next}`);
	}

	console.error("Auth callback error:", authError);
	return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
