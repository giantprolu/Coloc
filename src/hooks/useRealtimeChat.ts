"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChatMessage, ChatMessageReaction, Member } from "@/types";
import {
  sendChatMessage,
  fetchChatMessages,
  fetchSingleMessage,
  toggleMessageReaction as toggleReactionAction,
  deleteChatMessage as deleteChatMessageAction,
  fetchReactionsForMessages,
} from "@/app/actions/chat";

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

  const supabase = useMemo(() => createClient(), []);
  const messagesRef = useRef<ChatMessage[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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

  // Charge les réactions pour un ensemble de messages
  const loadReactions = useCallback(async (msgs: ChatMessage[]) => {
    const ids = msgs.map((m) => m.id).filter((id) => !id.startsWith("optimistic-"));
    if (ids.length === 0) return;

    try {
      const reactions = await fetchReactionsForMessages(ids);
      if (reactions.length === 0) return;

      const reactionsByMessage = new Map<string, ChatMessageReaction[]>();
      for (const r of reactions) {
        const list = reactionsByMessage.get(r.message_id) || [];
        list.push(r as ChatMessageReaction);
        reactionsByMessage.set(r.message_id, list);
      }

      setMessages((prev) =>
        prev.map((m) =>
          reactionsByMessage.has(m.id)
            ? { ...m, reactions: reactionsByMessage.get(m.id)! }
            : m
        )
      );
    } catch (err) {
      console.error("Error loading reactions:", err);
    }
  }, []);

  // ─── Chargement initial via server action ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    fetchChatMessages(channelId, 50)
      .then(async (data) => {
        if (cancelled) return;
        const msgs = data as ChatMessage[];
        setMessages(msgs);
        setIsLoading(false);
        await loadReactions(msgs);
      })
      .catch((err) => {
        console.error("Chat initial load error:", err);
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [channelId, loadReactions]);

  // ─── Souscription temps réel ─────────────────────────────────────────────
  useEffect(() => {
    const fetchAndMerge = async (id: string) => {
      if (messagesRef.current.some((m) => m.id === id)) return;

      try {
        const data = await fetchSingleMessage(id);
        if (data) mergeMessages([data as ChatMessage]);
      } catch (err) {
        console.error("Chat fetch single message error:", err);
      }
    };

    const realtimeChannel = supabase
      .channel(`coloc:${colocationId}:chat:${channelId}`)
      .on("broadcast", { event: "new_message" }, async ({ payload }) => {
        const { id } = payload as { id: string };
        await fetchAndMerge(id);
      })
      .on("broadcast", { event: "delete_message" }, ({ payload }) => {
        const { id } = payload as { id: string };
        setMessages((prev) => prev.filter((m) => m.id !== id));
      })
      .on("broadcast", { event: "reaction_update" }, async ({ payload }) => {
        const { messageId } = payload as { messageId: string };
        // Recharger les réactions pour ce message
        const msg = messagesRef.current.find((m) => m.id === messageId);
        if (msg) await loadReactions([msg]);
      })
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
          await fetchAndMerge(id);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const id = (payload as unknown as { old: { id: string } }).old.id;
          setMessages((prev) => prev.filter((m) => m.id !== id));
        }
      )
      .subscribe();

    channelRef.current = realtimeChannel;

    return () => {
      supabase.removeChannel(realtimeChannel);
      channelRef.current = null;
    };
  }, [channelId, colocationId, supabase, mergeMessages, loadReactions]);

  // ─── Fallback polling via server action ───────────────────────────────────
  useEffect(() => {
    const refetch = async () => {
      const current = messagesRef.current;
      const lastReal = [...current]
        .reverse()
        .find((m) => !m.id.startsWith("optimistic-"));
      const since = lastReal?.created_at ?? new Date(0).toISOString();

      try {
        const data = await fetchChatMessages(channelId, 50, since);
        if (data.length > 0) mergeMessages(data as ChatMessage[]);
      } catch (err) {
        console.error("Chat polling error:", err);
      }
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
  }, [channelId, mergeMessages]);

  // ─── Envoi via server action + broadcast ──────────────────────────────────
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
        const data = await sendChatMessage(channelId, content, replyTo);

        // Remplace le message optimiste par le vrai
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, id: data.id, created_at: data.created_at }
              : m
          )
        );

        // Broadcast aux autres clients
        await channelRef.current?.send({
          type: "broadcast",
          event: "new_message",
          payload: { id: data.id },
        });
      } catch (err) {
        console.error("Chat send error:", err);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        throw err;
      }
    },
    [channelId, currentMember]
  );

  // ─── Suppression de message ───────────────────────────────────────────────
  const deleteMessage = useCallback(
    async (messageId: string) => {
      // Optimistic: retire immédiatement
      setMessages((prev) => prev.filter((m) => m.id !== messageId));

      try {
        await deleteChatMessageAction(messageId);

        // Broadcast aux autres clients
        await channelRef.current?.send({
          type: "broadcast",
          event: "delete_message",
          payload: { id: messageId },
        });
      } catch (err) {
        console.error("Chat delete error:", err);
        // Recharger en cas d'erreur
        const data = await fetchSingleMessage(messageId);
        if (data) mergeMessages([data as ChatMessage]);
        throw err;
      }
    },
    [mergeMessages]
  );

  // ─── Toggle réaction ──────────────────────────────────────────────────────
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        await toggleReactionAction(messageId, emoji);

        // Recharger les réactions de ce message
        const reactions = await fetchReactionsForMessages([messageId]);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, reactions: (reactions as ChatMessageReaction[]) || [] }
              : m
          )
        );

        // Broadcast aux autres clients
        await channelRef.current?.send({
          type: "broadcast",
          event: "reaction_update",
          payload: { messageId },
        });
      } catch (err) {
        console.error("Chat reaction error:", err);
      }
    },
    []
  );

  return { messages, isLoading, sendMessage, deleteMessage, toggleReaction };
}
