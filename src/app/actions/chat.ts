"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sendPushToMany } from "@/lib/push";

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

  // Notification push aux autres membres de la coloc (exclure l'expéditeur)
  try {
    const { data: memberInfo } = await admin
      .from("members")
      .select("display_name")
      .eq("id", member.id)
      .single();

    const { data: otherMembers } = await admin
      .from("members")
      .select("id")
      .eq("colocation_id", member.colocation_id)
      .neq("id", member.id);

    if (otherMembers && otherMembers.length > 0) {
      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .in("member_id", otherMembers.map((m) => m.id));

      if (subs && subs.length > 0) {
        const senderName = memberInfo?.display_name || "Quelqu'un";
        const truncatedContent =
          content.length > 80 ? content.slice(0, 77) + "..." : content;

        const result = await sendPushToMany(
          subs.map((s) => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })),
          {
            title: `${senderName} dans le chat`,
            body: truncatedContent,
            url: `/chat/${channelId}`,
            tag: "chat_message",
          }
        );
        if (result.expiredEndpoints.length > 0) {
          await admin
            .from("push_subscriptions")
            .delete()
            .in("endpoint", result.expiredEndpoints);
        }
      }
    }
  } catch (e) {
    console.error("Erreur envoi notification chat:", e);
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

/**
 * Toggle une réaction emoji sur un message.
 * Si la réaction existe déjà → supprime, sinon → ajoute.
 */
export async function toggleMessageReaction(messageId: string, emoji: string) {
  const member = await getAuthenticatedMember();
  const admin = createAdminClient();

  // Vérifie que le message appartient à un canal de la coloc du membre
  const { data: message } = await admin
    .from("chat_messages")
    .select("id, channel_id, channel:chat_channels!chat_messages_channel_id_fkey(colocation_id)")
    .eq("id", messageId)
    .single();

  if (
    !message ||
    (message.channel as unknown as { colocation_id: string })?.colocation_id !==
      member.colocation_id
  ) {
    throw new Error("Message introuvable");
  }

  // Cherche une réaction existante
  const { data: existing } = await admin
    .from("chat_message_reactions")
    .select("id")
    .eq("message_id", messageId)
    .eq("member_id", member.id)
    .eq("emoji", emoji)
    .single();

  if (existing) {
    await admin.from("chat_message_reactions").delete().eq("id", existing.id);
    return { action: "removed" as const };
  } else {
    await admin.from("chat_message_reactions").insert({
      message_id: messageId,
      member_id: member.id,
      emoji,
    });
    return { action: "added" as const };
  }
}

/**
 * Récupère les réactions d'un ensemble de messages.
 */
export async function fetchReactionsForMessages(messageIds: string[]) {
  if (messageIds.length === 0) return [];
  const admin = createAdminClient();

  const { data } = await admin
    .from("chat_message_reactions")
    .select("*, member:members!chat_message_reactions_member_id_fkey(id, display_name)")
    .in("message_id", messageIds);

  return data || [];
}

/**
 * Supprime un message (uniquement ses propres messages).
 */
export async function deleteChatMessage(messageId: string) {
  const member = await getAuthenticatedMember();
  const admin = createAdminClient();

  const { data: message } = await admin
    .from("chat_messages")
    .select("id, member_id")
    .eq("id", messageId)
    .single();

  if (!message) throw new Error("Message introuvable");
  if (message.member_id !== member.id)
    throw new Error("Vous ne pouvez supprimer que vos propres messages");

  const { error } = await admin
    .from("chat_messages")
    .delete()
    .eq("id", messageId);

  if (error) throw new Error("Impossible de supprimer le message");
  return { success: true };
}
