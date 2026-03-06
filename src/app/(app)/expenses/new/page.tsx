import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NewExpenseForm } from "@/components/expenses/NewExpenseForm";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function NewExpensePage() {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect("/login");

	const { data: member } = await supabase
		.from("members")
		.select("id, colocation_id")
		.eq("user_id", user.id)
		.single();

	if (!member) redirect("/onboarding");

	const { data: members } = await supabase
		.from("members")
		.select("id, display_name")
		.eq("colocation_id", member.colocation_id);

	const { data: events } = await supabase
		.from("events")
		.select("id, title")
		.eq("colocation_id", member.colocation_id)
		.neq("status", "cancelled")
		.order("start_at", { ascending: false })
		.limit(10);

	return (
		<div className="p-4">
			<div className="flex items-center gap-3 pt-2 mb-6">
				<Link href="/expenses">
					<Button variant="ghost" size="icon" className="h-8 w-8">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<h1 className="text-xl font-bold text-gray-900">Nouvelle dépense</h1>
			</div>

			<NewExpenseForm
				memberId={member.id}
				colocationId={member.colocation_id}
				members={members || []}
				events={events || []}
			/>
		</div>
	);
}
