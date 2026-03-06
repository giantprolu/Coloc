"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { PRESENCE_LABELS, type PresenceStatus } from "@/types";

interface PresenceToggleProps {
	memberId: string;
	colocationId: string;
	currentStatus: PresenceStatus;
	returnDate?: string | null;
}

export function PresenceToggle({
	memberId,
	colocationId,
	currentStatus,
	returnDate,
}: PresenceToggleProps) {
	const [status, setStatus] = useState<PresenceStatus>(currentStatus);
	const supabase = createClient();
	const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

	// Canal dédié au broadcast de présence
	useEffect(() => {
		const channel = supabase
			.channel(`coloc-refresh:${colocationId}`)
			.subscribe();
		channelRef.current = channel;
		return () => {
			supabase.removeChannel(channel);
			channelRef.current = null;
		};
	}, [colocationId, supabase]);

	const handleStatusChange = async (newStatus: PresenceStatus) => {
		const prev = status;
		setStatus(newStatus);

		const { error } = await supabase
			.from("members")
			.update({ presence_status: newStatus })
			.eq("id", memberId);

		if (error) {
			setStatus(prev);
			toast.error("Impossible de mettre à jour votre statut");
		} else {
			// Broadcast : les autres utilisateurs verront le changement via router.refresh()
			await channelRef.current?.send({
				type: "broadcast",
				event: "refresh",
				payload: {},
			});
			toast.success("Statut mis à jour");
		}
	};

	const statusOptions: PresenceStatus[] = ["home", "away_tonight", "traveling"];

	const statusColors: Record<PresenceStatus, string> = {
		home: "bg-green-100 text-green-800 border-green-200",
		away_tonight: "bg-yellow-100 text-yellow-800 border-yellow-200",
		traveling: "bg-blue-100 text-blue-800 border-blue-200",
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					className={`w-full justify-between ${statusColors[status]}`}
				>
					<span>{PRESENCE_LABELS[status]}</span>
					<ChevronDown className="h-4 w-4 opacity-50" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-56">
				{statusOptions.map((s) => (
					<DropdownMenuItem
						key={s}
						onClick={() => handleStatusChange(s)}
						className={s === status ? "bg-gray-100" : ""}
					>
						{PRESENCE_LABELS[s]}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
