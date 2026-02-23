import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { formatEventDate } from "@/lib/utils";
import { NOISE_LEVEL_LABELS } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactionBar } from "@/components/events/ReactionBar";
import { VoteCard } from "@/components/votes/VoteCard";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Users,
  Volume2,
  MapPin,
  MessageSquare,
  Pencil,
} from "lucide-react";
import { DeleteEventButton } from "@/components/events/DeleteEventButton";
import { closeExpiredVotesForEvent } from "@/app/actions/votes";

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;

  // Clôture paresseuse : ferme les votes expirés à chaque chargement de la page
  // (remplace le cron */15 qui n'est pas disponible sur le plan Hobby Vercel)
  await closeExpiredVotesForEvent(id).catch(() => {
    // Silencieux : on ne bloque pas l'affichage si ça échoue
  });

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!member) redirect("/onboarding");

  // Récupère en parallèle l'événement, le vote actif, le canal chat et le nombre de membres
  const [
    { data: event },
    { data: activeVote },
    { data: eventChannel },
    { count: memberCount },
  ] = await Promise.all([
    supabase
      .from("events")
      .select(`
        *,
        creator:members!events_created_by_fkey(*),
        spaces:event_spaces(space:spaces(*)),
        reactions:event_reactions(*, member:members(*))
      `)
      .eq("id", id)
      .eq("colocation_id", member.colocation_id)
      .single(),
    supabase
      .from("votes")
      .select(`
        *,
        initiator:members!votes_initiated_by_fkey(display_name),
        ballots:vote_ballots(*, member:members(display_name))
      `)
      .eq("event_id", id)
      .eq("status", "open")
      .single(),
    supabase
      .from("chat_channels")
      .select("id")
      .eq("event_id", id)
      .single(),
    supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("colocation_id", member.colocation_id),
  ]);

  if (!event) notFound();

  const isCreator = event.created_by === member.id;
  const userReaction = event.reactions?.find(
    (r: { member_id: string }) => r.member_id === member.id
  );

  const statusLabels: Record<string, { label: string; color: string }> = {
    confirmed: { label: "Confirmé", color: "bg-green-100 text-green-800" },
    contested: { label: "Contesté", color: "bg-red-100 text-red-800" },
    cancelled: { label: "Annulé", color: "bg-gray-100 text-gray-600" },
    vote_approved: { label: "Approuvé par vote", color: "bg-indigo-100 text-indigo-800" },
  };

  const statusInfo = statusLabels[event.status] || statusLabels.confirmed;

  return (
    <div className="space-y-4 p-4">
      {/* Navigation */}
      <div className="flex items-center gap-3 pt-2">
        <Link href="/calendar" aria-label="Retour au calendrier">
          <Button variant="ghost" size="icon" aria-label="Retour au calendrier" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-gray-900">{event.title}</h1>
            <span
              className={`text-xs font-medium rounded-full px-2 py-0.5 ${statusInfo.color}`}
            >
              {statusInfo.label}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Par {event.creator?.display_name || "Quelqu'un"}
          </p>
        </div>
        {isCreator && (
          <div className="flex gap-1">
            <Link href={`/events/${id}/edit`} aria-label="Modifier l'événement">
              <Button variant="ghost" size="icon" aria-label="Modifier l'événement" className="h-8 w-8">
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
            <DeleteEventButton eventId={id} colocationId={member.colocation_id} />
          </div>
        )}
      </div>

      {/* Détails de l'événement */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span>{formatEventDate(event.start_at, event.end_at)}</span>
          </div>

          {event.guest_count > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span>
                {event.guest_count} invité{event.guest_count > 1 ? "s" : ""} estimé
                {event.guest_count > 1 ? "s" : ""}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Volume2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span>
              {NOISE_LEVEL_LABELS[event.noise_level as keyof typeof NOISE_LEVEL_LABELS]}
            </span>
          </div>

          {event.spaces && event.spaces.length > 0 && (
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {event.spaces.map(
                  (es: { space: { id: string; name: string; icon: string | null } }) => (
                    <Badge key={es.space.id} variant="secondary" className="text-xs">
                      {es.space.icon} {es.space.name}
                    </Badge>
                  )
                )}
              </div>
            </div>
          )}

          {event.description && (
            <p className="text-sm text-gray-600 pt-1 border-t">
              {event.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Vote actif */}
      {activeVote && (
        <VoteCard
          vote={activeVote}
          currentMemberId={member.id}
          colocationId={member.colocation_id}
          totalMembers={memberCount ?? 0}
        />
      )}

      {/* Réactions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Réactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReactionBar
            eventId={id}
            memberId={member.id}
            colocationId={member.colocation_id}
            initialReactions={event.reactions || []}
            userReaction={userReaction?.reaction || null}
          />
        </CardContent>
      </Card>

      {/* Chat de l'événement */}
      {eventChannel && (
        <Link href={`/chat/${eventChannel.id}`}>
          <Button
            variant="outline"
            className="w-full"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat de l&apos;événement
          </Button>
        </Link>
      )}
    </div>
  );
}
