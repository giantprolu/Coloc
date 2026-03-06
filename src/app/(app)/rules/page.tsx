import { BookOpen } from "lucide-react";
import { redirect } from "next/navigation";
import { RulesEditor } from "@/components/RulesEditor";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function RulesPage() {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect("/login");

	const { data: member } = await supabase
		.from("members")
		.select("id, colocation_id, role")
		.eq("user_id", user.id)
		.single();

	if (!member) redirect("/onboarding");

	const { data: notepadRule } = await supabase
		.from("coloc_rules")
		.select("*")
		.eq("colocation_id", member.colocation_id)
		.eq("rule_key", "notepad")
		.single();

	const initialContent =
		(notepadRule?.rule_value as { content?: string })?.content ?? "";

	return (
		<div className="space-y-4 p-4">
			<div className="pt-2">
				<h1 className="text-xl font-bold text-gray-900">Règles de la coloc</h1>
				<p className="text-sm text-gray-500">
					Un bloc-notes partagé pour les règles de vie commune
				</p>
			</div>

			<Card className="border-amber-100 bg-amber-50">
				<CardContent className="pt-3">
					<div className="flex items-start gap-2">
						<BookOpen className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
						<p className="text-sm text-amber-800">
							Tous les colocataires peuvent modifier ce bloc-notes. Les
							changements sont sauvegardés automatiquement.
						</p>
					</div>
				</CardContent>
			</Card>

			<RulesEditor
				colocationId={member.colocation_id}
				initialContent={initialContent}
			/>
		</div>
	);
}
