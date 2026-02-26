export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { RealtimeRefresher } from "@/components/RealtimeRefresher";
import { Toaster } from "@/components/ui/sonner";
import { PasswordBanner } from "@/components/PasswordBanner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Vérifie que l'utilisateur a un profil membre
  const { data: member } = await supabase
    .from("members")
    .select("id, colocation_id")
    .eq("user_id", user.id)
    .single();

  if (!member) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Lien d'évitement — RGAA critère 12.7 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Aller au contenu principal
      </a>
      {/* Écoute les broadcasts de la coloc pour rafraîchir l'UI en temps réel */}
      <RealtimeRefresher colocationId={member.colocation_id} />
      <PasswordBanner />
      <main id="main-content" className="mx-auto max-w-md pb-20">{children}</main>
      <BottomNav />
      <Toaster position="top-center" richColors />
    </div>
  );
}
