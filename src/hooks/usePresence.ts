"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Member, PresenceStatus } from "@/types";

export function usePresence(colocationId: string) {
  const [members, setMembers] = useState<Member[]>([]);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const loadMembers = async () => {
      const { data } = await supabase
        .from("members")
        .select("*")
        .eq("colocation_id", colocationId);

      if (data) setMembers(data as Member[]);
    };

    loadMembers();

    const channel = supabase
      .channel(`coloc-presence:${colocationId}`)
      // Broadcast — mécanisme principal (pas de config Supabase requise)
      .on(
        "broadcast",
        { event: "presence_update" },
        ({
          payload,
        }: {
          payload: {
            memberId: string;
            status: PresenceStatus;
            returnDate: string | null;
          };
        }) => {
          setMembers((prev) =>
            prev.map((m) =>
              m.id === payload.memberId
                ? {
                    ...m,
                    presence_status: payload.status,
                    presence_return_date: payload.returnDate,
                  }
                : m
            )
          );
        }
      )
      // postgres_changes — backup si replication activée
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "members",
          filter: `colocation_id=eq.${colocationId}`,
        },
        (payload) => {
          setMembers((prev) =>
            prev.map((m) =>
              m.id === (payload.new as Member).id ? (payload.new as Member) : m
            )
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [colocationId]);

  const updatePresence = async (
    memberId: string,
    status: PresenceStatus,
    returnDate?: string
  ) => {
    const { error } = await supabase
      .from("members")
      .update({
        presence_status: status,
        presence_return_date: returnDate || null,
      })
      .eq("id", memberId);

    if (error) throw error;

    // Mise à jour locale immédiate
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? {
              ...m,
              presence_status: status,
              presence_return_date: returnDate || null,
            }
          : m
      )
    );

    // Broadcast aux autres clients
    await channelRef.current?.send({
      type: "broadcast",
      event: "presence_update",
      payload: { memberId, status, returnDate: returnDate || null },
    });
  };

  return { members, updatePresence };
}
