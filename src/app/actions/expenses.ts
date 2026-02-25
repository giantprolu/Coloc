"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Supprime une dépense (payeur ou admin).
 */
export async function deleteExpense(expenseId: string) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: member } = await supabase
    .from("members")
    .select("id, role, colocation_id")
    .eq("user_id", user.id)
    .single();

  if (!member) throw new Error("Membre introuvable");

  const { data: expense } = await supabase
    .from("expenses")
    .select("id, paid_by, colocation_id")
    .eq("id", expenseId)
    .single();

  if (!expense || expense.colocation_id !== member.colocation_id) {
    throw new Error("Dépense introuvable");
  }

  const isPayer = expense.paid_by === member.id;
  const isAdmin = member.role === "admin";

  if (!isPayer && !isAdmin) {
    throw new Error("Vous n'avez pas la permission de supprimer cette dépense");
  }

  const admin = createAdminClient();

  // Supprime les splits puis la dépense
  await admin.from("expense_splits").delete().eq("expense_id", expenseId);
  const { error } = await admin.from("expenses").delete().eq("id", expenseId);

  if (error) throw new Error("Impossible de supprimer la dépense");

  revalidatePath("/expenses");
}

/**
 * Met à jour une dépense existante (payeur ou admin).
 */
export async function updateExpense(
  expenseId: string,
  data: {
    title: string;
    amount: number;
    paid_by: string;
    event_id: string | null;
    splits: { member_id: string; amount: number }[];
  }
) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: member } = await supabase
    .from("members")
    .select("id, role, colocation_id")
    .eq("user_id", user.id)
    .single();

  if (!member) throw new Error("Membre introuvable");

  const { data: expense } = await supabase
    .from("expenses")
    .select("id, paid_by, colocation_id")
    .eq("id", expenseId)
    .single();

  if (!expense || expense.colocation_id !== member.colocation_id) {
    throw new Error("Dépense introuvable");
  }

  const isPayer = expense.paid_by === member.id;
  const isAdmin = member.role === "admin";

  if (!isPayer && !isAdmin) {
    throw new Error("Vous n'avez pas la permission de modifier cette dépense");
  }

  const admin = createAdminClient();

  // Met à jour la dépense
  const { error } = await admin
    .from("expenses")
    .update({
      title: data.title,
      amount: data.amount,
      paid_by: data.paid_by,
      event_id: data.event_id,
    })
    .eq("id", expenseId);

  if (error) throw new Error("Impossible de modifier la dépense");

  // Supprime les anciens splits et recrée les nouveaux
  await admin.from("expense_splits").delete().eq("expense_id", expenseId);

  if (data.splits.length > 0) {
    await admin.from("expense_splits").insert(
      data.splits.map((s) => ({
        expense_id: expenseId,
        member_id: s.member_id,
        amount: s.amount,
      }))
    );
  }

  revalidatePath("/expenses");
}
