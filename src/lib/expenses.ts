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

// Calcule la répartition équitable d'une dépense
export function splitEqually(amount: number, memberCount: number): number {
  return Math.round((amount / memberCount) * 100) / 100;
}
