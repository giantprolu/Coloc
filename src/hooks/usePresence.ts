"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Member, PresenceStatus } from "@/types";

export function usePresence(colocationId: string) {
  const [members, setMembers] = useState<Member[]>([]);
  const supabase = createClient();

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
      .channel(`presence-${colocationId}`)
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

    return () => {
      supabase.removeChannel(channel);
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
  };

  return { members, updatePresence };
}
