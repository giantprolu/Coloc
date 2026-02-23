import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, formatDate } from "@/lib/utils";
import { CheckCircle, Circle, RotateCcw } from "lucide-react";
import { CompleteChoreButton } from "@/components/chores/CompleteChoreButton";

export default async function ChoresPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("members")
    .select("id, colocation_id, display_name")
    .eq("user_id", user.id)
    .single();

  if (!member) redirect("/onboarding");

  // Semaine courante
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const { data: assignments } = await supabase
    .from("chore_assignments")
    .select(`
      *,
      chore:chores(*),
      member:members(id, display_name)
    `)
    .eq("week_start", weekStartStr)
    .in(
      "chore_id",
      (
        await supabase
          .from("chores")
          .select("id")
          .eq("colocation_id", member.colocation_id)
      ).data?.map((c) => c.id) || []
    )
    .order("completed", { ascending: true });

  const myAssignment = assignments?.find((a) => a.member_id === member.id);

  return (
    <div className="space-y-4 p-4">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-gray-900">Tâches ménagères</h1>
        <p className="text-sm text-gray-500">
          Semaine du {formatDate(weekStart, "d MMMM")}
        </p>
      </div>

      {/* Ma tâche */}
      {myAssignment && (
        <Card className="border-indigo-200 bg-indigo-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-indigo-800">
              Ma tâche cette semaine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {myAssignment.chore?.icon || "🧹"}
                </span>
                <div>
                  <p className="font-medium text-gray-900">
                    {myAssignment.chore?.name}
                  </p>
                  {myAssignment.completed && (
                    <p className="text-xs text-green-600 font-medium">
                      ✅ Complété !
                    </p>
                  )}
                </div>
              </div>
              {!myAssignment.completed && (
                <CompleteChoreButton assignmentId={myAssignment.id} />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toutes les tâches */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <RotateCcw className="h-4 w-4" />
            Planning de la semaine
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {assignments && assignments.length > 0 ? (
            assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center gap-3 rounded-lg bg-gray-50 p-3"
              >
                <span className="text-xl">
                  {assignment.chore?.icon || "🧹"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {assignment.chore?.name}
                  </p>
                  <div className="flex items-center gap-1">
                    <Avatar className="h-4 w-4">
                      <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                        {getInitials(assignment.member?.display_name || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-gray-500">
                      {assignment.member?.display_name}
                    </span>
                  </div>
                </div>
                {assignment.completed ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300" />
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-6">
              <RotateCcw className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">
                Aucune tâche configurée pour cette semaine
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Les rotations sont gérées automatiquement chaque lundi
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
