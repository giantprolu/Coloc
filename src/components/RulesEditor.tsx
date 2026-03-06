"use client";

import { Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

interface RulesEditorProps {
	colocationId: string;
	initialContent: string;
}

export function RulesEditor({
	colocationId,
	initialContent,
}: RulesEditorProps) {
	const supabase = createClient();
	const [content, setContent] = useState(initialContent);
	const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
		"idle",
	);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const save = useCallback(
		async (text: string) => {
			setSaveStatus("saving");
			try {
				const { error } = await supabase.from("coloc_rules").upsert(
					{
						colocation_id: colocationId,
						rule_key: "notepad",
						rule_value: { content: text },
						updated_at: new Date().toISOString(),
					},
					{ onConflict: "colocation_id,rule_key" },
				);
				if (error) throw error;
				setSaveStatus("saved");
			} catch {
				setSaveStatus("idle");
				toast.error("Impossible de sauvegarder");
			}
		},
		[colocationId, supabase],
	);

	const handleChange = (text: string) => {
		setContent(text);
		setSaveStatus("idle");
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => save(text), 1000);
	};

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, []);

	return (
		<Card>
			<CardContent className="pt-4">
				<Textarea
					value={content}
					onChange={(e) => handleChange(e.target.value)}
					placeholder="Écrivez ici les règles de la coloc...&#10;&#10;Exemples :&#10;- Heures silencieuses : 23h → 8h en semaine&#10;- Maximum 10 invités&#10;- Prévenir 48h à l'avance pour les soirées"
					className="min-h-[300px] resize-y text-sm leading-relaxed"
				/>
				<div className="mt-2 flex items-center justify-end gap-1 text-xs text-gray-400 h-5">
					{saveStatus === "saving" && <span>Sauvegarde...</span>}
					{saveStatus === "saved" && (
						<>
							<Check className="h-3 w-3 text-green-500" />
							<span className="text-green-600">Sauvegardé</span>
						</>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
