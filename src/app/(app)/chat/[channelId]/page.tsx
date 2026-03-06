import { notFound, redirect } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { createClient } from "@/lib/supabase/server";

interface ChatChannelPageProps {
	params: Promise<{ channelId: string }>;
}

export default async function ChatChannelPage({
	params,
}: ChatChannelPageProps) {
	const { channelId } = await params;
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

	const { data: channel } = await supabase
		.from("chat_channels")
		.select("*")
		.eq("id", channelId)
		.eq("colocation_id", member.colocation_id)
		.single();

	if (!channel) notFound();

	return (
		<ChatWindow
			channel={channel}
			currentMember={member}
			colocationId={member.colocation_id}
		/>
	);
}
