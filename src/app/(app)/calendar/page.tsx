import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CalendarView } from "@/components/CalendarView";
import { CleanupEventsButton } from "@/components/events/CleanupEventsButton";

export default async function CalendarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("members")
    .select("id, colocation_id, role")
    .eq("user_id", user.id)
    .single();

  if (!member) redirect("/onboarding");

  // Récupère tous les événements du mois courant et des 2 mois suivants
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfRange = new Date(startOfMonth);
  endOfRange.setMonth(endOfRange.getMonth() + 3);

  const { data: events } = await supabase
    .from("events")
    .select(`
      *,
      creator:members!events_created_by_fkey(display_name),
      reactions:event_reactions(reaction)
    `)
    .eq("colocation_id", member.colocation_id)
    .neq("status", "cancelled")
    .gte("start_at", startOfMonth.toISOString())
    .lte("start_at", endOfRange.toISOString())
    .order("start_at", { ascending: true });

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 pt-2">
        <h1 className="text-xl font-bold text-gray-900">Calendrier</h1>
        {member.role === "admin" && (
          <CleanupEventsButton colocationId={member.colocation_id} />
        )}
      </div>
      <CalendarView events={events || []} memberId={member.id} />
    </div>
  );
}
