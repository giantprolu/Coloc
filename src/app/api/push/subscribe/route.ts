import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
	try {
		const supabase = await createClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
		}

		const { subscription } = await request.json();

		if (
			!subscription?.endpoint ||
			!subscription?.keys?.p256dh ||
			!subscription?.keys?.auth
		) {
			return NextResponse.json(
				{ error: "Abonnement invalide" },
				{ status: 400 },
			);
		}

		// Chercher membre coloc d'abord
		const { data: member } = await supabase
			.from("members")
			.select("id")
			.eq("user_id", user.id)
			.single();

		// Sinon chercher pompier
		const { data: pompier } = !member
			? await supabase
					.from("pompier_users")
					.select("id")
					.eq("user_id", user.id)
					.single()
			: { data: null };

		if (!member && !pompier) {
			return NextResponse.json(
				{ error: "Utilisateur introuvable" },
				{ status: 404 },
			);
		}

		// Upsert via admin client pour contourner les RLS (authentification déjà vérifiée)
		const admin = createAdminClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!,
		);
		const { error } = await admin.from("push_subscriptions").upsert(
			{
				...(member
					? { member_id: member.id }
					: { pompier_user_id: pompier!.id }),
				endpoint: subscription.endpoint,
				p256dh: subscription.keys.p256dh,
				auth: subscription.keys.auth,
			},
			{ onConflict: "endpoint" },
		);

		if (error) throw error;

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error("Erreur abonnement push :", err);
		return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
	}
}
