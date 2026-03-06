"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleEmergencyPermission } from "@/app/actions/emergency";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { getInitials } from "@/lib/utils";
import type { Member } from "@/types";

interface EmergencyPermissionsManagerProps {
	members: Member[];
	permittedMemberIds: string[];
}

export function EmergencyPermissionsManager({
	members,
	permittedMemberIds,
}: EmergencyPermissionsManagerProps) {
	const [permitted, setPermitted] = useState<Set<string>>(
		new Set(permittedMemberIds),
	);
	const [isPending, startTransition] = useTransition();

	const handleToggle = (memberId: string) => {
		startTransition(async () => {
			try {
				const result = await toggleEmergencyPermission(memberId);
				setPermitted((prev) => {
					const next = new Set(prev);
					if (result.action === "granted") {
						next.add(memberId);
					} else {
						next.delete(memberId);
					}
					return next;
				});
			} catch {
				toast.error("Impossible de modifier la permission");
			}
		});
	};

	return (
		<div className="space-y-3">
			<p className="text-xs text-gray-500">
				Les membres autorisés peuvent envoyer une alerte d&apos;urgence à toute
				la coloc depuis le chat.
			</p>
			{members.map((m) => (
				<div key={m.id} className="flex items-center gap-3">
					<Avatar className="h-8 w-8">
						<AvatarImage src={m.avatar_url || undefined} />
						<AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
							{getInitials(m.display_name)}
						</AvatarFallback>
					</Avatar>
					<span className="flex-1 text-sm text-gray-900 truncate">
						{m.display_name}
					</span>
					<Switch
						checked={permitted.has(m.id)}
						onCheckedChange={() => handleToggle(m.id)}
						disabled={isPending}
					/>
				</div>
			))}
		</div>
	);
}
