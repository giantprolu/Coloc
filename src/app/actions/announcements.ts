"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Marque une annonce comme "faite" en la faisant expirer immédiatement.
 */
export async function markAnnouncementDone(announcementId: string) {
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

  const admin = createAdminClient();

  // Vérifie que l'annonce appartient à la colocation
  const { data: announcement } = await admin
    .from("announcements")
    .select("id, colocation_id")
    .eq("id", announcementId)
    .single();

  if (!announcement || announcement.colocation_id !== member.colocation_id) {
    throw new Error("Annonce introuvable");
  }

  // Fait expirer l'annonce immédiatement
  const { error } = await admin
    .from("announcements")
    .update({ expires_at: new Date().toISOString() })
    .eq("id", announcementId);

  if (error) throw new Error("Impossible de marquer comme fait");

  revalidatePath("/announcements");
  revalidatePath("/dashboard");
}

/**
 * Supprime le compte utilisateur : membre + auth user.
 */
export async function deleteAccount() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const admin = createAdminClient();

  // Supprime le membre (les cascades DB géreront les dépendances)
  await admin.from("members").delete().eq("user_id", user.id);

  // Supprime l'utilisateur auth
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error("Delete user error:", error);
    throw new Error("Impossible de supprimer le compte");
  }
}
