import { Member, Expense, MemberBalance } from "@/types";

// Calcule les soldes entre colocataires
export function calculateBalances(
  members: Member[],
  expenses: Expense[]
): MemberBalance[] {
  // Initialise les soldes à zéro
  const balances: Record<string, number> = {};
  members.forEach((m) => (balances[m.id] = 0));

  // Pour chaque dépense, le payeur est crédité, les participants sont débités
  expenses.forEach((expense) => {
    if (!expense.paid_by || !expense.splits) return;

    // Crédite le payeur du montant total
    balances[expense.paid_by] =
      (balances[expense.paid_by] || 0) + expense.amount;

    // Débite chaque participant de sa part
    expense.splits.forEach((split) => {
      balances[split.member_id] =
        (balances[split.member_id] || 0) - split.amount;
    });
  });

  return members.map((member) => ({
    member,
    balance: balances[member.id] || 0,
  }));
}

// Formate un montant en euros
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

// Calcule les dettes par paire pour un membre donné
// Retourne { memberId: net } où positif = l'autre me doit, négatif = je lui dois
export function calculatePairwiseDebts(
  myId: string,
  expenses: Expense[]
): Record<string, number> {
  const debts: Record<string, number> = {};

  expenses.forEach((expense) => {
    if (!expense.paid_by || !expense.splits) return;

    expense.splits.forEach((split) => {
      if (split.member_id === expense.paid_by) return;

      if (expense.paid_by === myId) {
        // J'ai payé → l'autre me doit sa part
        debts[split.member_id] = (debts[split.member_id] || 0) + split.amount;
      } else if (split.member_id === myId) {
        // Quelqu'un d'autre a payé et je suis dans les splits → je lui dois
        debts[expense.paid_by!] = (debts[expense.paid_by!] || 0) - split.amount;
      }
    });
  });

  return debts;
}

// Calcule la répartition équitable d'une dépense
export function splitEqually(amount: number, memberCount: number): number {
  return Math.round((amount / memberCount) * 100) / 100;
}
