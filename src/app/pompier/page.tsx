import { redirect } from "next/navigation";
import { getFiretruckFeed } from "@/app/actions/firetruck";
import { FireTruckButton } from "@/components/FireTruckButton";
import { FiretruckStats } from "@/components/firetruck/FiretruckStats";
import { FiretruckFeed } from "@/components/pompier/FiretruckFeed";
import { PompierDevSection } from "@/components/pompier/PompierDevSection";
import { PompierNotificationToggle } from "@/components/pompier/PompierNotificationToggle";
import { createClient } from "@/lib/supabase/server";

export default async function PompierPage() {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect("/login?next=/pompier");

	const { data: pompierUser } = await supabase
		.from("pompier_users")
		.select("id, user_id, colocation_id, display_name")
		.eq("user_id", user.id)
		.single();

	if (!pompierUser) redirect("/pompier/onboarding");

	const feedItems = await getFiretruckFeed(pompierUser.colocation_id);

	return (
		<div className="space-y-4 p-4">
			{/* En-tete */}
			<div className="flex items-center justify-between pt-2">
				<div className="flex items-center gap-2">
					<h2 className="text-xl font-bold text-gray-900">
						Salut, {pompierUser.display_name} 👋
					</h2>
					<PompierNotificationToggle />
				</div>
				<FireTruckButton colocationId={pompierUser.colocation_id} isPompier pompierUserId={pompierUser.id} />
			</div>

			{/* Feed activité */}
			<FiretruckFeed items={feedItems} />

			{/* Stats */}
			<FiretruckStats colocationId={pompierUser.colocation_id} />

			{/* Section dev — uniquement pour l'utilisateur "test" */}
			{pompierUser.display_name.toLowerCase() === "test" && (
				<PompierDevSection />
			)}
		</div>
	);
}
