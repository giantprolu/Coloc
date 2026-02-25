import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { calculateBalances, calculatePairwiseDebts, formatAmount } from "@/lib/expenses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Plus, Receipt } from "lucide-react";
import { ExpenseActions } from "@/components/expenses/ExpenseActions";
import { BalanceCard } from "@/components/expenses/BalanceCard";

export default async function ExpensesPage() {
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

  const { data: members } = await supabase
    .from("members")
    .select("*")
    .eq("colocation_id", member.colocation_id);

  const { data: expenses } = await supabase
    .from("expenses")
    .select(`
      *,
      payer:members!expenses_paid_by_fkey(display_name),
      splits:expense_splits(*, member:members(display_name))
    `)
    .eq("colocation_id", member.colocation_id)
    .order("created_at", { ascending: false });

  const { data: events } = await supabase
    .from("events")
    .select("id, title")
    .eq("colocation_id", member.colocation_id)
    .neq("status", "cancelled")
    .order("start_at", { ascending: false })
    .limit(10);

  const balances = members && expenses
    ? calculateBalances(
        members,
        expenses.map((e) => ({
          ...e,
          amount: parseFloat(e.amount),
          splits: e.splits?.map((s: { amount: string | number }) => ({
            ...s,
            amount: parseFloat(String(s.amount)),
          })),
        }))
      )
    : [];

  const myBalance = balances.find((b) => b.member.id === member.id);

  const parsedExpenses = expenses
    ? expenses.map((e) => ({
        ...e,
        amount: parseFloat(e.amount),
        splits: e.splits?.map((s: { amount: string | number; member_id: string }) => ({
          ...s,
          amount: parseFloat(String(s.amount)),
        })),
      }))
    : [];

  const pairwiseDebts = calculatePairwiseDebts(member.id, parsedExpenses);
  const memberMap = new Map((members || []).map((m) => [m.id, m.display_name]));
  const debtsArray = Object.entries(pairwiseDebts).map(([memberId, amount]) => ({
    memberId,
    displayName: memberMap.get(memberId) || "Inconnu",
    amount,
  }));

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dépenses</h1>
          <p className="text-sm text-gray-500">Suivi des dépenses partagées</p>
        </div>
        <Link href="/expenses/new">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="mr-1 h-4 w-4" />
            Ajouter
          </Button>
        </Link>
      </div>

      {/* Mon solde */}
      {myBalance && (
        <BalanceCard balance={myBalance.balance} debts={debtsArray} />
      )}

      {/* Soldes des membres */}
      {balances.filter((b) => b.member.id !== member.id).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Soldes de la coloc</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {balances
              .filter((b) => b.member.id !== member.id)
              .map((balance) => (
                <div
                  key={balance.member.id}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-gray-700">
                    {balance.member.display_name}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      balance.balance > 0
                        ? "text-green-600"
                        : balance.balance < 0
                        ? "text-red-600"
                        : "text-gray-500"
                    }`}
                  >
                    {balance.balance >= 0 ? "+" : ""}
                    {formatAmount(balance.balance)}
                  </span>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Historique */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Receipt className="h-4 w-4" />
            Historique ({expenses?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {expenses && expenses.length > 0 ? (
            expenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {expense.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    Payé par {expense.payer?.display_name} ·{" "}
                    {formatDate(expense.created_at, "d MMM")}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatAmount(parseFloat(expense.amount))}
                  </span>
                  {expense.paid_by === member.id && (
                    <ExpenseActions
                      expense={{
                        ...expense,
                        amount: parseFloat(expense.amount),
                        splits: expense.splits?.map((s: { member_id: string; amount: string | number; member?: { display_name: string } }) => ({
                          member_id: s.member_id,
                          amount: parseFloat(String(s.amount)),
                          member: s.member,
                        })),
                      }}
                      members={(members || []).map((m) => ({ id: m.id, display_name: m.display_name }))}
                      events={events || []}
                    />
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6">
              <Receipt className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">Aucune dépense enregistrée</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
