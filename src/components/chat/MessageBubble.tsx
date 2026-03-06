"use client";

import { Pencil, Reply, Smile } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatTime, getInitials } from "@/lib/utils";
import { type ChatMessage, ChatMessageReaction, type Member } from "@/types";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

interface MessageBubbleProps {
	message: ChatMessage;
	isOwn: boolean;
	showAvatar: boolean;
	currentMemberId: string;
	onReply: (message: ChatMessage) => void;
	onDelete: (messageId: string) => void;
	onReaction: (messageId: string, emoji: string) => void;
	onEdit: (message: ChatMessage) => void;
	members?: Member[];
}

export function MessageBubble({
	message,
	isOwn,
	showAvatar,
	currentMemberId,
	onReply,
	onDelete,
	onReaction,
	onEdit,
	members = [],
}: MessageBubbleProps) {
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Long press handlers for deletion (own messages only)
	const handlePointerDown = useCallback(() => {
		if (!isOwn) return;
		longPressTimer.current = setTimeout(() => {
			setShowDeleteConfirm(true);
		}, 600);
	}, [isOwn]);

	const handlePointerUp = useCallback(() => {
		if (longPressTimer.current) {
			clearTimeout(longPressTimer.current);
			longPressTimer.current = null;
		}
	}, []);

	const handlePointerLeave = useCallback(() => {
		if (longPressTimer.current) {
			clearTimeout(longPressTimer.current);
			longPressTimer.current = null;
		}
	}, []);

	// Build set of mentioned display names for highlighting
	const mentionedNames = useMemo(() => {
		const mentionIds = new Set(message.mentions || []);
		if (mentionIds.size === 0) return new Set<string>();
		const names = new Set(
			members.filter((m) => mentionIds.has(m.id)).map((m) => m.display_name),
		);
		// If message contains @toutlemonde, add it for highlighting
		if (message.content.includes("@toutlemonde")) {
			names.add("toutlemonde");
		}
		return names;
	}, [message.mentions, members, message.content]);

	// Render content with highlighted @mentions
	const renderContent = useCallback(() => {
		if (mentionedNames.size === 0) return message.content;

		// Build regex matching any @DisplayName or @toutlemonde
		const names = Array.from(mentionedNames).map((n) =>
			n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
		);
		const regex = new RegExp(`(@(?:${names.join("|")}))`, "g");
		const parts = message.content.split(regex);

		return parts.map((part, i) => {
			if (regex.test(part)) {
				regex.lastIndex = 0;
				return (
					<span
						key={i}
						className={cn(
							"font-semibold",
							isOwn ? "text-indigo-200" : "text-indigo-600",
						)}
					>
						{part}
					</span>
				);
			}
			regex.lastIndex = 0;
			return part;
		});
	}, [message.content, mentionedNames, isOwn]);

	// Regroupe les réactions par emoji
	const groupedReactions = (message.reactions || []).reduce<
		Map<string, { count: number; hasOwn: boolean; members: string[] }>
	>((acc, r) => {
		const entry = acc.get(r.emoji) || { count: 0, hasOwn: false, members: [] };
		entry.count++;
		if (r.member_id === currentMemberId) entry.hasOwn = true;
		if (r.member?.display_name) entry.members.push(r.member.display_name);
		acc.set(r.emoji, entry);
		return acc;
	}, new Map());

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
				"flex items-start gap-2",
				isOwn ? "flex-row-reverse" : "flex-row",
			)}
		>
			{/* Avatar */}
			{!isOwn && (
				<div className={cn("w-7 flex-shrink-0", showAvatar && "mt-5")}>
					{showAvatar && (
						<Avatar className="h-7 w-7">
							<AvatarImage
								src={message.member?.avatar_url || undefined}
								alt={message.member?.display_name ?? ""}
							/>
							<AvatarFallback
								className="text-xs bg-indigo-100 text-indigo-700"
								aria-hidden="true"
							>
								{message.member
									? getInitials(message.member.display_name)
									: "?"}
							</AvatarFallback>
						</Avatar>
					)}
				</div>
			)}

			<div
				className={cn(
					"max-w-[75%] space-y-1",
					isOwn ? "items-end" : "items-start",
				)}
			>
				{/* Nom de l'expéditeur */}
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
								: "bg-gray-100 border-gray-300",
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
							"rounded-2xl px-3 py-2 text-sm select-none whitespace-pre-wrap break-words",
							isOwn
								? "bg-indigo-600 text-white rounded-br-sm"
								: "bg-white text-gray-900 border shadow-sm rounded-bl-sm",
						)}
						onPointerDown={handlePointerDown}
						onPointerUp={handlePointerUp}
						onPointerLeave={handlePointerLeave}
						onContextMenu={(e) => {
							if (isOwn) {
								e.preventDefault();
								setShowDeleteConfirm(true);
							}
						}}
					>
						{renderContent()}
						{message.edited_at && (
							<span
								className={cn(
									"text-xs ml-1 italic",
									isOwn ? "text-indigo-200" : "text-gray-400",
								)}
							>
								(modifié)
							</span>
						)}
					</div>

					{/* Boutons d'action : répondre + emoji + modifier */}
					<div
						className={cn(
							"flex items-center gap-1 mt-0.5",
							isOwn ? "justify-end" : "justify-start",
						)}
					>
						<button
							type="button"
							onClick={() => setShowEmojiPicker((v) => !v)}
							aria-label="Réagir"
							className="p-1 rounded-full text-gray-300 active:bg-gray-100 active:text-gray-500"
						>
							<Smile className="h-3.5 w-3.5" aria-hidden="true" />
						</button>
						<button
							type="button"
							onClick={() => onReply(message)}
							aria-label={`Répondre à ${message.member?.display_name ?? "ce message"}`}
							className="p-1 rounded-full text-gray-300 active:bg-gray-100 active:text-gray-500"
						>
							<Reply className="h-3.5 w-3.5" aria-hidden="true" />
						</button>
						{isOwn && (
							<button
								type="button"
								onClick={() => onEdit(message)}
								aria-label="Modifier le message"
								className="p-1 rounded-full text-gray-300 active:bg-gray-100 active:text-gray-500"
							>
								<Pencil className="h-3.5 w-3.5" aria-hidden="true" />
							</button>
						)}
					</div>

					{/* Emoji picker rapide */}
					{showEmojiPicker && (
						<div
							className={cn(
								"absolute z-20 flex gap-1 bg-white border shadow-lg rounded-full px-2 py-1 mt-1",
								isOwn ? "right-0" : "left-0",
							)}
						>
							{QUICK_EMOJIS.map((emoji) => (
								<button
									key={emoji}
									type="button"
									onClick={() => {
										onReaction(message.id, emoji);
										setShowEmojiPicker(false);
									}}
									className="text-lg hover:scale-125 transition-transform px-0.5"
								>
									{emoji}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Réactions affichées sous la bulle */}
				{groupedReactions.size > 0 && (
					<div
						className={cn(
							"flex flex-wrap gap-1",
							isOwn ? "justify-end" : "justify-start",
						)}
					>
						{Array.from(groupedReactions.entries()).map(([emoji, info]) => (
							<button
								key={emoji}
								type="button"
								onClick={() => onReaction(message.id, emoji)}
								title={info.members.join(", ")}
								className={cn(
									"inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs border transition-colors",
									info.hasOwn
										? "bg-indigo-50 border-indigo-200 text-indigo-700"
										: "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100",
								)}
							>
								<span>{emoji}</span>
								{info.count > 1 && <span>{info.count}</span>}
							</button>
						))}
					</div>
				)}

				{/* Confirmation de suppression (long press) */}
				{showDeleteConfirm && (
					<div
						className={cn(
							"flex items-center gap-2 mt-1",
							isOwn ? "justify-end" : "justify-start",
						)}
					>
						<button
							type="button"
							onClick={() => {
								onDelete(message.id);
								setShowDeleteConfirm(false);
							}}
							className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-100"
						>
							Supprimer
						</button>
						<button
							type="button"
							onClick={() => setShowDeleteConfirm(false)}
							className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-100"
						>
							Annuler
						</button>
					</div>
				)}

				{/* Heure */}
				<p
					className={cn(
						"text-[10px] text-gray-400 leading-tight",
						isOwn ? "text-right mr-1" : "ml-1",
					)}
				>
					{formatTime(message.created_at)}
				</p>
			</div>
		</div>
	);
}
