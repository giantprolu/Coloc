import { VoteBallot, VoteResults } from "@/types";

// Calcule les résultats d'un vote
export function calculateVoteResults(ballots: VoteBallot[]): VoteResults {
  const approve = ballots.filter((b) => b.choice === "approve").length;
  const reject = ballots.filter((b) => b.choice === "reject").length;
  const abstain = ballots.filter((b) => b.choice === "abstain").length;
  const total = ballots.length;

  // Les abstentions ne comptent pas pour le résultat
  let result: VoteResults["result"];
  if (approve > reject) {
    result = "approved";
  } else if (reject > approve) {
    result = "rejected";
  } else {
    result = "tie";
  }

  return { approve, reject, abstain, total, result };
}

// Détermine si un vote doit être clôturé
export function shouldCloseVote(closesAt: string): boolean {
  return new Date() >= new Date(closesAt);
}

// Formate le temps restant avant clôture d'un vote
export function formatTimeRemaining(closesAt: string): string {
  const now = new Date();
  const closeDate = new Date(closesAt);
  const diffMs = closeDate.getTime() - now.getTime();

  if (diffMs <= 0) return "Clôturé";

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}min restantes`;
  }
  return `${diffMinutes} min restantes`;
}
