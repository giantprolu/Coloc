import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NotificationSettings } from "@/components/NotificationSettings";

export default async function NotificationsSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!member) redirect("/onboarding");

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("member_id", member.id)
    .single();

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3 pt-2">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
      </div>

      <NotificationSettings memberId={member.id} initialPrefs={prefs} />
    </div>
  );
}
