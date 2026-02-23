"use server";

import { createClient } from "@supabase/supabase-js";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * S'assure que le canal général existe pour une colocation.
 * Retourne le canal (existant ou nouvellement créé).
 */
export async function ensureGeneralChannel(colocationId: string) {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("chat_channels")
    .select("*")
    .eq("colocation_id", colocationId)
    .eq("type", "general")
    .single();

  if (existing) return existing;

  const { data: created } = await admin
    .from("chat_channels")
    .insert({ colocation_id: colocationId, name: "Général", type: "general" })
    .select("*")
    .single();

  return created;
}
