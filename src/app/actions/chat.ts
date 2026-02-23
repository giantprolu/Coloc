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
 * Vérifie l'authentification et retourne le membre.
 */
async function getAuthenticatedMember() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: member } = await supabase
    .from("members")
    .select("id, colocation_id")
    .eq("user_id", user.id)
    .single();

  if (!member) throw new Error("Membre introuvable");
  return member;
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
  const member = await getAuthenticatedMember();

  // Vérifie que le canal appartient à la colocation du membre
  const admin = createAdminClient();
  const { data: channel } = await admin
    .from("chat_channels")
    .select("id, colocation_id")
    .eq("id", channelId)
    .single();

  if (!channel || channel.colocation_id !== member.colocation_id) {
    throw new Error("Canal introuvable");
  }

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

/**
 * Récupère les messages d'un canal (bypass RLS).
 */
export async function fetchChatMessages(
  channelId: string,
  limit = 50,
  after?: string
) {
  const member = await getAuthenticatedMember();

  const admin = createAdminClient();

  // Vérifie que le canal appartient à la colocation du membre
  const { data: channel } = await admin
    .from("chat_channels")
    .select("id, colocation_id")
    .eq("id", channelId)
    .single();

  if (!channel || channel.colocation_id !== member.colocation_id) {
    throw new Error("Canal introuvable");
  }

  let query = admin
    .from("chat_messages")
    .select("*, member:members!chat_messages_member_id_fkey(id, display_name, avatar_url)")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true });

  if (after) {
    query = query.gt("created_at", after);
  } else {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Chat fetch error:", error);
    throw new Error("Impossible de charger les messages");
  }

  return data || [];
}

/**
 * Récupère un seul message par ID (bypass RLS).
 */
export async function fetchSingleMessage(messageId: string) {
  const member = await getAuthenticatedMember();
  const admin = createAdminClient();

  const { data } = await admin
    .from("chat_messages")
    .select("*, member:members!chat_messages_member_id_fkey(id, display_name, avatar_url)")
    .eq("id", messageId)
    .single();

  return data;
}
