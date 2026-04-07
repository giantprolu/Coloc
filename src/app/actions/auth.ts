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
 * Inscription pompier : crée le user via admin (auto-confirmé),
 * puis génère un magic link et envoie un email custom via Resend.
 * L'utilisateur clique → connecté automatiquement → redirigé vers /pompier.
 */
export async function signUpPompier(
	email: string,
	password: string,
	origin: string,
): Promise<{ error?: string; redirect?: string }> {
	try {
		const admin = createAdminClient();

		// 1. Créer l'utilisateur (auto-confirmé)
		const { data: newUser, error: createError } =
			await admin.auth.admin.createUser({
				email,
				password,
				email_confirm: true,
			});

		if (createError) {
			if (
				createError.message?.includes("already been registered") ||
				createError.message?.includes("already exists")
			) {
				return {
					error:
						"Un compte existe déjà avec cet email. Connecte-toi plutôt !",
					redirect: "/login?next=/pompier",
				};
			}
			return { error: "Erreur lors de l'inscription." };
		}

		if (!newUser?.user) {
			return { error: "Erreur lors de la création du compte." };
		}

		// 2. Générer un magic link pour connexion en un clic
		// redirect_to SANS query params pour passer la validation Supabase Redirect URLs
		const { data: linkData, error: linkError } =
			await admin.auth.admin.generateLink({
				type: "magiclink",
				email,
				options: {
					redirectTo: `${origin}/auth/callback`,
				},
			});

		if (linkError || !linkData?.properties?.action_link) {
			// Fallback : envoyer vers la page de login
			const { error: emailError } = await resend.emails.send({
				from: "App Pompier <noreply@app.trouve-tout-conseil.fr>",
				to: email,
				subject: "🚒 Bienvenue - Qui ken le plus ?",
				html: buildPompierEmail(`${origin}/login`),
			});
			if (emailError) console.error("Resend error:", emailError);
			return {};
		}

		// Forcer le redirect_to dans le magic link
		const linkUrl = new URL(linkData.properties.action_link);
		linkUrl.searchParams.set(
			"redirect_to",
			`${origin}/auth/callback`,
		);
		const magicUrl = linkUrl.toString();

		// 3. Envoyer l'email via Resend
		const { error: emailError } = await resend.emails.send({
			from: "App Pompier <noreply@app.trouve-tout-conseil.fr>",
			to: email,
			subject: "🚒 Bienvenue - Qui ken le plus ?",
			html: buildPompierEmail(magicUrl),
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
