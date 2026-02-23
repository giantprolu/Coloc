"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

interface DeleteEventButtonProps {
  eventId: string;
  colocationId: string;
}

export function DeleteEventButton({ eventId, colocationId }: DeleteEventButtonProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Canal pour broadcaster la suppression aux autres utilisateurs
  useEffect(() => {
    const channel = supabase
      .channel(`coloc-refresh:${colocationId}`)
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [colocationId, supabase]);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: "cancelled" })
        .eq("id", eventId);

      if (error) throw error;

      // Broadcast : les autres utilisateurs verront la suppression immédiatement
      await channelRef.current?.send({
        type: "broadcast",
        event: "refresh",
        payload: {},
      });

      toast.success("Événement annulé");
      router.push("/calendar");
    } catch {
      toast.error("Impossible d'annuler l'événement");
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler l&apos;événement</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir annuler cet événement ? Tous les
              colocataires seront notifiés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Non, garder
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? "Annulation..." : "Oui, annuler"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
