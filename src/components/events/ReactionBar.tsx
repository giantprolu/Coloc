"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EventReaction, ReactionType, REACTION_EMOJIS, REACTION_LABELS } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReactionBarProps {
  eventId: string;
  memberId: string;
  colocationId: string;
  initialReactions: EventReaction[];
  userReaction: ReactionType | null;
}

export function ReactionBar({
  eventId,
  memberId,
  colocationId,
  initialReactions,
  userReaction: initialUserReaction,
}: ReactionBarProps) {
  const [reactions, setReactions] = useState<EventReaction[]>(initialReactions);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(
    initialUserReaction
  );
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();

  const reactionCounts = reactions.reduce(
    (acc, r) => {
      acc[r.reaction] = (acc[r.reaction] || 0) + 1;
      return acc;
    },
    {} as Record<ReactionType, number>
  );

  const handleReaction = async (reaction: ReactionType) => {
    if (isLoading) return;
    setIsLoading(true);

    const prev = userReaction;
    const prevReactions = [...reactions];

    // Optimistic update
    if (userReaction === reaction) {
      // Supprime la réaction
      setUserReaction(null);
      setReactions((r) => r.filter((rx) => rx.member_id !== memberId));
    } else {
      // Ajoute/modifie la réaction
      setUserReaction(reaction);
      setReactions((r) => [
        ...r.filter((rx) => rx.member_id !== memberId),
        {
          id: "temp",
          event_id: eventId,
          member_id: memberId,
          reaction,
          created_at: new Date().toISOString(),
        },
      ]);
    }

    try {
      if (prev === reaction) {
        // Supprime
        await supabase
          .from("event_reactions")
          .delete()
          .eq("event_id", eventId)
          .eq("member_id", memberId);
      } else if (prev) {
        // Met à jour
        await supabase
          .from("event_reactions")
          .update({ reaction })
          .eq("event_id", eventId)
          .eq("member_id", memberId);
      } else {
        // Insère
        await supabase.from("event_reactions").insert({
          event_id: eventId,
          member_id: memberId,
          reaction,
        });
      }

    } catch {
      // Rollback
      setUserReaction(prev);
      setReactions(prevReactions);
      toast.error("Impossible de modifier votre réaction");
    } finally {
      setIsLoading(false);
    }
  };

  const reactionTypes: ReactionType[] = [
    "thumbs_up",
    "party",
    "neutral",
    "thumbs_down",
    "oppose",
  ];

  return (
    <div className="space-y-3">
      {/* Boutons de réaction */}
      <div className="grid grid-cols-5 gap-1">
        {reactionTypes.map((reaction) => {
          const count = reactionCounts[reaction] || 0;
          const isSelected = userReaction === reaction;

          return (
            <button
              key={reaction}
              onClick={() => handleReaction(reaction)}
              disabled={isLoading}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl p-2 transition-all",
                isSelected
                  ? reaction === "oppose"
                    ? "bg-red-100 border-2 border-red-300 scale-105"
                    : "bg-indigo-100 border-2 border-indigo-300 scale-105"
                  : "bg-gray-50 border-2 border-transparent hover:bg-gray-100",
                "active:scale-95"
              )}
            >
              <span className="text-xl">{REACTION_EMOJIS[reaction]}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "text-xs font-medium",
                    isSelected ? "text-indigo-700" : "text-gray-500"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Labels */}
      {userReaction && (
        <p className="text-xs text-center text-gray-500">
          Votre réaction : {REACTION_LABELS[userReaction]}
        </p>
      )}

      {/* Liste des réactions avec noms */}
      {reactions.length > 0 && (
        <div className="space-y-1">
          {reactionTypes.map((reaction) => {
            const reactors = reactions.filter((r) => r.reaction === reaction);
            if (reactors.length === 0) return null;

            return (
              <div key={reaction} className="flex items-center gap-2 text-xs">
                <span>{REACTION_EMOJIS[reaction]}</span>
                <span className="text-gray-500">
                  {reactors
                    .map((r) => r.member?.display_name || "Quelqu'un")
                    .join(", ")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
