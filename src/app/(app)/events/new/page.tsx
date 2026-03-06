import { redirect } from "next/navigation";
import { CreateEventForm } from "@/components/events/CreateEventForm";
import { createClient } from "@/lib/supabase/server";

export default async function NewEventPage() {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect("/login");

	const { data: member } = await supabase
		.from("members")
		.select("*, colocation:colocations(*)")
		.eq("user_id", user.id)
		.single();

	if (!member) redirect("/onboarding");

	// Récupère les espaces disponibles
	const { data: spaces } = await supabase
		.from("spaces")
		.select("*")
		.eq("colocation_id", member.colocation_id);

	// Récupère les règles de la coloc
	const { data: rules } = await supabase
		.from("coloc_rules")
		.select("*")
		.eq("colocation_id", member.colocation_id);

	return (
		<div className="p-4">
			<div className="mb-6">
				<h1 className="text-xl font-bold text-gray-900">Nouvel événement</h1>
				<p className="text-sm text-gray-500 mt-1">
					Prévenez vos colocataires de vos plans
				</p>
			</div>
			<CreateEventForm
				memberId={member.id}
				colocationId={member.colocation_id}
				spaces={spaces || []}
				rules={rules || []}
			/>
		</div>
	);
}
