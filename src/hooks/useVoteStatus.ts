"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Vote } from "@/types";
import { calculateVoteResults } from "@/lib/votes";

export function useVoteStatus(eventId: string) {
  const [activeVote, setActiveVote] = useState<Vote | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const loadVote = async () => {
      const { data } = await supabase
        .from("votes")
        .select("*, ballots:vote_ballots(*, member:members(*))")
        .eq("event_id", eventId)
        .eq("status", "open")
        .single();

      if (data) setActiveVote(data as Vote);
    };

    loadVote();

    const channel = supabase
      .channel(`vote-status-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
          filter: `event_id=eq.${eventId}`,
        },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            setActiveVote(null);
          } else {
            const { data } = await supabase
              .from("votes")
              .select("*, ballots:vote_ballots(*, member:members(*))")
              .eq("id", (payload.new as Vote).id)
              .single();
            if (data) setActiveVote(data as Vote);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vote_ballots",
        },
        async () => {
          // Recharge le vote pour avoir les bulletins à jour
          if (activeVote) {
            const { data } = await supabase
              .from("votes")
              .select("*, ballots:vote_ballots(*, member:members(*))")
              .eq("id", activeVote.id)
              .single();
            if (data) setActiveVote(data as Vote);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const results = activeVote?.ballots
    ? calculateVoteResults(activeVote.ballots)
    : null;

  return { activeVote, results };
}
