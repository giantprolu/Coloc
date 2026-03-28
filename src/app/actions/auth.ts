"use server";

import { createClient as createAdminSupabase } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

function createAdminClient() {
	return createAdminSupabase(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!,
	);
}

/**
 * Inscription pompier : crée le user via admin (sans email Supabase)
 * puis envoie un email custom via Resend avec le branding 🚒.
 */
export async function signUpPompier(
	email: string,
	password: string,
	origin: string,
): Promise<{ error?: string }> {
	try {
		const admin = createAdminClient();

		const { data, error } = await admin.auth.admin.generateLink({
			type: "signup",
			email,
			password,
			options: {
				redirectTo: `${origin}/auth/callback?next=%2Fpompier`,
			},
		});

		if (error) {
			if (error.message?.includes("already been registered")) {
				return { error: "Un compte existe déjà avec cet email." };
			}
			return { error: "Erreur lors de l'inscription." };
		}

		const confirmUrl = data.properties?.action_link;
		if (!confirmUrl) {
			return { error: "Erreur lors de la génération du lien." };
		}

		const { error: emailError } = await resend.emails.send({
			from: "App Pompier <noreply@app.trouve-tout-conseil.fr>",
			to: email,
			subject: "🚒 Confirme ton inscription - Qui ken le plus ?",
			html: buildPompierEmail(confirmUrl),
		});

		if (emailError) {
			console.error("Resend error:", emailError);
			return { error: "Erreur lors de l'envoi de l'email." };
		}

		return {};
	} catch (err) {
		console.error("Signup pompier error:", err);
		return {
			error:
				err instanceof Error ? err.message : "Erreur lors de l'inscription.",
		};
	}
}

function buildPompierEmail(confirmUrl: string): string {
	return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#fff7ed;">
  <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#dc2626;padding:32px;text-align:center;">
      <div style="font-size:48px;margin-bottom:8px;">🚒</div>
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Qui ken le plus ?</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 16px;color:#1f2937;font-size:20px;">Bienvenue !</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Clique sur le bouton ci-dessous pour confirmer ton inscription et accéder au bouton pompier.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${confirmUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:16px;">
          Confirmer mon compte 🚒
        </a>
      </div>
      <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:24px 0 0;">
        Si tu n'as pas demandé cette inscription, ignore simplement cet email.
      </p>
    </div>
  </div>
</body>
</html>`;
}

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
