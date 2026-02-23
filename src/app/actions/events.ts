"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Supprime (hard delete) tous les événements passés et annulés d'une colocation.
 * Réservé aux admins.
 */
export async function cleanupEvents(colocationId: string) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: member } = await supabase
    .from("members")
    .select("id, role, colocation_id")
    .eq("user_id", user.id)
    .single();

  if (!member || member.role !== "admin" || member.colocation_id !== colocationId) {
    throw new Error("Seuls les admins peuvent nettoyer les événements");
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Supprime les événements annulés
  await admin
    .from("events")
    .delete()
    .eq("colocation_id", colocationId)
    .eq("status", "cancelled");

  // Supprime les événements passés (end_at < now)
  await admin
    .from("events")
    .delete()
    .eq("colocation_id", colocationId)
    .lt("end_at", now);

  revalidatePath("/calendar");
}

/**
 * Supprime un événement spécifique (admin ou créateur).
 */
export async function deleteEvent(eventId: string) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: member } = await supabase
    .from("members")
    .select("id, role, colocation_id")
    .eq("user_id", user.id)
    .single();

  if (!member) throw new Error("Membre introuvable");

  const { data: event } = await supabase
    .from("events")
    .select("id, created_by, colocation_id")
    .eq("id", eventId)
    .single();

  if (!event || event.colocation_id !== member.colocation_id) {
    throw new Error("Événement introuvable");
  }

  const isCreator = event.created_by === member.id;
  const isAdmin = member.role === "admin";

  if (!isCreator && !isAdmin) {
    throw new Error("Vous n'avez pas la permission de supprimer cet événement");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("events")
    .update({ status: "cancelled" })
    .eq("id", eventId);

  if (error) throw new Error("Impossible de supprimer l'événement");

  revalidatePath("/calendar");
}
