"use client";

import { useState, useRef, useEffect } from "react";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { ChatChannel, ChatMessage, Member } from "@/types";
import { MessageBubble } from "./MessageBubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Send, X, Reply } from "lucide-react";
import { toast } from "sonner";

interface ChatWindowProps {
  channel: ChatChannel;
  currentMember: Member;
  colocationId: string;
}

export function ChatWindow({ channel, currentMember, colocationId }: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, sendMessage } = useRealtimeChat({
    channelId: channel.id,
    colocationId,
    currentMember,
  });

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

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

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
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
                onReply={setReplyTo}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Barre de réponse */}
      {replyTo && (
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
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écrivez un message..."
          className="flex-1"
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
          aria-label="Envoyer le message"
          className="bg-indigo-600 hover:bg-indigo-700 flex-shrink-0"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}
