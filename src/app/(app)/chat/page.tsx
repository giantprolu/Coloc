import { redirect } from "next/navigation";
import { ensureGeneralChannel } from "@/app/actions/chat";
import { checkDevPermission } from "@/app/actions/dev";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { createClient } from "@/lib/supabase/server";

export default async function ChatPage() {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect("/login");

	const { data: member } = await supabase
		.from("members")
		.select("*")
		.eq("user_id", user.id)
		.single();

	if (!member) redirect("/onboarding");

	// Canal général — créé automatiquement s'il n'existe pas encore
	const channel = await ensureGeneralChannel(member.colocation_id);

	if (!channel) {
		return (
			<div className="flex h-[calc(100vh-80px)] items-center justify-center">
				<p className="text-gray-500">Impossible d&apos;accéder au chat</p>
			</div>
		);
	}

	// Fetch coloc members for @ mentions
	const { data: members } = await supabase
		.from("members")
		.select(
			"id, user_id, colocation_id, display_name, avatar_url, room, role, presence_status, presence_return_date, created_at",
		)
		.eq("colocation_id", member.colocation_id)
		.order("display_name");

	const hasDevAccess = await checkDevPermission(
		member.id,
		member.colocation_id,
	);

	return (
		<ChatWindow
			channel={channel}
			currentMember={member}
			colocationId={member.colocation_id}
			members={members || []}
			hasDevAccess={hasDevAccess}
		/>
	);
}
