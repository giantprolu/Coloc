"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

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

/**
 * Envoie un message dans un canal de chat.
 * Utilise le service role pour bypasser les politiques RLS.
 */
export async function sendChatMessage(
  channelId: string,
  content: string,
  replyTo?: string | null
) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Récupère le membre pour vérifier l'accès
  const { data: member } = await supabase
    .from("members")
    .select("id, colocation_id")
    .eq("user_id", user.id)
    .single();

  if (!member) throw new Error("Membre introuvable");

  // Vérifie que le canal appartient à la colocation du membre
  const { data: channel } = await supabase
    .from("chat_channels")
    .select("id, colocation_id")
    .eq("id", channelId)
    .single();

  if (!channel || channel.colocation_id !== member.colocation_id) {
    throw new Error("Canal introuvable");
  }

  // Insert avec le admin client pour bypasser RLS
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chat_messages")
    .insert({
      channel_id: channelId,
      member_id: member.id,
      content,
      reply_to: replyTo || null,
    })
    .select("id, created_at")
    .single();

  if (error) {
    console.error("Chat insert error:", error);
    throw new Error("Impossible d'envoyer le message");
  }

  return data;
}
