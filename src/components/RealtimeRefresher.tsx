"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Composant invisible qui écoute le canal de broadcast de la coloc
 * ET les changements postgres (membres, événements, annonces)
 * et déclenche un router.refresh() pour mettre à jour la page en temps réel.
 * Permet aux autres utilisateurs de voir les mises à jour (présence,
 * suppression d'événement, etc.) sans recharger manuellement la page.
 */
export function RealtimeRefresher({ colocationId }: { colocationId: string }) {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    // Debounce les refreshes pour éviter les rafales
    const debouncedRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        router.refresh();
      }, 300);
    };

    const channel = supabase
      .channel(`coloc-refresh:${colocationId}`)
      // Broadcast — mécanisme principal (rapide, pas de config)
      .on("broadcast", { event: "refresh" }, () => {
        debouncedRefresh();
      })
      // postgres_changes — backup pour les changements de présence
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "members",
          filter: `colocation_id=eq.${colocationId}`,
        },
        () => {
          debouncedRefresh();
        }
      )
      // postgres_changes — backup pour les annonces
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
          filter: `colocation_id=eq.${colocationId}`,
        },
        () => {
          debouncedRefresh();
        }
      )
      .subscribe();

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      supabase.removeChannel(channel);
    };
  }, [colocationId, router, supabase]);

  return null;
}
