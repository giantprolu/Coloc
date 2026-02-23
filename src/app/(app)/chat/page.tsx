import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ensureGeneralChannel } from "@/app/actions/chat";

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

  return (
    <ChatWindow
      channel={channel}
      currentMember={member}
      colocationId={member.colocation_id}
    />
  );
}
