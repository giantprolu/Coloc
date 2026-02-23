"use server";

import { createClient } from "@supabase/supabase-js";
import { calculateVoteResults } from "@/lib/votes";
import { sendPushToMany } from "@/lib/push";
import { VoteBallot } from "@/types";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type AdminClient = ReturnType<typeof createAdminClient>;

interface ExpiredVote {
  id: string;
  event_id: string;
  ballots: VoteBallot[];
  event?: { colocation_id: string; title: string } | null;
}

async function processExpiredVote(
  supabase: AdminClient,
  vote: ExpiredVote
): Promise<void> {
  const results = calculateVoteResults(vote.ballots);

  let newVoteStatus: "approved" | "rejected" | "expired";
  let newEventStatus: string;

  if (results.result === "approved") {
    newVoteStatus = "approved";
    newEventStatus = "vote_approved";
  } else if (results.result === "rejected") {
    newVoteStatus = "rejected";
    newEventStatus = "contested";
  } else {
    newVoteStatus = "expired";
    newEventStatus = "confirmed";
  }

  await Promise.all([
    supabase.from("votes").update({ status: newVoteStatus }).eq("id", vote.id),
    supabase
      .from("events")
      .update({ status: newEventStatus })
      .eq("id", vote.event_id),
  ]);

  // Notifie les colocataires du résultat
  const colocationId = vote.event?.colocation_id;
  if (!colocationId) return;

  const { data: members } = await supabase
    .from("members")
    .select("id")
    .eq("colocation_id", colocationId);

  if (!members?.length) return;

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("member_id")
    .in(
      "member_id",
      members.map((m) => m.id)
    )
    .eq("votes_result", true);

  if (!prefs?.length) return;

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in(
      "member_id",
      prefs.map((p) => p.member_id)
    );

  if (!subscriptions?.length) return;

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

/**
 * Clôture paresseuse des votes expirés pour un événement donné.
 * Appelée à chaque chargement de la page événement.
 * Remplace le cron "* /15 * * * *" incompatible avec le plan Hobby Vercel.
 */
export async function closeExpiredVotesForEvent(eventId: string): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: expiredVotes } = await supabase
    .from("votes")
    .select("*, ballots:vote_ballots(*), event:events(colocation_id, title)")
    .eq("event_id", eventId)
    .eq("status", "open")
    .lte("closes_at", now);

  if (!expiredVotes?.length) return;

  await Promise.all(
    expiredVotes.map((vote) => processExpiredVote(supabase, vote as ExpiredVote))
  );
}

/**
 * Clôture paresseuse de tous les votes expirés d'une colocation.
 * Appelée à chaque chargement de la page votes.
 */
export async function closeAllExpiredVotesForColocation(
  colocationId: string
): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Récupère les IDs des événements de cette coloc
  const { data: events } = await supabase
    .from("events")
    .select("id")
    .eq("colocation_id", colocationId);

  if (!events?.length) return;

  const eventIds = events.map((e) => e.id);

  const { data: expiredVotes } = await supabase
    .from("votes")
    .select("*, ballots:vote_ballots(*), event:events(colocation_id, title)")
    .in("event_id", eventIds)
    .eq("status", "open")
    .lte("closes_at", now);

  if (!expiredVotes?.length) return;

  await Promise.all(
    expiredVotes.map((vote) => processExpiredVote(supabase, vote as ExpiredVote))
  );
}
