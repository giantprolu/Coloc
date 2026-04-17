"use client";

import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { toggleFiretruckClickReaction } from "@/app/actions/firetruck";
import { FiretruckClickBubble } from "@/components/pompier/FiretruckClickBubble";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FiretruckFeedItem } from "@/types";

interface FiretruckFeedProps {
	items: FiretruckFeedItem[];
}

export function FiretruckFeed({ items }: FiretruckFeedProps) {
	const [isOpen, setIsOpen] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);

	// Auto-scroll au dernier message quand le feed est ouvert
	useEffect(() => {
		if (isOpen && scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [isOpen, items.length]);

	const handleReaction = async (clickId: string, emoji: string) => {
		try {
			await toggleFiretruckClickReaction(clickId, emoji);
		} catch {
			toast.error("Impossible de réagir");
		}
	};

	return (
		<Card className="border-red-100">
			<CardHeader
				className="pb-2 cursor-pointer select-none"
				onClick={() => setIsOpen((v) => !v)}
			>
				<CardTitle className="flex items-center justify-between text-sm">
					<span className="flex items-center gap-2">
						<MessageSquare className="h-4 w-4 text-red-500" />
						Activité
						{items.length > 0 && (
							<span className="text-xs font-normal text-gray-400">
								({items.length})
							</span>
						)}
					</span>
					{isOpen ? (
						<ChevronUp className="h-4 w-4 text-gray-400" />
					) : (
						<ChevronDown className="h-4 w-4 text-gray-400" />
					)}
				</CardTitle>
			</CardHeader>

			{isOpen && (
				<CardContent className="p-0">
					{items.length === 0 ? (
						<div className="text-center py-8 px-4">
							<p className="text-sm text-gray-400">
								Aucune activité pour le moment
							</p>
							<p className="text-xs text-gray-300 mt-1">
								Appuie sur le bouton pour commencer !
							</p>
						</div>
					) : (
						<div
							ref={scrollRef}
							className="max-h-[400px] overflow-y-auto px-4 py-3 space-y-3"
						>
							{items.map((item, index) => {
								const prev = index > 0 ? items[index - 1] : null;
								const showName =
									!prev ||
									prev.displayName !== item.displayName ||
									prev.isOwn !== item.isOwn;

								return (
									<FiretruckClickBubble
										key={item.id}
										item={item}
										showName={showName}
										onReaction={handleReaction}
									/>
								);
							})}
						</div>
					)}
				</CardContent>
			)}
		</Card>
	);
}
