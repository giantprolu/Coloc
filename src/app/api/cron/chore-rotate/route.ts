import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendPushToMany } from "@/lib/push";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Cron : rotation hebdomadaire des tâches ménagères (chaque lundi)
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Date de début de la semaine (ce lundi)
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  // Récupère toutes les colocations
  const { data: colocations } = await supabase
    .from("colocations")
    .select("id");

  let totalAssignments = 0;

  for (const coloc of colocations || []) {
    const { data: chores } = await supabase
      .from("chores")
      .select("*")
      .eq("colocation_id", coloc.id)
      .in("frequency", ["weekly"]);

    const { data: members } = await supabase
      .from("members")
      .select("id")
      .eq("colocation_id", coloc.id);

    if (!chores?.length || !members?.length) continue;

    // Vérifie les assignations de la semaine précédente pour la rotation
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekStartStr = prevWeekStart.toISOString().split("T")[0];

    const { data: prevAssignments } = await supabase
      .from("chore_assignments")
      .select("chore_id, member_id")
      .eq("week_start", prevWeekStartStr);

    // Crée les assignations de cette semaine par rotation
    const assignments = chores.map((chore, choreIndex) => {
      const prevAssignment = prevAssignments?.find(
        (a) => a.chore_id === chore.id
      );
      const prevMemberIndex = prevAssignment
        ? members.findIndex((m) => m.id === prevAssignment.member_id)
        : -1;
      const nextMemberIndex = (prevMemberIndex + 1) % members.length;

      return {
        chore_id: chore.id,
        member_id: members[nextMemberIndex].id,
        week_start: weekStartStr,
      };
    });

    const { error } = await supabase
      .from("chore_assignments")
      .upsert(assignments, { onConflict: "chore_id,member_id,week_start" });

    if (!error) {
      totalAssignments += assignments.length;

      // Notifie chaque membre de sa tâche
      for (const assignment of assignments) {
        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("member_id")
          .eq("member_id", assignment.member_id)
          .eq("chores_reminder", true)
          .single();

        if (prefs) {
          const { data: subscriptions } = await supabase
            .from("push_subscriptions")
            .select("*")
            .eq("member_id", assignment.member_id);

          const chore = chores.find((c) => c.id === assignment.chore_id);
          if (subscriptions?.length && chore) {
            await sendPushToMany(
              subscriptions.map((s) => ({
                endpoint: s.endpoint,
                p256dh: s.p256dh,
                auth: s.auth,
              })),
              {
                title: "Nouvelle tâche cette semaine",
                body: `${chore.icon || ""} ${chore.name} — Bonne chance !`,
                url: "/chores",
                tag: "chore_reminder",
              }
            );
          }
        }
      }
    }
  }

  return NextResponse.json({ success: true, assignments: totalAssignments });
}
