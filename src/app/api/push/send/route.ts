import { createClient as createServerClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendPushToMany } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

// Utilise le service role pour accéder aux abonnements push
function createAdminClient() {
	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!,
	);
}

export async function POST(request: Request) {
	try {
		// Auth check
		const supabaseAuth = await createClient();
		const {
			data: { user },
		} = await supabaseAuth.auth.getUser();
		if (!user) {
			return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
		}

		const { colocationId, type, eventId, title, body, excludeMemberId } =
			await request.json();

		if (
			typeof colocationId !== "string" ||
			typeof title !== "string" ||
			typeof body !== "string" ||
			!colocationId ||
			!title ||
			!body
		) {
			return NextResponse.json(
				{ error: "Paramètres manquants ou invalides" },
				{ status: 400 },
			);
		}

		if (title.length > 256 || body.length > 1024) {
			return NextResponse.json(
				{ error: "Titre ou contenu trop long" },
				{ status: 400 },
			);
		}

		// Vérifier que l'utilisateur appartient à la colocation
		const { data: callerMember } = await supabaseAuth
			.from("members")
			.select("id, colocation_id")
			.eq("user_id", user.id)
			.eq("colocation_id", colocationId)
			.single();

		if (!callerMember) {
			return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
		}

		const supabase = createAdminClient();

		// Récupère tous les membres de la coloc avec leurs abonnements push
		const { data: members } = await supabase
			.from("members")
			.select("id")
			.eq("colocation_id", colocationId)
			.neq("id", excludeMemberId || "00000000-0000-0000-0000-000000000000");

		if (!members || members.length === 0) {
			return NextResponse.json({ success: true, sent: 0 });
		}

		const memberIds = members.map((m) => m.id);

		// Récupère les abonnements push actifs
		const { data: subscriptions } = await supabase
			.from("push_subscriptions")
			.select("*")
			.in("member_id", memberIds);

		if (!subscriptions || subscriptions.length === 0) {
			return NextResponse.json({ success: true, sent: 0 });
		}

		const sanitizedEventId =
			typeof eventId === "string" ? eventId.replace(/[^a-zA-Z0-9-]/g, "") : "";
		const url = sanitizedEventId ? `/events/${sanitizedEventId}` : "/dashboard";

		const result = await sendPushToMany(
			subscriptions.map((s) => ({
				endpoint: s.endpoint,
				p256dh: s.p256dh,
				auth: s.auth,
			})),
			{ title, body, url, tag: type },
		);

		// Nettoie les abonnements expirés
		if (result.expiredEndpoints.length > 0) {
			await supabase
				.from("push_subscriptions")
				.delete()
				.in("endpoint", result.expiredEndpoints);
		}

		return NextResponse.json({
			ok: true,
			sent: result.success,
			failed: result.failed,
		});
	} catch (err) {
		console.error("Erreur envoi push :", err);
		return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
	}
}
