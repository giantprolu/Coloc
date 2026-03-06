"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { splitEqually } from "@/lib/expenses";
import { createClient } from "@/lib/supabase/client";

interface Member {
	id: string;
	display_name: string;
}

interface EventOption {
	id: string;
	title: string;
}

interface NewExpenseFormProps {
	memberId: string;
	colocationId: string;
	members: Member[];
	events: EventOption[];
}

export function NewExpenseForm({
	memberId,
	colocationId,
	members,
	events,
}: NewExpenseFormProps) {
	const router = useRouter();
	const supabase = createClient();

	const [title, setTitle] = useState("");
	const [amount, setAmount] = useState("");
	const [paidBy, setPaidBy] = useState(memberId);
	const [eventId, setEventId] = useState<string>("");
	const [selectedMembers, setSelectedMembers] = useState<string[]>(
		members.map((m) => m.id),
	);
	const [isLoading, setIsLoading] = useState(false);

	const parsedAmount = parseFloat(amount) || 0;
	const perPerson =
		selectedMembers.length > 0
			? splitEqually(parsedAmount, selectedMembers.length)
			: 0;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title || parsedAmount <= 0) return;
		setIsLoading(true);

		try {
			const { data: expense, error: expenseError } = await supabase
				.from("expenses")
				.insert({
					colocation_id: colocationId,
					event_id: eventId || null,
					paid_by: paidBy,
					title,
					amount: parsedAmount,
				})
				.select()
				.single();

			if (expenseError) throw expenseError;

			// Crée les splits
			await supabase.from("expense_splits").insert(
				selectedMembers.map((memberId) => ({
					expense_id: expense.id,
					member_id: memberId,
					amount: perPerson,
				})),
			);

			toast.success("Dépense ajoutée !");
			router.push("/expenses");
		} catch (err) {
			toast.error("Erreur lors de l'ajout de la dépense");
		} finally {
			setIsLoading(false);
		}
	};

	const toggleMember = (id: string) => {
		setSelectedMembers((prev) =>
			prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
		);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-5">
			<div className="space-y-2">
				<Label htmlFor="title">Description *</Label>
				<Input
					id="title"
					placeholder="ex : Courses alimentaires"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					required
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="amount">Montant (€) *</Label>
				<Input
					id="amount"
					type="number"
					step="0.01"
					min="0"
					placeholder="0.00"
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
					required
				/>
			</div>

			<div className="space-y-2">
				<Label>Payé par *</Label>
				<Select value={paidBy} onValueChange={setPaidBy}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{members.map((m) => (
							<SelectItem key={m.id} value={m.id}>
								{m.display_name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-2">
				<Label>Lié à un événement (optionnel)</Label>
				<Select
					value={eventId || "none"}
					onValueChange={(v) => setEventId(v === "none" ? "" : v)}
				>
					<SelectTrigger>
						<SelectValue placeholder="Aucun événement" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">Aucun événement</SelectItem>
						{events.map((e) => (
							<SelectItem key={e.id} value={e.id}>
								{e.title}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-2">
				<Label>Partager avec</Label>
				<div className="flex flex-wrap gap-2">
					{members.map((m) => (
						<button
							key={m.id}
							type="button"
							onClick={() => toggleMember(m.id)}
							className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
								selectedMembers.includes(m.id)
									? "bg-indigo-100 border-indigo-300 text-indigo-800"
									: "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
							}`}
						>
							{m.display_name}
						</button>
					))}
				</div>
				{selectedMembers.length > 0 && parsedAmount > 0 && (
					<p className="text-xs text-gray-500">
						Soit {perPerson.toFixed(2)} € par personne ({selectedMembers.length}{" "}
						participants)
					</p>
				)}
			</div>

			<Button
				type="submit"
				className="w-full bg-indigo-600 hover:bg-indigo-700"
				disabled={
					isLoading ||
					!title ||
					parsedAmount <= 0 ||
					selectedMembers.length === 0
				}
			>
				{isLoading ? "Ajout en cours..." : "Ajouter la dépense"}
			</Button>
		</form>
	);
}
