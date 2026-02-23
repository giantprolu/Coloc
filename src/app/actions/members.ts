"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { UserRole } from "@/types";
import { revalidatePath } from "next/cache";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function updateMemberRole(memberId: string, newRole: UserRole) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Vérifie que l'utilisateur actuel est admin
  const { data: currentMember } = await supabase
    .from("members")
    .select("id, role, colocation_id")
    .eq("user_id", user.id)
    .single();

  if (!currentMember || currentMember.role !== "admin") {
    throw new Error("Seuls les admins peuvent changer les rôles");
  }

  // Vérifie que le membre cible est dans la même colocation
  const { data: targetMember } = await supabase
    .from("members")
    .select("id, colocation_id")
    .eq("id", memberId)
    .single();

  if (!targetMember || targetMember.colocation_id !== currentMember.colocation_id) {
    throw new Error("Membre introuvable");
  }

  // Ne pas se rétrograder soi-même
  if (memberId === currentMember.id) {
    throw new Error("Vous ne pouvez pas modifier votre propre rôle");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("members")
    .update({ role: newRole })
    .eq("id", memberId);

  if (error) throw new Error("Impossible de modifier le rôle");

  revalidatePath("/settings/coloc");
}
