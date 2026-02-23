import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatRelative } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { NewAnnouncementForm } from "@/components/AnnouncementCard";
import { AnnouncementDoneButton } from "@/components/AnnouncementDoneButton";
import { Pin, Megaphone } from "lucide-react";

export default async function AnnouncementsPage() {
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

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*, member:members(display_name, avatar_url)")
    .eq("colocation_id", member.colocation_id)
    .gt("expires_at", new Date().toISOString())
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4 p-4">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-gray-900">Annonces</h1>
        <p className="text-sm text-gray-500">Messages courts pour la coloc</p>
      </div>

      <NewAnnouncementForm
        memberId={member.id}
        colocationId={member.colocation_id}
      />

      {announcements && announcements.length > 0 ? (
        <div className="space-y-2">
          {announcements.map((announcement) => (
            <Card
              key={announcement.id}
              className={announcement.pinned ? "border-amber-200 bg-amber-50" : ""}
            >
              <CardContent className="pt-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                      {announcement.member
                        ? getInitials(announcement.member.display_name)
                        : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        {announcement.member?.display_name || "Quelqu'un"}
                      </span>
                      {announcement.pinned && (
                        <Pin className="h-3 w-3 text-amber-600" />
                      )}
                      <span className="text-xs text-gray-400 ml-auto">
                        {formatRelative(announcement.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900">{announcement.content}</p>
                  </div>
                  <AnnouncementDoneButton announcementId={announcement.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <Megaphone className="h-10 w-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500">Aucune annonce pour le moment</p>
        </div>
      )}
    </div>
  );
}
