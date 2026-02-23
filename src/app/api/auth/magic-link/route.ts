import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY!);

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Génère le magic link sans envoyer d'email
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (error) {
      console.error("Erreur generateLink:", error);
      return NextResponse.json({ error: "Erreur génération du lien" }, { status: 500 });
    }

    // Construire notre propre lien qui pointe vers NOTRE callback
    // avec le token_hash (pas le lien Supabase qui utilise les hash fragments)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const tokenHash = data.properties.hashed_token;
    const magicLink = `${siteUrl}/auth/callback?token_hash=${tokenHash}&type=magiclink`;

    // Envoie l'email via Resend
    const { error: emailError } = await resend.emails.send({
      from: "ColocEvents <onboarding@resend.dev>",
      to: [email],
      subject: "Votre lien de connexion ColocEvents",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #4f46e5; border-radius: 50%; width: 48px; height: 48px; line-height: 48px; color: white; font-size: 24px;">🏠</div>
          </div>
          <h2 style="color: #1f2937; text-align: center; margin-bottom: 8px;">Connexion à ColocEvents</h2>
          <p style="color: #6b7280; text-align: center; margin-bottom: 24px;">
            Cliquez sur le bouton ci-dessous pour vous connecter :
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${magicLink}"
               style="display: inline-block; background: #4f46e5; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Se connecter
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 32px;">
            Ce lien expire dans 24h. Si vous n'avez pas demandé ce lien, ignorez cet email.
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Erreur Resend:", emailError);
      return NextResponse.json({ error: "Erreur envoi email" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur magic-link:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
