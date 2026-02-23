"use client";

import { ChatMessage } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, formatTime } from "@/lib/utils";
import { Reply } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showAvatar: boolean;
  onReply: (message: ChatMessage) => void;
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar,
  onReply,
}: MessageBubbleProps) {
  // Message système
  if (message.is_system) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-end gap-2 group",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      {!isOwn && (
        <div className="w-7 flex-shrink-0">
          {showAvatar && (
            <Avatar className="h-7 w-7">
              <AvatarImage
                src={message.member?.avatar_url || undefined}
                alt={message.member?.display_name ?? ""}
              />
              <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700" aria-hidden="true">
                {message.member ? getInitials(message.member.display_name) : "?"}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div
        className={cn(
          "max-w-[75%] space-y-1",
          isOwn ? "items-end" : "items-start"
        )}
      >
        {/* Nom de l'expéditeur (pour les messages des autres) */}
        {showAvatar && !isOwn && (
          <p className="text-xs font-medium text-gray-500 ml-1">
            {message.member?.display_name}
          </p>
        )}

        {/* Message cité (reply) */}
        {message.reply && (
          <div
            className={cn(
              "rounded-lg px-2 py-1 text-xs border-l-2 mb-1",
              isOwn
                ? "bg-indigo-50 border-indigo-300 text-right"
                : "bg-gray-100 border-gray-300"
            )}
          >
            <p className="font-medium text-gray-600">
              {message.reply.member?.display_name || "Quelqu'un"}
            </p>
            <p className="text-gray-500 truncate">{message.reply.content}</p>
          </div>
        )}

        {/* Bulle du message */}
        <div className="relative">
          <div
            className={cn(
              "rounded-2xl px-3 py-2 text-sm",
              isOwn
                ? "bg-indigo-600 text-white rounded-br-sm"
                : "bg-white text-gray-900 border shadow-sm rounded-bl-sm"
            )}
          >
            {message.content}
          </div>

          {/* Bouton répondre (au survol / focus) */}
          <button
            type="button"
            onClick={() => onReply(message)}
            aria-label={`Répondre à ${message.member?.display_name ?? "ce message"}`}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity",
              "p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500",
              isOwn ? "-left-8" : "-right-8"
            )}
          >
            <Reply className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>

        {/* Heure */}
        <p
          className={cn(
            "text-xs text-gray-400",
            isOwn ? "text-right mr-1" : "ml-1"
          )}
        >
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}
