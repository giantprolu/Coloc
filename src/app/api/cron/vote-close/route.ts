import { createClient } from "@supabase/supabase-js";
import { sendPushToMany } from "@/lib/push";
import { calculateVoteResults } from "@/lib/votes";
import { VoteBallot } from "@/types";
import { NextResponse } from "next/server";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Cron : clôture les votes expirés et met à jour les événements
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Récupère les votes ouverts dont la date de clôture est passée
  const { data: expiredVotes } = await supabase
    .from("votes")
    .select("*, ballots:vote_ballots(*), event:events(colocation_id, title)")
    .eq("status", "open")
    .lte("closes_at", now);

  let processed = 0;

  for (const vote of expiredVotes || []) {
    const results = calculateVoteResults(vote.ballots as VoteBallot[]);

    let newVoteStatus: "approved" | "rejected" | "expired";
    let newEventStatus: string;

    if (results.result === "approved") {
      newVoteStatus = "approved";
      newEventStatus = "vote_approved";
    } else if (results.result === "rejected") {
      newVoteStatus = "rejected";
      newEventStatus = "contested";
    } else {
      // Égalité → vote expiré, événement reste confirmé
      newVoteStatus = "expired";
      newEventStatus = "confirmed";
    }

    // Met à jour le vote
    await supabase
      .from("votes")
      .update({ status: newVoteStatus })
      .eq("id", vote.id);

    // Met à jour l'événement
    await supabase
      .from("events")
      .update({ status: newEventStatus })
      .eq("id", vote.event_id);

    // Notifie les colocataires
    const colocationId = vote.event?.colocation_id;
    if (colocationId) {
      const { data: members } = await supabase
        .from("members")
        .select("id")
        .eq("colocation_id", colocationId);

      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("member_id")
        .in(
          "member_id",
          (members || []).map((m) => m.id)
        )
        .eq("votes_result", true);

      if (prefs?.length) {
        const { data: subscriptions } = await supabase
          .from("push_subscriptions")
          .select("*")
          .in(
            "member_id",
            prefs.map((p) => p.member_id)
          );

        if (subscriptions?.length) {
          const resultLabel =
            newVoteStatus === "approved"
              ? "approuvé ✅"
              : newVoteStatus === "rejected"
              ? "refusé ❌"
              : "expiré (égalité)";

          await sendPushToMany(
            subscriptions.map((s) => ({
              endpoint: s.endpoint,
              p256dh: s.p256dh,
              auth: s.auth,
            })),
            {
              title: `Vote terminé : ${vote.event?.title}`,
              body: `L'événement a été ${resultLabel}`,
              url: `/events/${vote.event_id}`,
              tag: "vote_result",
            }
          );
        }
      }
    }

    processed++;
  }

  return NextResponse.json({ success: true, processed });
}
