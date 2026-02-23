"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Vote, VoteChoice, VoteBallot } from "@/types";
import { calculateVoteResults, formatTimeRemaining } from "@/lib/votes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Vote as VoteIcon, Clock } from "lucide-react";
import { toast } from "sonner";

interface VoteCardProps {
  vote: Vote;
  currentMemberId: string;
  colocationId: string;
}

export function VoteCard({ vote, currentMemberId, colocationId }: VoteCardProps) {
  const [ballots, setBallots] = useState<VoteBallot[]>(vote.ballots || []);
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();
  const results = calculateVoteResults(ballots);
  const userBallot = ballots.find((b) => b.member_id === currentMemberId);
  const totalVoters = ballots.length;

  const handleVote = async (choice: VoteChoice) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (userBallot) {
        // Met à jour le vote
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
      } else {
        // Crée un nouveau bulletin
        const { data, error } = await supabase
          .from("vote_ballots")
          .insert({
            vote_id: vote.id,
            member_id: currentMemberId,
            choice,
          })
          .select()
          .single();

        if (error) throw error;
        setBallots((b) => [...b, data as VoteBallot]);
      }

      toast.success("Vote enregistré !");
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
          <VoteIcon className="h-4 w-4" />
          Vote en cours
        </CardTitle>
        {vote.reason && (
          <p className="text-sm text-orange-700 italic">&ldquo;{vote.reason}&rdquo;</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Résultats actuels */}
        <div className="flex gap-3 text-sm font-medium">
          <span className="text-green-700">✅ {results.approve}</span>
          <span className="text-red-700">❌ {results.reject}</span>
          <span className="text-gray-500">😐 {results.abstain}</span>
          <span className="text-gray-400 ml-auto">
            {totalVoters} vote{totalVoters > 1 ? "s" : ""}
          </span>
        </div>

        {/* Barre de progression */}
        {totalVoters > 0 && (
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden flex gap-0.5">
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
        <div className="grid grid-cols-3 gap-2">
          {(["approve", "reject", "abstain"] as VoteChoice[]).map((choice) => {
            const config = choiceConfig[choice];
            const isActive = userBallot?.choice === choice;

            return (
              <button
                key={choice}
                onClick={() => handleVote(choice)}
                disabled={isLoading}
                className={`rounded-lg border-2 py-2 px-1 text-xs transition-all ${
                  isActive ? config.activeColor : config.color
                } active:scale-95`}
              >
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Temps restant */}
        <div className="flex items-center gap-1 text-xs text-orange-600">
          <Clock className="h-3 w-3" />
          {formatTimeRemaining(vote.closes_at)}
        </div>
      </CardContent>
    </Card>
  );
}
