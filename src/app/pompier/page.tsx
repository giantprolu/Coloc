import { redirect } from "next/navigation";
import { FireTruckButton } from "@/components/FireTruckButton";
import { FiretruckStats } from "@/components/firetruck/FiretruckStats";
import { createClient } from "@/lib/supabase/server";

export default async function PompierPage() {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect("/login?next=/pompier");

	const { data: pompierUser } = await supabase
		.from("pompier_users")
		.select("*, colocation:colocations(name)")
		.eq("user_id", user.id)
		.single();

	if (!pompierUser) redirect("/pompier/onboarding");

	const coloc = pompierUser.colocation as { name: string } | null;

	return (
		<div className="space-y-4 p-4">
			{/* En-tête */}
			<div className="flex items-center justify-between pt-2">
				<div>
					<h2 className="text-xl font-bold text-gray-900">
						Salut, {pompierUser.display_name} 👋
					</h2>
					{coloc && (
						<p className="text-sm text-gray-500">{coloc.name}</p>
					)}
				</div>
				<FireTruckButton colocationId={pompierUser.colocation_id} isPompier pompierUserId={pompierUser.id} />
			</div>

			{/* Stats */}
			<FiretruckStats colocationId={pompierUser.colocation_id} />
		</div>
	);
}
