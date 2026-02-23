"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";

export function CompleteChoreButton({ assignmentId }: { assignmentId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("chore_assignments")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq("id", assignmentId);

      if (error) throw error;
      toast.success("Tâche marquée comme complétée ! 🎉");
      window.location.reload();
    } catch {
      toast.error("Impossible de marquer la tâche");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleComplete}
      disabled={isLoading}
      className="border-green-300 text-green-700 hover:bg-green-50"
    >
      <CheckCircle className="mr-1 h-4 w-4" />
      Terminé
    </Button>
  );
}
