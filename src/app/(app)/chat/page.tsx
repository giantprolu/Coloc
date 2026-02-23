import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";

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

  // Canal général de la coloc
  const { data: channel } = await supabase
    .from("chat_channels")
    .select("*")
    .eq("colocation_id", member.colocation_id)
    .eq("type", "general")
    .single();

  if (!channel) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <p className="text-gray-500">Canal de chat introuvable</p>
      </div>
    );
  }

  return (
    <ChatWindow
      channel={channel}
      currentMember={member}
      colocationId={member.colocation_id}
    />
  );
}
