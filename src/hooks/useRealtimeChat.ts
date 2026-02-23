"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribeToChatChannel } from "@/lib/supabase/realtime";
import { ChatMessage, Member } from "@/types";

interface UseRealtimeChatOptions {
  channelId: string;
  colocationId: string;
  currentMember: Member;
}

export function useRealtimeChat({
  channelId,
  colocationId,
  currentMember,
}: UseRealtimeChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const supabase = createClient();

  // Charge les messages initiaux
  useEffect(() => {
    const loadMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select(`
          *,
          member:members(*),
          reply:chat_messages!reply_to(*,member:members(*))
        `)
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true })
        .limit(50);

      if (data) setMessages(data as ChatMessage[]);
      setIsLoading(false);
    };

    loadMessages();
  }, [channelId]);

  // Souscription temps réel aux nouveaux messages
  useEffect(() => {
    const channel = subscribeToChatChannel(colocationId, channelId, {
      onNewMessage: async (payload) => {
        const record = (payload as { new: { id: string } }).new;

        // Récupère le message complet avec les relations
        const { data } = await supabase
          .from("chat_messages")
          .select(`
            *,
            member:members(*),
            reply:chat_messages!reply_to(*,member:members(*))
          `)
          .eq("id", record.id)
          .single();

        if (data) {
          setMessages((prev) => [...prev, data as ChatMessage]);
        }
      },
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, colocationId]);

  // Envoie un message
  const sendMessage = useCallback(
    async (content: string, replyTo?: string) => {
      const { error } = await supabase.from("chat_messages").insert({
        channel_id: channelId,
        member_id: currentMember.id,
        content,
        reply_to: replyTo || null,
      });

      if (error) throw error;
    },
    [channelId, currentMember.id]
  );

  return { messages, isLoading, typingUsers, sendMessage };
}
