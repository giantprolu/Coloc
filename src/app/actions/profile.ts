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

export async function updateAvatar(formData: FormData) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!member) throw new Error("Membre introuvable");

  const file = formData.get("avatar") as File;
  if (!file || file.size === 0) throw new Error("Aucun fichier");

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const allowedExts = ["jpg", "jpeg", "png", "webp"];
  if (!allowedExts.includes(ext)) {
    throw new Error("Format non supporté. Utilisez JPG, PNG ou WebP.");
  }

  const filePath = `${member.id}.${ext}`;

  const admin = createAdminClient();

  // Convertir le File en Buffer pour l'upload serveur
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload (upsert) vers le bucket avatars
  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(filePath, buffer, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) throw new Error("Échec de l'upload : " + uploadError.message);

  // Récupère l'URL publique
  const { data: urlData } = admin.storage
    .from("avatars")
    .getPublicUrl(filePath);

  const avatarUrl = urlData.publicUrl + "?t=" + Date.now();

  // Met à jour le membre
  const { error: updateError } = await admin
    .from("members")
    .update({ avatar_url: avatarUrl })
    .eq("id", member.id);

  if (updateError) throw new Error("Impossible de mettre à jour le profil");

  revalidatePath("/settings");
  revalidatePath("/dashboard");

  return { avatarUrl };
}
