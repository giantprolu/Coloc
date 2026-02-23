import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { CopyInviteCode } from "@/components/CopyInviteCode";
import { MemberRoleButton } from "@/components/MemberRoleButton";
import { ArrowLeft, Users, MapPin, Shield } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PRESENCE_LABELS } from "@/types";

export default async function ColocSettingsPage() {
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

  const coloc = member.colocation as { id: string; name: string; invite_code: string } | null;
  const isAdmin = member.role === "admin";

  const { data: members } = await supabase
    .from("members")
    .select("*")
    .eq("colocation_id", member.colocation_id)
    .order("role", { ascending: false });

  const { data: spaces } = await supabase
    .from("spaces")
    .select("*")
    .eq("colocation_id", member.colocation_id);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3 pt-2">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Gestion de la coloc</h1>
      </div>

      {/* Infos coloc */}
      {coloc && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{coloc.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Code d&apos;invitation</p>
                <p className="font-mono text-2xl font-bold tracking-widest text-indigo-600">
                  {coloc.invite_code}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Partagez ce code pour inviter vos colocataires
                </p>
              </div>
              <CopyInviteCode code={coloc.invite_code} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Membres */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            Membres ({members?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members?.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={m.avatar_url || undefined} />
                <AvatarFallback className="text-sm bg-indigo-100 text-indigo-700">
                  {getInitials(m.display_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {m.display_name}
                    {m.id === member.id && (
                      <span className="text-gray-400 font-normal"> (moi)</span>
                    )}
                  </p>
                  {m.role === "admin" && (
                    <Shield className="h-3 w-3 text-indigo-600 flex-shrink-0" />
                  )}
                </div>
                <div className="flex gap-2 text-xs text-gray-500">
                  {m.room && <span>{m.room}</span>}
                  <span>
                    {PRESENCE_LABELS[m.presence_status as keyof typeof PRESENCE_LABELS]}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs capitalize">
                  {m.role === "admin" ? "Admin" : "Membre"}
                </Badge>
                {isAdmin && m.id !== member.id && (
                  <MemberRoleButton
                    memberId={m.id}
                    currentRole={m.role}
                    memberName={m.display_name}
                  />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Espaces */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4" />
            Espaces ({spaces?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {spaces?.map((space) => (
              <Badge key={space.id} variant="secondary" className="text-sm py-1">
                {space.icon} {space.name}
              </Badge>
            ))}
          </div>
          {isAdmin && (
            <p className="text-xs text-gray-400 mt-3">
              Fonctionnalité d&apos;ajout d&apos;espaces à venir
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
