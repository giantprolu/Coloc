"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAccount } from "@/app/actions/announcements";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (confirmation !== "SUPPRIMER") return;
    setIsLoading(true);

    try {
      await deleteAccount();
      toast.success("Compte supprimé");
      router.push("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Supprimer mon compte
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer mon compte</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Toutes vos données seront
              supprimées définitivement (messages, réactions, dépenses...).
              Tapez <strong>SUPPRIMER</strong> pour confirmer.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="Tapez SUPPRIMER"
            className="mt-2"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading || confirmation !== "SUPPRIMER"}
            >
              {isLoading ? "Suppression..." : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
