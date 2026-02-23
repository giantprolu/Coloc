"use client";

import { useState } from "react";
import { updateMemberRole } from "@/app/actions/members";
import { UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, ShieldOff } from "lucide-react";
import { toast } from "sonner";

interface MemberRoleButtonProps {
  memberId: string;
  currentRole: UserRole;
  memberName: string;
}

export function MemberRoleButton({ memberId, currentRole, memberName }: MemberRoleButtonProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const newRole: UserRole = currentRole === "admin" ? "member" : "admin";
  const isPromoting = newRole === "admin";

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await updateMemberRole(memberId, newRole);
      toast.success(
        isPromoting
          ? `${memberName} est maintenant admin`
          : `${memberName} n'est plus admin`
      );
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
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => setOpen(true)}
        title={isPromoting ? "Promouvoir admin" : "Rétrograder membre"}
      >
        {isPromoting ? (
          <Shield className="h-3.5 w-3.5 text-indigo-500" />
        ) : (
          <ShieldOff className="h-3.5 w-3.5 text-gray-400" />
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isPromoting ? "Promouvoir en admin" : "Rétrograder en membre"}
            </DialogTitle>
            <DialogDescription>
              {isPromoting
                ? `${memberName} pourra gérer la colocation, modifier les rôles et supprimer des événements.`
                : `${memberName} n'aura plus les droits d'administration.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className={isPromoting ? "bg-indigo-600 hover:bg-indigo-700" : ""}
              variant={isPromoting ? "default" : "destructive"}
            >
              {isLoading ? "..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
