"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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

  // @supabase/ssr v0.8+ crée un singleton — useMemo garantit la stabilité
  const supabase = useMemo(() => createClient(), []);

  // Ref pour accès sans re-créer les callbacks
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Fusionne de nouveaux messages sans doublons, triés par date
  const mergeMessages = useCallback((newMsgs: ChatMessage[]) => {
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const toAdd = newMsgs.filter((m) => !existingIds.has(m.id));
      if (toAdd.length === 0) return prev;
      return [...prev, ...toAdd].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, []);

  // ─── Chargement initial (query simple, sans self-join) ──────────────────
  useEffect(() => {
    let cancelled = false;

    supabase
      .from("chat_messages")
      .select("*, member:members(id, display_name, avatar_url)")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setMessages(data as ChatMessage[]);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [channelId, supabase]);

  // ─── Souscription temps réel ─────────────────────────────────────────────
  useEffect(() => {
    const realtimeChannel = supabase
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
          const id = (payload as unknown as { new: { id: string } }).new.id;

          const { data } = await supabase
            .from("chat_messages")
            .select("*, member:members(id, display_name, avatar_url)")
            .eq("id", id)
            .single();

          if (data) mergeMessages([data as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [channelId, colocationId, supabase, mergeMessages]);

  // ─── Fallback polling : tab focus + toutes les 30 secondes ──────────────
  useEffect(() => {
    const refetch = async () => {
      const current = messagesRef.current;
      const lastReal = [...current]
        .reverse()
        .find((m) => !m.id.startsWith("optimistic-"));
      const since = lastReal?.created_at ?? new Date(0).toISOString();

      const { data } = await supabase
        .from("chat_messages")
        .select("*, member:members(id, display_name, avatar_url)")
        .eq("channel_id", channelId)
        .gt("created_at", since)
        .order("created_at", { ascending: true });

      if (data && data.length > 0) mergeMessages(data as ChatMessage[]);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") refetch();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    const interval = setInterval(refetch, 30_000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [channelId, supabase, mergeMessages]);

  // ─── Envoi avec mise à jour optimiste ────────────────────────────────────
  const sendMessage = useCallback(
    async (content: string, replyTo?: string) => {
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
        // Select minimal (pas de join complexe) pour éviter les erreurs
        const { data, error } = await supabase
          .from("chat_messages")
          .insert({
            channel_id: channelId,
            member_id: currentMember.id,
            content,
            reply_to: replyTo || null,
          })
          .select("id, created_at")
          .single();

        if (error) throw error;

        // Remplace tempId par le vrai ID (garde les données optimistes)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, id: data.id, created_at: data.created_at }
              : m
          )
        );
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        throw err;
      }
    },
    [channelId, currentMember, supabase]
  );

  return { messages, isLoading, sendMessage };
}
