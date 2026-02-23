import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  User,
  Home,
  Bell,
  Megaphone,
  ChevronRight,
  Copy,
  LogOut,
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/LogoutButton";
import { CopyInviteCode } from "@/components/CopyInviteCode";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("members")
    .select("*, colocation:colocations(*)")
    .eq("user_id", user.id)
    .single();

  if (!member) redirect("/onboarding");

  const coloc = member.colocation as { name: string; invite_code: string } | null;

  const settingsLinks = [
    {
      href: "/settings/coloc",
      icon: Home,
      label: "Gestion de la colocation",
      description: "Membres, espaces, code d'invitation",
    },
    {
      href: "/settings/notifications",
      icon: Bell,
      label: "Notifications",
      description: "Préférences de notification",
    },
    {
      href: "/announcements",
      icon: Megaphone,
      label: "Annonces",
      description: "Messages courts pour toute la coloc",
    },
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-gray-900">Paramètres</h1>
      </div>

      {/* Profil */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={member.avatar_url || undefined} />
              <AvatarFallback className="text-lg bg-indigo-100 text-indigo-700">
                {getInitials(member.display_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">
                  {member.display_name}
                </p>
                {member.role === "admin" && (
                  <Badge variant="secondary" className="text-xs">
                    Admin
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">{user.email}</p>
              {member.room && (
                <p className="text-xs text-gray-400 mt-0.5">{member.room}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code d'invitation */}
      {coloc && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              {coloc.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Code d&apos;invitation</p>
                <p className="font-mono text-xl font-bold tracking-widest text-indigo-600">
                  {coloc.invite_code}
                </p>
              </div>
              <CopyInviteCode code={coloc.invite_code} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liens paramètres */}
      <Card>
        <CardContent className="p-0">
          {settingsLinks.map((link, idx) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors ${
                  idx > 0 ? "border-t" : ""
                }`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                  <Icon className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {link.label}
                  </p>
                  <p className="text-xs text-gray-500">{link.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </Link>
            );
          })}
        </CardContent>
      </Card>

      {/* Déconnexion */}
      <LogoutButton />
    </div>
  );
}
