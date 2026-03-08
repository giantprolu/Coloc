"use client";

import { FlaskConical, Pencil, Reply, Send, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import type { ChatChannel, ChatMessage, Member } from "@/types";
import {
	MENTION_EVERYONE_ID,
	MENTION_EVERYONE_LABEL,
	MentionPopover,
} from "./MentionPopover";
import { MessageBubble } from "./MessageBubble";

interface ChatWindowProps {
	channel: ChatChannel;
	currentMember: Member;
	colocationId: string;
	members?: Member[];
	hasDevAccess?: boolean;
}

export function ChatWindow({
	channel,
	currentMember,
	colocationId,
	members = [],
	hasDevAccess = false,
}: ChatWindowProps) {
	const [input, setInput] = useState("");
	const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
	const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(
		null,
	);
	const [isFocused, setIsFocused] = useState(false);
	const [testMode, setTestMode] = useState(false);
	const [vvRect, setVvRect] = useState<{
		height: number;
		offsetTop: number;
	} | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Mention state
	const [mentionQuery, setMentionQuery] = useState("");
	const [mentionVisible, setMentionVisible] = useState(false);
	const [mentionIndex, setMentionIndex] = useState(0);

	// Other members for mentions (exclude self)
	const otherMembers = useMemo(
		() => members.filter((m) => m.id !== currentMember.id),
		[members, currentMember.id],
	);

	// Filtered members for mention popover
	const filteredMentionMembers = useMemo(() => {
		if (!mentionQuery) return otherMembers;
		const q = mentionQuery.toLowerCase();
		return otherMembers.filter((m) => m.display_name.toLowerCase().includes(q));
	}, [otherMembers, mentionQuery]);

	// Total popover entries count (includes "Tout le monde" + filtered members)
	const showEveryoneEntry =
		!mentionQuery ||
		MENTION_EVERYONE_LABEL.includes(mentionQuery.toLowerCase()) ||
		"tout le monde".includes(mentionQuery.toLowerCase());
	const totalPopoverEntries =
		(showEveryoneEntry ? 1 : 0) + filteredMentionMembers.length;
	const popoverHasEntries = totalPopoverEntries > 0;

	const {
		messages,
		isLoading,
		sendMessage,
		deleteMessage,
		toggleReaction,
		editMessage,
	} = useRealtimeChat({
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
		textarea.style.height = Math.min(textarea.scrollHeight, 150) + "px";
	}, []);

	useEffect(() => {
		autoResize();
	}, [input, autoResize]);

	// Gestion du focus pour cacher la barre de nav et ajuster le viewport
	const handleFocus = useCallback(() => {
		setIsFocused(true);
		window.dispatchEvent(new Event("chat-input-focus"));
		setTimeout(() => {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}, 300);
	}, []);

	const handleBlur = useCallback(() => {
		// Delay to allow mention popover click
		setTimeout(() => {
			setIsFocused(false);
			window.dispatchEvent(new Event("chat-input-blur"));
		}, 150);
	}, []);

	// Visual Viewport API — track keyboard open/close
	useEffect(() => {
		const vv = window.visualViewport;
		if (!vv) return;

		const update = () => {
			setVvRect({ height: vv.height, offsetTop: vv.offsetTop });
		};

		update(); // initialize
		vv.addEventListener("resize", update);
		vv.addEventListener("scroll", update);
		return () => {
			vv.removeEventListener("resize", update);
			vv.removeEventListener("scroll", update);
		};
	}, []);

	// Scroll to bottom when keyboard resizes
	const vvHeight = vvRect?.height;
	useEffect(() => {
		if (isFocused) {
			requestAnimationFrame(() => {
				messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
			});
		}
	}, [isFocused, vvHeight]);

	// Detect @ mention pattern in input
	const detectMention = useCallback((value: string, cursorPos: number) => {
		const textBeforeCursor = value.slice(0, cursorPos);
		const mentionMatch = textBeforeCursor.match(/@(\S*)$/);
		if (mentionMatch) {
			setMentionQuery(mentionMatch[1]);
			setMentionVisible(true);
			setMentionIndex(0);
		} else {
			setMentionVisible(false);
		}
	}, []);

	const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const value = e.target.value;
		setInput(value);
		detectMention(value, e.target.selectionStart || value.length);
	};

	const handleMentionSelect = (entry: { id: string; display_name: string }) => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		const cursorPos = textarea.selectionStart || input.length;
		const textBeforeCursor = input.slice(0, cursorPos);
		const textAfterCursor = input.slice(cursorPos);
		const mentionMatch = textBeforeCursor.match(/@(\S*)$/);

		if (mentionMatch) {
			const beforeMention = textBeforeCursor.slice(0, mentionMatch.index);
			const label =
				entry.id === MENTION_EVERYONE_ID
					? MENTION_EVERYONE_LABEL
					: entry.display_name;
			const newValue = `${beforeMention}@${label} ${textAfterCursor}`;
			setInput(newValue);
			setMentionVisible(false);
			// Focus and set cursor after mention
			setTimeout(() => {
				textarea.focus();
				const newPos = beforeMention.length + label.length + 2; // @ + label + space
				textarea.setSelectionRange(newPos, newPos);
			}, 0);
		}
	};

	// Extract mentioned member IDs from input text
	const extractMentions = (text: string): string[] => {
		// @toutlemonde → mention all other members
		if (text.includes(`@${MENTION_EVERYONE_LABEL}`)) {
			return otherMembers.map((m) => m.id);
		}
		const mentionedIds: string[] = [];
		for (const m of otherMembers) {
			if (text.includes(`@${m.display_name}`)) {
				mentionedIds.push(m.id);
			}
		}
		return mentionedIds;
	};

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
					err instanceof Error
						? err.message
						: "Impossible de modifier le message",
				);
			}
			return;
		}

		// Envoi normal
		try {
			const mentions = extractMentions(input.trim());
			await sendMessage(input.trim(), replyTo?.id, mentions, testMode);
			setInput("");
			setReplyTo(null);
			setMentionVisible(false);
		} catch (err) {
			console.error("Chat send error:", err);
			toast.error(
				err instanceof Error ? err.message : "Impossible d'envoyer le message",
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

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// When mention popover is visible, hijack navigation keys
		if (mentionVisible && popoverHasEntries) {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setMentionIndex((i) => Math.min(i + 1, totalPopoverEntries - 1));
				return;
			}
			if (e.key === "ArrowUp") {
				e.preventDefault();
				setMentionIndex((i) => Math.max(i - 1, 0));
				return;
			}
			if (e.key === "Enter") {
				e.preventDefault();
				// The popover has "Tout le monde" at index 0, then members
				// Delegate selection to the popover's onSelect
				const everyoneOffset = showEveryoneEntry ? 1 : 0;
				if (showEveryoneEntry && mentionIndex === 0) {
					handleMentionSelect({
						id: MENTION_EVERYONE_ID,
						display_name: MENTION_EVERYONE_LABEL,
					});
				} else {
					const memberIdx = mentionIndex - everyoneOffset;
					if (filteredMentionMembers[memberIdx]) {
						handleMentionSelect(filteredMentionMembers[memberIdx]);
					}
				}
				return;
			}
			if (e.key === "Escape") {
				e.preventDefault();
				setMentionVisible(false);
				return;
			}
		}

		// Normal Enter to send
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend(e);
		}
	};

	return (
		<div
			ref={containerRef}
			className={`flex flex-col ${isFocused ? "fixed inset-x-0 z-50 mx-auto max-w-md bg-gray-50" : ""}`}
			style={
				isFocused
					? {
							top: vvRect?.offsetTop ?? 0,
							height: vvRect ? `${vvRect.height}px` : "100dvh",
						}
					: { height: "calc(100dvh - 80px)" }
			}
		>
			{/* En-tête */}
			<div className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur-sm px-4 py-3">
				<div className="flex items-center gap-3">
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
						<span className="text-indigo-700">💬</span>
					</div>
					<div className="flex-1">
						<p className="font-semibold text-gray-900">{channel.name}</p>
						<p className="text-xs text-gray-500">Chat de la coloc</p>
					</div>
					{hasDevAccess && (
						<div className="flex items-center gap-1.5">
							<FlaskConical
								className={`h-4 w-4 ${testMode ? "text-amber-500" : "text-gray-400"}`}
							/>
							<Switch
								checked={testMode}
								onCheckedChange={setTestMode}
								className="scale-75"
							/>
						</div>
					)}
				</div>
				{testMode && (
					<div className="mt-2 rounded-md bg-amber-50 border border-amber-200 px-2 py-1">
						<p className="text-[11px] text-amber-700 text-center">
							Mode test — les notifs sont envoyées uniquement à vous
						</p>
					</div>
				)}
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
						<p className="text-gray-500 text-sm">Démarrez la conversation !</p>
					</div>
				) : (
					messages.map((msg, idx) => {
						const isOwn = msg.member_id === currentMember.id;
						const prevMsg = messages[idx - 1];
						const showAvatar = !isOwn && prevMsg?.member_id !== msg.member_id;

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
								members={members}
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
						<p className="text-xs text-gray-500 truncate">
							{editingMessage.content}
						</p>
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
			<form onSubmit={handleSend} className="border-t bg-white px-3 py-2">
				{/* Mention popover */}
				{mentionVisible && popoverHasEntries && (
					<MentionPopover
						members={filteredMentionMembers}
						selectedIndex={mentionIndex}
						onSelect={handleMentionSelect}
						onClose={() => setMentionVisible(false)}
						query={mentionQuery}
					/>
				)}

				<div className="flex items-end gap-2">
					<div className="flex-1 flex items-end rounded-2xl border bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-300 transition-colors">
						<textarea
							ref={textareaRef}
							value={input}
							onChange={handleInputChange}
							onFocus={handleFocus}
							onBlur={handleBlur}
							placeholder="Écrivez un message..."
							rows={1}
							className="flex-1 resize-none bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none"
							style={{ maxHeight: 150 }}
							onKeyDown={handleKeyDown}
						/>
					</div>
					<button
						type="submit"
						disabled={!input.trim()}
						aria-label={
							editingMessage
								? "Confirmer la modification"
								: "Envoyer le message"
						}
						className={`flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full text-white transition-all ${
							!input.trim() ? "opacity-40 pointer-events-none" : "opacity-100"
						} ${editingMessage ? "bg-amber-500 active:bg-amber-600" : "bg-indigo-600 active:bg-indigo-700"}`}
					>
						{editingMessage ? (
							<Pencil className="h-4 w-4" aria-hidden="true" />
						) : (
							<Send className="h-4 w-4" aria-hidden="true" />
						)}
					</button>
				</div>
			</form>
		</div>
	);
}
