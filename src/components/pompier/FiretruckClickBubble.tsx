"use client";

import { Smile } from "lucide-react";
import { useState } from "react";
import { cn, formatTime } from "@/lib/utils";
import type { FiretruckFeedItem } from "@/types";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "💀"];

const LOCATION_LABEL: Record<string, string> = {
	domicile: "🏠",
	exterieur: "🌍",
};

interface FiretruckClickBubbleProps {
	item: FiretruckFeedItem;
	showName: boolean;
	onReaction: (clickId: string, emoji: string) => void;
}

export function FiretruckClickBubble({
	item,
	showName,
	onReaction,
}: FiretruckClickBubbleProps) {
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);

	return (
		<div
			className={cn(
				"flex items-start gap-2",
				item.isOwn ? "flex-row-reverse" : "flex-row",
			)}
		>
			{/* Avatar placeholder */}
			{!item.isOwn && (
				<div className={cn("w-7 flex-shrink-0", showName && "mt-5")}>
					{showName && (
						<div className="h-7 w-7 rounded-full bg-red-100 flex items-center justify-center text-xs font-medium text-red-700">
							{item.displayName.charAt(0).toUpperCase()}
						</div>
					)}
				</div>
			)}

			<div
				className={cn(
					"max-w-[75%] space-y-1",
					item.isOwn ? "items-end" : "items-start",
				)}
			>
				{/* Nom */}
				{showName && !item.isOwn && (
					<p className="text-xs font-medium text-gray-500 ml-1">
						{item.displayName}
					</p>
				)}

				{/* Bulle */}
				<div className="relative">
					<div
						className={cn(
							"rounded-2xl px-3 py-2 text-sm select-none",
							item.isOwn
								? "bg-red-600 text-white rounded-br-sm"
								: "bg-white text-gray-900 border shadow-sm rounded-bl-sm",
						)}
					>
						<span className="font-medium">{item.displayName}</span>
						<span className={item.isOwn ? " text-red-100" : " text-gray-500"}>
							{item.locationType ? ` ${LOCATION_LABEL[item.locationType]}` : ""} a ken !
						</span>
						<div className="mt-0.5">
							{"⭐".repeat(item.rating)}
						</div>
						{item.description && (
							<p
								className={cn(
									"mt-1 text-xs italic",
									item.isOwn ? "text-red-200" : "text-gray-400",
								)}
							>
								{item.description}
							</p>
						)}
					</div>

					{/* Bouton réaction */}
					<div
						className={cn(
							"flex items-center gap-1 mt-0.5",
							item.isOwn ? "justify-end" : "justify-start",
						)}
					>
						<button
							type="button"
							onClick={() => setShowEmojiPicker((v) => !v)}
							aria-label="Réagir"
							className="p-1 rounded-full text-gray-300 active:bg-gray-100 active:text-gray-500"
						>
							<Smile className="h-3.5 w-3.5" />
						</button>
					</div>

					{/* Emoji picker */}
					{showEmojiPicker && (
						<div
							className={cn(
								"absolute z-20 flex gap-1 bg-white border shadow-lg rounded-full px-2 py-1 mt-1",
								item.isOwn ? "right-0" : "left-0",
							)}
						>
							{QUICK_EMOJIS.map((emoji) => (
								<button
									key={emoji}
									type="button"
									onClick={() => {
										onReaction(item.id, emoji);
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

				{/* Réactions */}
				{item.reactions.length > 0 && (
					<div
						className={cn(
							"flex flex-wrap gap-1",
							item.isOwn ? "justify-end" : "justify-start",
						)}
					>
						{item.reactions.map((r) => (
							<button
								key={r.emoji}
								type="button"
								onClick={() => onReaction(item.id, r.emoji)}
								title={r.names.join(", ")}
								className={cn(
									"inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs border transition-colors",
									r.hasOwn
										? "bg-red-50 border-red-200 text-red-700"
										: "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100",
								)}
							>
								<span>{r.emoji}</span>
								{r.count > 1 && <span>{r.count}</span>}
							</button>
						))}
					</div>
				)}

				{/* Heure */}
				<p
					className={cn(
						"text-[10px] text-gray-400 leading-tight",
						item.isOwn ? "text-right mr-1" : "ml-1",
					)}
				>
					{formatTime(item.clickedAt)}
				</p>
			</div>
		</div>
	);
}
