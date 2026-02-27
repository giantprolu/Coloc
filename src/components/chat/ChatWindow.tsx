"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { ChatChannel, ChatMessage, Member } from "@/types";
import { MessageBubble } from "./MessageBubble";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Send, X, Reply, Pencil } from "lucide-react";
import { toast } from "sonner";

interface ChatWindowProps {
  channel: ChatChannel;
  currentMember: Member;
  colocationId: string;
}

export function ChatWindow({ channel, currentMember, colocationId }: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, sendMessage, deleteMessage, toggleReaction, editMessage } = useRealtimeChat({
    channelId: channel.id,
    colocationId,
    currentMember,
  });

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize du textarea
  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  }, []);

  useEffect(() => {
    autoResize();
  }, [input, autoResize]);

  // Gestion du focus pour cacher la barre de nav et ajuster le viewport
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    window.dispatchEvent(new Event("chat-input-focus"));
    // Scroll vers le bas quand le clavier s'ouvre
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    window.dispatchEvent(new Event("chat-input-blur"));
  }, []);

  // Visual Viewport API pour gérer le clavier mobile
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport || !containerRef.current) return;

    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;
      // Ajuste la hauteur du container en fonction du viewport visible
      const height = viewport.height - container.getBoundingClientRect().top;
      container.style.height = `${height}px`;
      // Scroll vers le bas
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    viewport.addEventListener("resize", handleResize);
    return () => viewport.removeEventListener("resize", handleResize);
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Mode édition
    if (editingMessage) {
      try {
        await editMessage(editingMessage.id, input.trim());
        setInput("");
        setEditingMessage(null);
      } catch (err) {
        console.error("Chat edit error:", err);
        toast.error(
          err instanceof Error ? err.message : "Impossible de modifier le message"
        );
      }
      return;
    }

    // Envoi normal
    try {
      await sendMessage(input.trim(), replyTo?.id);
      setInput("");
      setReplyTo(null);
    } catch (err) {
      console.error("Chat send error:", err);
      toast.error(
        err instanceof Error ? err.message : "Impossible d'envoyer le message"
      );
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
    } catch {
      toast.error("Impossible de supprimer le message");
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    await toggleReaction(messageId, emoji);
  };

  const handleEdit = (message: ChatMessage) => {
    setEditingMessage(message);
    setReplyTo(null);
    setInput(message.content);
    textareaRef.current?.focus();
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setInput("");
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col"
      style={{ height: isFocused ? undefined : "calc(100dvh - 80px)" }}
    >
      {/* En-tête */}
      <div className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
            <span className="text-indigo-700">💬</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{channel.name}</p>
            <p className="text-xs text-gray-500">Chat de la coloc</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            Chargement des messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-2">👋</p>
            <p className="text-gray-500 text-sm">
              Démarrez la conversation !
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isOwn = msg.member_id === currentMember.id;
            const prevMsg = messages[idx - 1];
            const showAvatar =
              !isOwn && prevMsg?.member_id !== msg.member_id;

            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={isOwn}
                showAvatar={showAvatar}
                currentMemberId={currentMember.id}
                onReply={setReplyTo}
                onDelete={handleDelete}
                onReaction={handleReaction}
                onEdit={handleEdit}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Barre d'édition */}
      {editingMessage && (
        <div className="mx-4 mb-1 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <Pencil className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-amber-700">
              Modifier le message
            </p>
            <p className="text-xs text-gray-500 truncate">{editingMessage.content}</p>
          </div>
          <button
            type="button"
            onClick={cancelEdit}
            aria-label="Annuler la modification"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Barre de réponse */}
      {replyTo && !editingMessage && (
        <div className="mx-4 mb-1 flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2">
          <Reply className="h-4 w-4 text-indigo-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-indigo-700">
              Répondre à {replyTo.member?.display_name}
            </p>
            <p className="text-xs text-gray-500 truncate">{replyTo.content}</p>
          </div>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            aria-label="Annuler la réponse"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Zone de saisie */}
      <form
        onSubmit={handleSend}
        className="border-t bg-white px-4 py-3 flex gap-2 items-end"
      >
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={currentMember.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
            {getInitials(currentMember.display_name)}
          </AvatarFallback>
        </Avatar>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Écrivez un message..."
          rows={1}
          className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          style={{ maxHeight: 120 }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim()}
          aria-label={editingMessage ? "Confirmer la modification" : "Envoyer le message"}
          className={editingMessage ? "bg-amber-500 hover:bg-amber-600 flex-shrink-0" : "bg-indigo-600 hover:bg-indigo-700 flex-shrink-0"}
        >
          {editingMessage ? (
            <Pencil className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </form>
    </div>
  );
}
