import { createClient as createServerClient } from "@supabase/supabase-js";
import { sendPushToMany } from "@/lib/push";
import { NextResponse } from "next/server";

// Utilise le service role pour accéder aux abonnements push
function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const {
      colocationId,
      type,
      eventId,
      title,
      body,
      excludeMemberId,
    } = await request.json();

    if (!colocationId || !title || !body) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
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

    const url = eventId ? `/events/${eventId}` : "/dashboard";

    const result = await sendPushToMany(
      subscriptions.map((s) => ({
        endpoint: s.endpoint,
        p256dh: s.p256dh,
        auth: s.auth,
      })),
      { title, body, url, tag: type }
    );

    // Nettoie les abonnements expirés
    if (result.expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", result.expiredEndpoints);
    }

    return NextResponse.json({ ok: true, sent: result.success, failed: result.failed });
  } catch (err) {
    console.error("Erreur envoi push :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
