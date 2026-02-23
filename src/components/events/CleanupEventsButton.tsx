"use client";

import { useState } from "react";
import { cleanupEvents } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CleanupEventsButtonProps {
  colocationId: string;
}

export function CleanupEventsButton({ colocationId }: CleanupEventsButtonProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCleanup = async () => {
    setIsLoading(true);
    try {
      await cleanupEvents(colocationId);
      toast.success("Événements nettoyés");
      router.refresh();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-red-600 border-red-200 hover:bg-red-50"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="mr-1 h-3.5 w-3.5" />
        Nettoyer
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nettoyer les événements</DialogTitle>
            <DialogDescription>
              Cela supprimera définitivement tous les événements passés et
              annulés. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleCleanup}
              disabled={isLoading}
            >
              {isLoading ? "Nettoyage..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
