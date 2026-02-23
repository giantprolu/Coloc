"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
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

  // Client stable — ne recrée pas à chaque render
  const supabase = useMemo(() => createClient(), []);

  // Charge les messages initiaux
  useEffect(() => {
    let cancelled = false;
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

      if (!cancelled && data) setMessages(data as ChatMessage[]);
      if (!cancelled) setIsLoading(false);
    };

    loadMessages();
    return () => { cancelled = true; };
  }, [channelId, supabase]);

  // Souscription temps réel — utilise le même client pour subscribe ET cleanup
  useEffect(() => {
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
        async (payload) => {
          const record = (payload as unknown as { new: { id: string } }).new;

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
            setMessages((prev) =>
              // Déduplique : si déjà présent (ajout optimiste), on ne duplique pas
              prev.some((m) => m.id === (data as ChatMessage).id)
                ? prev
                : [...prev, data as ChatMessage]
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, colocationId, supabase]);

  // Envoie un message avec mise à jour optimiste
  const sendMessage = useCallback(
    async (content: string, replyTo?: string) => {
      // Ajout optimiste immédiat
      const tempId = `optimistic-${Date.now()}`;
      const optimistic: ChatMessage = {
        id: tempId,
        channel_id: channelId,
        member_id: currentMember.id,
        content,
        reply_to: replyTo || null,
        is_system: false,
        created_at: new Date().toISOString(),
        member: currentMember,
      };
      setMessages((prev) => [...prev, optimistic]);

      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .insert({
            channel_id: channelId,
            member_id: currentMember.id,
            content,
            reply_to: replyTo || null,
          })
          .select(`
            *,
            member:members(*),
            reply:chat_messages!reply_to(*,member:members(*))
          `)
          .single();

        if (error) throw error;

        // Remplace l'optimiste par le vrai message
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? (data as ChatMessage) : m))
        );
      } catch (err) {
        // Annule l'optimiste en cas d'erreur
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        throw err;
      }
    },
    [channelId, currentMember, supabase]
  );

  return { messages, isLoading, sendMessage };
}
