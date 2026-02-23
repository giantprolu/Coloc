"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { leaveColocation } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DoorOpen } from "lucide-react";
import { toast } from "sonner";

export function LeaveColocButton() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLeave = async () => {
    setIsLoading(true);
    try {
      await leaveColocation();
      toast.success("Vous avez quitté la colocation");
      router.push("/onboarding");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
        onClick={() => setOpen(true)}
      >
        <DoorOpen className="mr-2 h-4 w-4" />
        Quitter la colocation
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quitter la colocation</DialogTitle>
            <DialogDescription>
              Vous serez retiré de la colocation. Vos messages et réactions
              resteront visibles mais vous ne pourrez plus accéder à l&apos;app
              tant que vous n&apos;aurez pas rejoint une nouvelle colocation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleLeave}
              disabled={isLoading}
            >
              {isLoading ? "Départ..." : "Quitter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
