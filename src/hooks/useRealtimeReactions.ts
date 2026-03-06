"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EventReaction, ReactionType } from "@/types";

export function useRealtimeReactions(eventId: string) {
	const [reactions, setReactions] = useState<EventReaction[]>([]);
	const supabase = createClient();

	// Charge les réactions initiales
	useEffect(() => {
		const loadReactions = async () => {
			const { data } = await supabase
				.from("event_reactions")
				.select("*, member:members(*)")
				.eq("event_id", eventId);

			if (data) setReactions(data as EventReaction[]);
		};

		loadReactions();
	}, [eventId]);

	// Souscription temps réel
	useEffect(() => {
		const channel = supabase
			.channel(`event-reactions-${eventId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "event_reactions",
					filter: `event_id=eq.${eventId}`,
				},
				async (payload) => {
					if (payload.eventType === "INSERT") {
						const { data } = await supabase
							.from("event_reactions")
							.select("*, member:members(*)")
							.eq("id", (payload.new as EventReaction).id)
							.single();
						if (data) setReactions((prev) => [...prev, data as EventReaction]);
					} else if (payload.eventType === "UPDATE") {
						const { data } = await supabase
							.from("event_reactions")
							.select("*, member:members(*)")
							.eq("id", (payload.new as EventReaction).id)
							.single();
						if (data) {
							setReactions((prev) =>
								prev.map((r) =>
									r.id === (data as EventReaction).id
										? (data as EventReaction)
										: r,
								),
							);
						}
					} else if (payload.eventType === "DELETE") {
						setReactions((prev) =>
							prev.filter((r) => r.id !== (payload.old as EventReaction).id),
						);
					}
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [eventId]);

	// Regroupe les réactions par type
	const reactionCounts = reactions.reduce(
		(acc, r) => {
			acc[r.reaction] = (acc[r.reaction] || 0) + 1;
			return acc;
		},
		{} as Record<ReactionType, number>,
	);

	return { reactions, reactionCounts };
}
