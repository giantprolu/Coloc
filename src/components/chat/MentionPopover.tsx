"use client";

import { Users } from "lucide-react";
import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import type { Member } from "@/types";

export const MENTION_EVERYONE_ID = "__everyone__";
export const MENTION_EVERYONE_LABEL = "toutlemonde";

interface MentionEntry {
	id: string;
	display_name: string;
	avatar_url?: string | null;
	isEveryone?: boolean;
}

interface MentionPopoverProps {
	members: Member[];
	selectedIndex: number;
	onSelect: (entry: MentionEntry) => void;
	onClose: () => void;
	query?: string;
}

export function MentionPopover({
	members,
	selectedIndex,
	onSelect,
	query = "",
}: MentionPopoverProps) {
	const listRef = useRef<HTMLDivElement>(null);

	// Show "Tout le monde" only if query matches
	const showEveryone =
		!query ||
		MENTION_EVERYONE_LABEL.includes(query.toLowerCase()) ||
		"tout le monde".includes(query.toLowerCase());

	// Build entries: "Tout le monde" first (if matching), then individual members
	const entries: MentionEntry[] = [
		...(showEveryone
			? [
					{
						id: MENTION_EVERYONE_ID,
						display_name: MENTION_EVERYONE_LABEL,
						isEveryone: true,
					},
				]
			: []),
		...members,
	];

	// Scroll selected item into view
	useEffect(() => {
		const list = listRef.current;
		if (!list) return;
		const selected = list.children[selectedIndex] as HTMLElement;
		if (selected) {
			selected.scrollIntoView({ block: "nearest" });
		}
	}, [selectedIndex]);

	if (entries.length === 0) return null;

	return (
		<div
			ref={listRef}
			className="mb-2 max-h-40 overflow-y-auto rounded-lg border bg-white shadow-lg"
			role="listbox"
			aria-label="Mentionner un membre"
		>
			{entries.map((entry, idx) => (
				<button
					key={entry.id}
					type="button"
					role="option"
					aria-selected={idx === selectedIndex}
					className={cn(
						"flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
						idx === selectedIndex
							? "bg-indigo-50 text-indigo-700"
							: "text-gray-700 hover:bg-gray-50",
					)}
					onMouseDown={(e) => {
						e.preventDefault(); // Prevent textarea blur
						onSelect(entry);
					}}
				>
					{entry.isEveryone ? (
						<div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100">
							<Users className="h-3.5 w-3.5 text-indigo-600" />
						</div>
					) : (
						<Avatar className="h-6 w-6">
							<AvatarImage src={entry.avatar_url || undefined} />
							<AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">
								{getInitials(entry.display_name)}
							</AvatarFallback>
						</Avatar>
					)}
					<span className="truncate">
						{entry.isEveryone ? "Tout le monde" : entry.display_name}
					</span>
				</button>
			))}
		</div>
	);
}
