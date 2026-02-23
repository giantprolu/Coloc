"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Vote, VoteChoice, VoteBallot } from "@/types";
import { calculateVoteResults, formatTimeRemaining } from "@/lib/votes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Vote as VoteIcon, Clock } from "lucide-react";
import { toast } from "sonner";
import { closeVoteIfAllVoted } from "@/app/actions/votes";

interface VoteCardProps {
  vote: Vote;
  currentMemberId: string;
  colocationId: string;
  totalMembers: number;
}

export function VoteCard({ vote, currentMemberId, colocationId, totalMembers }: VoteCardProps) {
  const [ballots, setBallots] = useState<VoteBallot[]>(vote.ballots || []);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);
  const results = calculateVoteResults(ballots);
  const userBallot = ballots.find((b) => b.member_id === currentMemberId);
  const totalVoters = ballots.length;

  // Souscription temps réel aux bulletins et au statut du vote
  useEffect(() => {
    const channel = supabase
      .channel(`vote-card-${vote.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vote_ballots",
          filter: `vote_id=eq.${vote.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newBallot = payload.new as VoteBallot;
            setBallots((prev) =>
              prev.some((b) => b.id === newBallot.id) ? prev : [...prev, newBallot]
            );
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as VoteBallot;
            setBallots((prev) =>
              prev.map((b) => (b.id === updated.id ? { ...b, choice: updated.choice } : b))
            );
          } else if (payload.eventType === "DELETE") {
            setBallots((prev) => prev.filter((b) => b.id !== (payload.old as VoteBallot).id));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "votes",
          filter: `id=eq.${vote.id}`,
        },
        (payload) => {
          const updated = payload.new as { status: string };
          if (updated.status !== "open") {
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vote.id, supabase, router]);

  const handleVote = async (choice: VoteChoice) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (userBallot) {
        // Met à jour le bulletin existant
        const { error } = await supabase
          .from("vote_ballots")
          .update({ choice })
          .eq("id", userBallot.id);

        if (error) throw error;

        setBallots((b) =>
          b.map((ballot) =>
            ballot.id === userBallot.id ? { ...ballot, choice } : ballot
          )
        );
        toast.success("Vote mis à jour !");
      } else {
        // Crée un nouveau bulletin
        const { data, error } = await supabase
          .from("vote_ballots")
          .insert({ vote_id: vote.id, member_id: currentMemberId, choice })
          .select()
          .single();

        if (error) throw error;

        const newBallot = data as VoteBallot;
        setBallots((prev) =>
          prev.some((b) => b.id === newBallot.id) ? prev : [...prev, newBallot]
        );

        toast.success("Vote enregistré !");

        // Ferme automatiquement si tous les membres ont voté
        const newCount = ballots.filter((b) => b.id !== newBallot.id).length + 1;
        if (totalMembers > 0 && newCount >= totalMembers) {
          const closed = await closeVoteIfAllVoted(vote.id, colocationId);
          if (closed) {
            toast.success("Tous les membres ont voté — le vote est clôturé !");
            router.refresh();
            return;
          }
        }
      }
    } catch {
      toast.error("Impossible d'enregistrer votre vote");
    } finally {
      setIsLoading(false);
    }
  };

  const choiceConfig: Record<VoteChoice, { label: string; color: string; activeColor: string }> = {
    approve: {
      label: "✅ Approuver",
      color: "border-green-200 text-green-700 hover:bg-green-50",
      activeColor: "bg-green-100 border-green-400 text-green-800 font-semibold",
    },
    reject: {
      label: "❌ Refuser",
      color: "border-red-200 text-red-700 hover:bg-red-50",
      activeColor: "bg-red-100 border-red-400 text-red-800 font-semibold",
    },
    abstain: {
      label: "😐 S'abstenir",
      color: "border-gray-200 text-gray-600 hover:bg-gray-50",
      activeColor: "bg-gray-100 border-gray-400 text-gray-800 font-semibold",
    },
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-orange-800">
          <VoteIcon className="h-4 w-4" aria-hidden="true" />
          Vote en cours
        </CardTitle>
        {vote.reason && (
          <p className="text-sm text-orange-700 italic">&ldquo;{vote.reason}&rdquo;</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Résultats actuels */}
        <div className="flex gap-3 text-sm font-medium" role="status" aria-label="Résultats du vote">
          <span className="text-green-700">✅ {results.approve}</span>
          <span className="text-red-700">❌ {results.reject}</span>
          <span className="text-gray-500">😐 {results.abstain}</span>
          <span className="text-gray-400 ml-auto">
            {totalVoters} vote{totalVoters > 1 ? "s" : ""}
            {totalMembers > 0 && ` / ${totalMembers}`}
          </span>
        </div>

        {/* Barre de progression */}
        {totalVoters > 0 && (
          <div
            className="h-2 rounded-full bg-gray-200 overflow-hidden flex gap-0.5"
            role="img"
            aria-label={`${results.approve} pour, ${results.reject} contre, ${results.abstain} abstentions`}
          >
            {results.approve > 0 && (
              <div
                className="h-full bg-green-500 rounded-l-full transition-all"
                style={{ width: `${(results.approve / totalVoters) * 100}%` }}
              />
            )}
            {results.reject > 0 && (
              <div
                className="h-full bg-red-500 rounded-r-full transition-all"
                style={{ width: `${(results.reject / totalVoters) * 100}%` }}
              />
            )}
          </div>
        )}

        {/* Boutons de vote */}
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Votre choix">
          {(["approve", "reject", "abstain"] as VoteChoice[]).map((choice) => {
            const config = choiceConfig[choice];
            const isActive = userBallot?.choice === choice;

            return (
              <button
                key={choice}
                onClick={() => handleVote(choice)}
                disabled={isLoading}
                aria-pressed={isActive}
                className={`rounded-lg border-2 py-2 px-1 text-xs transition-all ${
                  isActive ? config.activeColor : config.color
                } active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
              >
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Temps restant */}
        <div className="flex items-center gap-1 text-xs text-orange-600">
          <Clock className="h-3 w-3" aria-hidden="true" />
          <time>{formatTimeRemaining(vote.closes_at)}</time>
        </div>
      </CardContent>
    </Card>
  );
}
