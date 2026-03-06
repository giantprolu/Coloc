"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "./client";

// Crée un channel pour les événements de la colocation
export function subscribeToColocationEvents(
	colocationId: string,
	callbacks: {
		onEventChange?: (payload: unknown) => void;
		onReactionChange?: (payload: unknown) => void;
	},
): RealtimeChannel {
	const supabase = createClient();

	const channel = supabase
		.channel(`coloc:${colocationId}:events`)
		.on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "events",
				filter: `colocation_id=eq.${colocationId}`,
			},
			(payload) => callbacks.onEventChange?.(payload),
		)
		.on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "event_reactions",
			},
			(payload) => callbacks.onReactionChange?.(payload),
		)
		.subscribe();

	return channel;
}

// Crée un channel pour le chat
export function subscribeToChatChannel(
	colocationId: string,
	channelId: string,
	callbacks: {
		onNewMessage?: (payload: unknown) => void;
		onReadReceipt?: (payload: unknown) => void;
	},
): RealtimeChannel {
	const supabase = createClient();

	const channel = supabase
		.channel(`coloc:${colocationId}:chat:${channelId}`)
		.on(
			"postgres_changes",
			{
				event: "INSERT",
				schema: "public",
				table: "chat_messages",
				filter: `channel_id=eq.${channelId}`,
			},
			(payload) => callbacks.onNewMessage?.(payload),
		)
		.on(
			"postgres_changes",
			{
				event: "INSERT",
				schema: "public",
				table: "message_read_receipts",
			},
			(payload) => callbacks.onReadReceipt?.(payload),
		)
		.subscribe();

	return channel;
}

// Crée un channel pour la présence
export function subscribeToPresence(
	colocationId: string,
	callbacks: {
		onPresenceChange?: (payload: unknown) => void;
	},
): RealtimeChannel {
	const supabase = createClient();

	const channel = supabase
		.channel(`coloc:${colocationId}:presence`)
		.on(
			"postgres_changes",
			{
				event: "UPDATE",
				schema: "public",
				table: "members",
				filter: `colocation_id=eq.${colocationId}`,
			},
			(payload) => callbacks.onPresenceChange?.(payload),
		)
		.subscribe();

	return channel;
}

// Crée un channel pour les annonces
export function subscribeToAnnouncements(
	colocationId: string,
	callbacks: {
		onAnnouncementChange?: (payload: unknown) => void;
	},
): RealtimeChannel {
	const supabase = createClient();

	const channel = supabase
		.channel(`coloc:${colocationId}:announcements`)
		.on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "announcements",
				filter: `colocation_id=eq.${colocationId}`,
			},
			(payload) => callbacks.onAnnouncementChange?.(payload),
		)
		.subscribe();

	return channel;
}
