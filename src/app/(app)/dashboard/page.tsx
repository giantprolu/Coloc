import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatEventDate, formatRelative, getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PresenceToggle } from "@/components/PresenceToggle";
import Link from "next/link";
import {
  CalendarDays,
  MessageSquare,
  Plus,
  Bell,
  Wallet,
  BookOpen,
  Megaphone,
  Pin,
} from "lucide-react";
import { NOISE_LEVEL_LABELS, PRESENCE_LABELS } from "@/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Récupère le membre courant avec sa colocation
  const { data: member } = await supabase
    .from("members")
    .select("*, colocation:colocations(*)")
    .eq("user_id", user.id)
    .single();

  if (!member) redirect("/onboarding");

  const colocationId = member.colocation_id;

  // Récupère toutes les données en parallèle
  const [
    { data: upcomingEvents },
    { data: colocMembers },
    { data: generalChannel },
    { data: announcements },
  ] = await Promise.all([
    supabase
      .from("events")
      .select(`
        *,
        creator:members!events_created_by_fkey(*),
        spaces:event_spaces(space:spaces(*)),
        reactions:event_reactions(*)
      `)
      .eq("colocation_id", colocationId)
      .neq("status", "cancelled")
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(5),
    supabase
      .from("members")
      .select("*")
      .eq("colocation_id", colocationId)
      .order("display_name"),
    supabase
      .from("chat_channels")
      .select("id")
      .eq("colocation_id", colocationId)
      .eq("type", "general")
      .single(),
    supabase
      .from("announcements")
      .select("*, member:members(display_name)")
      .eq("colocation_id", colocationId)
      .gte("expires_at", new Date().toISOString())
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const { data: recentMessages } = generalChannel
    ? await supabase
        .from("chat_messages")
        .select("*, member:members(*)")
        .eq("channel_id", generalChannel.id)
        .eq("is_system", false)
        .order("created_at", { ascending: false })
        .limit(3)
    : { data: null };

  const coloc = member.colocation as { name: string; invite_code: string } | null;

  return (
    <div className="space-y-4 p-4">
      {/* En-tête */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Bonjour, {member.display_name} 👋
          </h1>
          <p className="text-sm text-gray-500">{coloc?.name}</p>
        </div>
        <Link href="/events/new">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="mr-1 h-4 w-4" />
            Événement
          </Button>
        </Link>
      </div>

      {/* Statut de présence */}
      <PresenceToggle
        memberId={member.id}
        colocationId={colocationId}
        currentStatus={member.presence_status}
        returnDate={member.presence_return_date}
      />

      {/* Annonces (style post-it) */}
      {announcements && announcements.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              <Megaphone className="h-4 w-4" />
              Annonces
            </h2>
            <Link
              href="/announcements"
              className="text-xs text-amber-600 hover:text-amber-800 font-medium"
            >
              Voir tout →
            </Link>
          </div>
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 shadow-sm"
            >
              <div className="flex items-start gap-2">
                {ann.pinned && (
                  <Pin className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-amber-900 whitespace-pre-line">
                    {ann.content}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    {ann.member?.display_name || "Quelqu'un"} · {formatRelative(ann.created_at)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Accès rapide */}
      <div className="grid grid-cols-3 gap-2">
        <Link href="/expenses">
          <div className="flex flex-col items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-100 p-3 hover:bg-emerald-100 transition-colors">
            <Wallet className="h-5 w-5 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">Dépenses</span>
          </div>
        </Link>
        <Link href="/rules">
          <div className="flex flex-col items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-100 p-3 hover:bg-blue-100 transition-colors">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Règles</span>
          </div>
        </Link>
        <Link href="/announcements">
          <div className="flex flex-col items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-100 p-3 hover:bg-amber-100 transition-colors">
            <Megaphone className="h-5 w-5 text-amber-600" />
            <span className="text-xs font-medium text-amber-700">Annonces</span>
          </div>
        </Link>
      </div>

      {/* Ce soir */}
      {upcomingEvents && upcomingEvents.length > 0 && (
        <Card className="border-indigo-100 bg-indigo-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-indigo-800">
              <CalendarDays className="h-4 w-4" />
              Ce soir &amp; prochainement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.slice(0, 3).map((event) => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <div className="rounded-lg bg-white p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatEventDate(event.start_at, event.end_at)}
                      </p>
                      {event.guest_count > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {event.guest_count} invité{event.guest_count > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant="secondary"
                        className="text-xs whitespace-nowrap"
                      >
                        {NOISE_LEVEL_LABELS[event.noise_level as keyof typeof NOISE_LEVEL_LABELS]}
                      </Badge>
                      {event.reactions && event.reactions.length > 0 && (
                        <span className="text-xs text-gray-400">
                          {event.reactions.length} réaction{event.reactions.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {upcomingEvents.length > 3 && (
              <Link
                href="/calendar"
                className="block text-center text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Voir tous les événements →
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Présence des colocataires */}
      {colocMembers && colocMembers.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Colocataires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {colocMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded-lg bg-gray-50 p-2"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={m.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                      {getInitials(m.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {m.display_name}
                      {m.id === member.id && (
                        <span className="text-gray-400"> (moi)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {PRESENCE_LABELS[m.presence_status as keyof typeof PRESENCE_LABELS]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Derniers messages */}
      {recentMessages && recentMessages.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-gray-700">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat général
              </span>
              <Link
                href="/chat"
                className="text-xs font-normal text-indigo-600 hover:text-indigo-800"
              >
                Voir tout →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentMessages.reverse().map((msg) => (
              <div key={msg.id} className="flex gap-2">
                <Avatar className="h-6 w-6 flex-shrink-0 mt-0.5">
                  <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                    {msg.member ? getInitials(msg.member.display_name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <span className="text-xs font-medium text-gray-700">
                    {msg.member?.display_name || "Quelqu'un"}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">
                    {formatRelative(msg.created_at)}
                  </span>
                  <p className="text-xs text-gray-600 truncate">{msg.content}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Aucun événement */}
      {(!upcomingEvents || upcomingEvents.length === 0) && (
        <div className="text-center py-10">
          <div className="text-4xl mb-3">🏡</div>
          <p className="text-gray-500 text-sm">Aucun événement à venir</p>
          <Link href="/events/new">
            <Button
              variant="outline"
              className="mt-3 border-indigo-200 text-indigo-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Créer le premier événement
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
