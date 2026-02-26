"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export async function resetPasswordForEmail(email: string) {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") || headersList.get("referer")?.replace(/\/forgot-password.*/, "") || "";

  console.log("[forgot-password] Sending reset email to:", email);
  console.log("[forgot-password] Redirect URL:", `${origin}/auth/callback?next=/reset-password`);

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    console.error("[forgot-password] Error:", error.message, error);
    return { error: error.message };
  }

  console.log("[forgot-password] Success, response:", JSON.stringify(data));
  return { error: null };
}
