import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatTimeRemaining, calculateVoteResults } from "@/lib/votes";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VoteBallot } from "@/types";
import Link from "next/link";
import { Vote, CheckCircle, XCircle, Clock } from "lucide-react";
import { closeAllExpiredVotesForColocation } from "@/app/actions/votes";

export default async function VotesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("members")
    .select("id, colocation_id")
    .eq("user_id", user.id)
    .single();

  if (!member) redirect("/onboarding");

  // Clôture paresseuse de tous les votes expirés de la coloc
  await closeAllExpiredVotesForColocation(member.colocation_id).catch(() => {});

  // Votes ouverts
  const { data: openVotes } = await supabase
    .from("votes")
    .select(`
      *,
      event:events(id, title, start_at, end_at),
      initiator:members!votes_initiated_by_fkey(display_name),
      ballots:vote_ballots(id, member_id, choice)
    `)
    .eq("status", "open")
    .eq("events.colocation_id", member.colocation_id)
    .order("created_at", { ascending: false });

  // Historique des votes (clôturés)
  const { data: closedVotes } = await supabase
    .from("votes")
    .select(`
      *,
      event:events(id, title),
      ballots:vote_ballots(id, member_id, choice)
    `)
    .neq("status", "open")
    .eq("events.colocation_id", member.colocation_id)
    .order("created_at", { ascending: false })
    .limit(10);

  const voteStatusLabel: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    approved: {
      label: "Approuvé",
      icon: <CheckCircle className="h-4 w-4" />,
      color: "text-green-600 bg-green-50",
    },
    rejected: {
      label: "Refusé",
      icon: <XCircle className="h-4 w-4" />,
      color: "text-red-600 bg-red-50",
    },
    expired: {
      label: "Expiré",
      icon: <Clock className="h-4 w-4" />,
      color: "text-gray-600 bg-gray-50",
    },
  };

  return (
    <div className="space-y-4 p-4">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-gray-900">Votes</h1>
        <p className="text-sm text-gray-500">Contestations et décisions collectives</p>
      </div>

      {/* Votes ouverts */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          En cours ({openVotes?.length || 0})
        </h2>
        {openVotes && openVotes.length > 0 ? (
          <div className="space-y-3">
            {openVotes.map((vote) => {
              const results = calculateVoteResults(vote.ballots as VoteBallot[]);
              const userBallot = vote.ballots?.find(
                (b: VoteBallot) => b.member_id === member.id
              );

              return (
                <Link key={vote.id} href={`/events/${vote.event?.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Vote className="h-4 w-4 text-orange-600" />
                          {vote.event?.title}
                        </span>
                        {!userBallot && (
                          <Badge variant="destructive" className="text-xs">
                            À voter
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {vote.reason && (
                        <p className="text-sm text-gray-600 mb-3 italic">
                          &ldquo;{vote.reason}&rdquo;
                        </p>
                      )}
                      <div className="flex gap-4 text-sm text-gray-600 mb-2">
                        <span className="text-green-600 font-medium">
                          ✅ {results.approve}
                        </span>
                        <span className="text-red-600 font-medium">
                          ❌ {results.reject}
                        </span>
                        <span className="text-gray-400">
                          😐 {results.abstain}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {formatTimeRemaining(vote.closes_at)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Vote className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucun vote en cours</p>
          </div>
        )}
      </section>

      {/* Historique */}
      {closedVotes && closedVotes.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Historique
          </h2>
          <div className="space-y-2">
            {closedVotes.map((vote) => {
              const statusInfo = voteStatusLabel[vote.status] || {
                label: vote.status,
                icon: null,
                color: "text-gray-600 bg-gray-50",
              };
              const results = calculateVoteResults(vote.ballots as VoteBallot[]);

              return (
                <Link key={vote.id} href={`/events/${vote.event?.id}`}>
                  <div className="flex items-center justify-between rounded-lg bg-white p-3 border hover:shadow-sm transition-shadow cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {vote.event?.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        ✅ {results.approve} · ❌ {results.reject} · 😐 {results.abstain}
                      </p>
                    </div>
                    <span
                      className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusInfo.color}`}
                    >
                      {statusInfo.icon}
                      {statusInfo.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
