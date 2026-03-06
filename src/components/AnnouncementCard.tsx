"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

interface NewAnnouncementFormProps {
	memberId: string;
	colocationId: string;
}

export function NewAnnouncementForm({
	memberId,
	colocationId,
}: NewAnnouncementFormProps) {
	const [content, setContent] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();
	const supabase = createClient();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!content.trim()) return;
		setIsLoading(true);

		try {
			const { error } = await supabase.from("announcements").insert({
				colocation_id: colocationId,
				member_id: memberId,
				content: content.trim(),
			});

			if (error) throw error;

			// Notification push aux colocataires
			try {
				await fetch("/api/push/send", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						colocationId,
						type: "announcement_new",
						title: "Nouvelle annonce",
						body:
							content.trim().length > 80
								? content.trim().slice(0, 77) + "..."
								: content.trim(),
						excludeMemberId: memberId,
					}),
				});
			} catch {
				// Silently ignore push errors
			}

			setContent("");
			toast.success("Annonce publiée !");
			router.refresh();
		} catch {
			toast.error("Impossible de publier l'annonce");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex gap-2">
			<Textarea
				value={content}
				onChange={(e) => setContent(e.target.value)}
				placeholder={'ex : "Il n\'y a plus de PQ !", "Le livreur a sonné"'}
				className="flex-1 min-h-[40px] max-h-[120px] resize-none"
				rows={2}
			/>
			<Button
				type="submit"
				size="icon"
				disabled={!content.trim() || isLoading}
				className="bg-indigo-600 hover:bg-indigo-700 self-end"
			>
				<Send className="h-4 w-4" />
			</Button>
		</form>
	);
}
