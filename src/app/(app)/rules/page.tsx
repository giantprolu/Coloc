import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RulesEditor } from "@/components/RulesEditor";
import { BookOpen } from "lucide-react";

interface RuleDef {
  key: string;
  label: string;
  description?: string;
  type: "number" | "time";
  defaultValue: number | { start: number; end: number };
}

const DEFAULT_RULES: RuleDef[] = [
  {
    key: "quiet_hours_weekday",
    label: "Heures silencieuses (semaine)",
    description: "Après cette heure, les soirées festives afficheront un avertissement",
    type: "time",
    defaultValue: { start: 23, end: 8 },
  },
  {
    key: "quiet_hours_weekend",
    label: "Heures silencieuses (week-end)",
    type: "time",
    defaultValue: { start: 1, end: 9 },
  },
  {
    key: "max_guests_default",
    label: "Nombre maximum d'invités",
    type: "number",
    defaultValue: 10,
  },
  {
    key: "min_notice_hours",
    label: "Délai minimum de prévenance (heures)",
    type: "number",
    defaultValue: 48,
  },
];

export default async function RulesPage() {
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

  const { data: rules } = await supabase
    .from("coloc_rules")
    .select("*")
    .eq("colocation_id", member.colocation_id);

  return (
    <div className="space-y-4 p-4">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-gray-900">Règles de la coloc</h1>
        <p className="text-sm text-gray-500">
          Ces règles s&apos;appliquent à tous les événements
        </p>
      </div>

      <Card className="border-amber-100 bg-amber-50">
        <CardContent className="pt-3">
          <div className="flex items-start gap-2">
            <BookOpen className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Les avertissements s&apos;affichent automatiquement lors de la création
              d&apos;un événement qui ne respecte pas ces règles. Seuls les admins
              peuvent modifier les règles.
            </p>
          </div>
        </CardContent>
      </Card>

      <RulesEditor
        colocationId={member.colocation_id}
        memberId={member.id}
        isAdmin={member.role === "admin"}
        ruleDefinitions={DEFAULT_RULES}
        currentRules={rules || []}
      />
    </div>
  );
}
