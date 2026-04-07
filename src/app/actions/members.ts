"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

interface MemberDebtInfo {
	memberId: string;
	displayName: string;
	amount: number; // positif = il doit, négatif = on lui doit
}

function createAdminClient() {
	return createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!,
	);
}

export async function updateMemberRole(memberId: string, newRole: UserRole) {
	const supabase = await createServerClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Non authentifié");

	// Vérifie que l'utilisateur actuel est admin
	const { data: currentMember } = await supabase
		.from("members")
		.select("id, role, colocation_id")
		.eq("user_id", user.id)
		.single();

	if (!currentMember || currentMember.role !== "admin") {
		throw new Error("Seuls les admins peuvent changer les rôles");
	}

	// Vérifie que le membre cible est dans la même colocation
	const { data: targetMember } = await supabase
		.from("members")
		.select("id, colocation_id")
		.eq("id", memberId)
		.single();

	if (
		!targetMember ||
		targetMember.colocation_id !== currentMember.colocation_id
	) {
		throw new Error("Membre introuvable");
	}

	// Ne pas se rétrograder soi-même
	if (memberId === currentMember.id) {
		throw new Error("Vous ne pouvez pas modifier votre propre rôle");
	}

	const admin = createAdminClient();
	const { error } = await admin
		.from("members")
		.update({ role: newRole })
		.eq("id", memberId);

	if (error) throw new Error("Impossible de modifier le rôle");

	revalidatePath("/settings/coloc");
}

/**
 * Quitte la colocation actuelle.
 * Supprime l'enregistrement membre (les cascades DB gèrent le reste).
 */
export async function leaveColocation() {
	const supabase = await createServerClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Non authentifié");

	const { data: member } = await supabase
		.from("members")
		.select("id, colocation_id")
		.eq("user_id", user.id)
		.single();

	if (!member) throw new Error("Membre introuvable");

	const admin = createAdminClient();
	const { error } = await admin.from("members").delete().eq("id", member.id);

	if (error) {
		console.error("Leave coloc error:", error);
		throw new Error("Impossible de quitter la colocation");
	}
}

/**
 * Récupère les dettes d'un membre (pour affichage avant suppression).
 */
export async function getMemberDebts(
	memberId: string,
): Promise<MemberDebtInfo[]> {
	const supabase = await createServerClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Non authentifié");

	const { data: currentMember } = await supabase
		.from("members")
		.select("id, role, colocation_id")
		.eq("user_id", user.id)
		.single();

	if (!currentMember || currentMember.role !== "admin") {
		throw new Error("Seuls les admins peuvent effectuer cette action");
	}

	const { data: targetMember } = await supabase
		.from("members")
		.select("id, colocation_id, display_name")
		.eq("id", memberId)
		.single();

	if (
		!targetMember ||
		targetMember.colocation_id !== currentMember.colocation_id
	) {
		throw new Error("Membre introuvable");
	}

	// Récupère toutes les dépenses de la coloc avec splits
	const { data: expenses } = await supabase
		.from("expenses")
		.select("id, paid_by, amount, splits:expense_splits(member_id, amount)")
		.eq("colocation_id", currentMember.colocation_id);

	if (!expenses) return [];

	// Calcule les dettes par paire pour le membre cible
	const debts: Record<string, number> = {};

	for (const expense of expenses) {
		if (!expense.paid_by || !expense.splits) continue;
		const amount = parseFloat(String(expense.amount));

		for (const split of expense.splits) {
			const splitAmount = parseFloat(String(split.amount));
			if (split.member_id === expense.paid_by) continue;

			if (expense.paid_by === memberId) {
				// Le membre cible a payé → l'autre lui doit
				debts[split.member_id] = (debts[split.member_id] || 0) + splitAmount;
			} else if (split.member_id === memberId) {
				// Le membre cible doit à quelqu'un
				debts[expense.paid_by] = (debts[expense.paid_by] || 0) - splitAmount;
			}
		}
	}

	// Récupère les noms des membres concernés
	const memberIds = Object.keys(debts).filter(
		(id) => Math.abs(debts[id]) >= 0.01,
	);
	if (memberIds.length === 0) return [];

	const { data: members } = await supabase
		.from("members")
		.select("id, display_name")
		.in("id", memberIds);

	const nameMap = new Map(
		(members || []).map((m) => [m.id, m.display_name]),
	);

	return memberIds.map((id) => ({
		memberId: id,
		displayName: nameMap.get(id) || "Inconnu",
		amount: debts[id],
	}));
}

/**
 * Supprime un membre de la coloc (admin only).
 * Nettoie TOUTES les traces avant de supprimer le membre.
 */
export async function removeMember(memberId: string) {
	const supabase = await createServerClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Non authentifié");

	const { data: currentMember } = await supabase
		.from("members")
		.select("id, role, colocation_id")
		.eq("user_id", user.id)
		.single();

	if (!currentMember || currentMember.role !== "admin") {
		throw new Error("Seuls les admins peuvent supprimer des membres");
	}

	if (memberId === currentMember.id) {
		throw new Error("Vous ne pouvez pas vous supprimer vous-même");
	}

	const { data: targetMember } = await supabase
		.from("members")
		.select("id, colocation_id")
		.eq("id", memberId)
		.single();

	if (
		!targetMember ||
		targetMember.colocation_id !== currentMember.colocation_id
	) {
		throw new Error("Membre introuvable");
	}

	const admin = createAdminClient();

	// 1. Nettoyer les tables avec ON DELETE SET NULL (pour ne laisser aucune trace)
	// Supprimer les dépenses payées par ce membre
	const { data: paidExpenses } = await admin
		.from("expenses")
		.select("id")
		.eq("paid_by", memberId);

	if (paidExpenses && paidExpenses.length > 0) {
		const expenseIds = paidExpenses.map((e) => e.id);
		await admin.from("expense_splits").delete().in("expense_id", expenseIds);
		await admin.from("expenses").delete().in("id", expenseIds);
	}

	// Supprimer les messages chat
	await admin.from("chat_messages").delete().eq("member_id", memberId);

	// Supprimer les annonces
	await admin.from("announcements").delete().eq("member_id", memberId);

	// Nullifier created_by sur les events (les events restent, mais sans créateur)
	await admin
		.from("events")
		.update({ created_by: null })
		.eq("created_by", memberId);

	// Nullifier initiated_by sur les votes
	await admin
		.from("votes")
		.update({ initiated_by: null })
		.eq("initiated_by", memberId);

	// Nullifier swapped_with dans chore_assignments
	await admin
		.from("chore_assignments")
		.update({ swapped_with: null })
		.eq("swapped_with", memberId);

	// 2. Supprimer le membre (CASCADE gère : event_reactions, vote_ballots,
	//    message_read_receipts, expense_splits, chore_assignments, push_subscriptions,
	//    notification_preferences, emergency_button_permissions, dev_permissions,
	//    chat_last_read, firetruck_clicks)
	const { error } = await admin.from("members").delete().eq("id", memberId);

	if (error) {
		console.error("Remove member error:", error);
		throw new Error("Impossible de supprimer le membre");
	}

	revalidatePath("/settings/coloc");
	revalidatePath("/expenses");
	revalidatePath("/");
}

/**
 * Nettoie les données orphelines dans la BDD.
 * Trouve et supprime les enregistrements qui référencent des membres inexistants.
 */
export async function cleanupOrphanedData(colocationId: string) {
	const supabase = await createServerClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Non authentifié");

	const { data: currentMember } = await supabase
		.from("members")
		.select("id, role, colocation_id")
		.eq("user_id", user.id)
		.single();

	if (!currentMember || currentMember.role !== "admin") {
		throw new Error("Seuls les admins peuvent effectuer cette action");
	}

	if (currentMember.colocation_id !== colocationId) {
		throw new Error("Colocation invalide");
	}

	const admin = createAdminClient();

	// Récupère tous les member IDs valides de cette coloc
	const { data: validMembers } = await admin
		.from("members")
		.select("id")
		.eq("colocation_id", colocationId);

	const validIds = new Set((validMembers || []).map((m) => m.id));

	let cleaned = 0;

	// Tables avec ON DELETE SET NULL — chercher les orphelins (paid_by/member_id non null mais membre inexistant)

	// 1. expenses avec paid_by orphelin
	const { data: orphanExpenses } = await admin
		.from("expenses")
		.select("id, paid_by")
		.eq("colocation_id", colocationId)
		.not("paid_by", "is", null);

	if (orphanExpenses) {
		const orphanExpenseIds = orphanExpenses
			.filter((e) => !validIds.has(e.paid_by))
			.map((e) => e.id);
		if (orphanExpenseIds.length > 0) {
			await admin
				.from("expense_splits")
				.delete()
				.in("expense_id", orphanExpenseIds);
			await admin.from("expenses").delete().in("id", orphanExpenseIds);
			cleaned += orphanExpenseIds.length;
		}
	}

	// 2. expense_splits avec member_id orphelin
	const { data: allExpenses } = await admin
		.from("expenses")
		.select("id")
		.eq("colocation_id", colocationId);

	if (allExpenses && allExpenses.length > 0) {
		const expenseIds = allExpenses.map((e) => e.id);
		const { data: orphanSplits } = await admin
			.from("expense_splits")
			.select("id, member_id")
			.in("expense_id", expenseIds);

		if (orphanSplits) {
			const orphanSplitIds = orphanSplits
				.filter((s) => !validIds.has(s.member_id))
				.map((s) => s.id);
			if (orphanSplitIds.length > 0) {
				await admin
					.from("expense_splits")
					.delete()
					.in("id", orphanSplitIds);
				cleaned += orphanSplitIds.length;
			}
		}
	}

	// 3. chat_messages avec member_id orphelin (SET NULL mais pas null)
	const { data: channels } = await admin
		.from("chat_channels")
		.select("id")
		.eq("colocation_id", colocationId);

	if (channels && channels.length > 0) {
		const channelIds = channels.map((c) => c.id);
		const { data: orphanMessages } = await admin
			.from("chat_messages")
			.select("id, member_id")
			.in("channel_id", channelIds)
			.not("member_id", "is", null);

		if (orphanMessages) {
			const orphanMsgIds = orphanMessages
				.filter((m) => !validIds.has(m.member_id))
				.map((m) => m.id);
			if (orphanMsgIds.length > 0) {
				await admin.from("chat_messages").delete().in("id", orphanMsgIds);
				cleaned += orphanMsgIds.length;
			}
		}
	}

	// 4. announcements avec member_id orphelin
	const { data: orphanAnnouncements } = await admin
		.from("announcements")
		.select("id, member_id")
		.eq("colocation_id", colocationId)
		.not("member_id", "is", null);

	if (orphanAnnouncements) {
		const orphanAnnIds = orphanAnnouncements
			.filter((a) => !validIds.has(a.member_id))
			.map((a) => a.id);
		if (orphanAnnIds.length > 0) {
			await admin.from("announcements").delete().in("id", orphanAnnIds);
			cleaned += orphanAnnIds.length;
		}
	}

	revalidatePath("/settings/coloc");
	return { cleaned };
}
