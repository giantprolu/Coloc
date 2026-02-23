"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ColocRule } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Lock } from "lucide-react";

interface RuleDefinition {
  key: string;
  label: string;
  description?: string;
  type: "number" | "time";
  defaultValue: number | { start: number; end: number };
}

interface RulesEditorProps {
  colocationId: string;
  memberId: string;
  isAdmin: boolean;
  ruleDefinitions: RuleDefinition[];
  currentRules: ColocRule[];
}

export function RulesEditor({
  colocationId,
  memberId,
  isAdmin,
  ruleDefinitions,
  currentRules,
}: RulesEditorProps) {
  const supabase = createClient();

  const getRuleValue = (key: string, def: RuleDefinition) => {
    const rule = currentRules.find((r) => r.rule_key === key);
    return rule ? rule.rule_value : def.defaultValue;
  };

  const [values, setValues] = useState<Record<string, unknown>>(
    Object.fromEntries(
      ruleDefinitions.map((def) => [def.key, getRuleValue(def.key, def)])
    )
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (key: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("coloc_rules")
        .upsert(
          {
            colocation_id: colocationId,
            rule_key: key,
            rule_value: values[key],
            updated_at: new Date().toISOString(),
          },
          { onConflict: "colocation_id,rule_key" }
        );

      if (error) throw error;
      toast.success("Règle mise à jour !");
    } catch {
      toast.error("Impossible de sauvegarder la règle");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {ruleDefinitions.map((def) => {
        const value = values[def.key];

        return (
          <Card key={def.key}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm">
                <span>{def.label}</span>
                {!isAdmin && <Lock className="h-3 w-3 text-gray-400" />}
              </CardTitle>
              {def.description && (
                <p className="text-xs text-gray-500">{def.description}</p>
              )}
            </CardHeader>
            <CardContent>
              {def.type === "number" && (
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={value as number}
                    onChange={(e) =>
                      setValues((v) => ({
                        ...v,
                        [def.key]: parseInt(e.target.value) || 0,
                      }))
                    }
                    disabled={!isAdmin}
                    className="w-24"
                  />
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSave(def.key)}
                      disabled={isSaving}
                    >
                      Sauver
                    </Button>
                  )}
                </div>
              )}

              {def.type === "time" && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Début :</span>
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      value={(value as { start: number; end: number }).start}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          [def.key]: {
                            ...(v[def.key] as { start: number; end: number }),
                            start: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                      disabled={!isAdmin}
                      className="w-16 text-center"
                    />
                    <span className="text-xs text-gray-500">h</span>
                  </div>
                  <span className="text-gray-400">→</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Fin :</span>
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      value={(value as { start: number; end: number }).end}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          [def.key]: {
                            ...(v[def.key] as { start: number; end: number }),
                            end: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                      disabled={!isAdmin}
                      className="w-16 text-center"
                    />
                    <span className="text-xs text-gray-500">h</span>
                  </div>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSave(def.key)}
                      disabled={isSaving}
                    >
                      Sauver
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
