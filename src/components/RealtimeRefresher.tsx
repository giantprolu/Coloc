"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Composant invisible qui écoute le canal de broadcast de la coloc
 * et déclenche un router.refresh() lorsqu'un événement "refresh" est reçu.
 * Permet aux autres utilisateurs de voir les mises à jour (présence,
 * suppression d'événement, etc.) sans recharger manuellement la page.
 */
export function RealtimeRefresher({ colocationId }: { colocationId: string }) {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`coloc-refresh:${colocationId}`)
      .on("broadcast", { event: "refresh" }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [colocationId, router, supabase]);

  return null;
}
