"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getMemberDebts, removeMember } from "@/app/actions/members";
import { formatAmount } from "@/lib/expenses";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface RemoveMemberButtonProps {
	memberId: string;
	memberName: string;
}

interface DebtInfo {
	memberId: string;
	displayName: string;
	amount: number;
}

export function RemoveMemberButton({
	memberId,
	memberName,
}: RemoveMemberButtonProps) {
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [debts, setDebts] = useState<DebtInfo[] | null>(null);
	const [step, setStep] = useState<"confirm" | "debts">("confirm");

	const handleOpen = async () => {
		setOpen(true);
		setStep("confirm");
		setDebts(null);
		setIsLoading(true);
		try {
			const memberDebts = await getMemberDebts(memberId);
			setDebts(memberDebts);
			if (memberDebts.length > 0) {
				setStep("debts");
			}
		} catch {
			// Pas de dettes ou erreur — on continue
			setDebts([]);
		} finally {
			setIsLoading(false);
		}
	};

	const handleRemove = async () => {
		setIsLoading(true);
		try {
			await removeMember(memberId);
			toast.success(`${memberName} a été supprimé de la colocation`);
			setOpen(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Erreur");
		} finally {
			setIsLoading(false);
		}
	};

	const handleClose = () => {
		setOpen(false);
		setStep("confirm");
		setDebts(null);
	};

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
				onClick={handleOpen}
				title="Supprimer de la coloc"
			>
				<Trash2 className="h-3.5 w-3.5" />
			</Button>

			<Dialog open={open} onOpenChange={handleClose}>
				<DialogContent>
					{step === "debts" && debts && debts.length > 0 ? (
						<>
							<DialogHeader>
								<DialogTitle className="flex items-center gap-2 text-amber-600">
									<AlertTriangle className="h-5 w-5" />
									Attention : dettes en cours
								</DialogTitle>
								<DialogDescription>
									{memberName} a des dettes non réglées. En le supprimant, ces
									dettes seront perdues.
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-2 py-2">
								{debts.map((debt) => (
									<div
										key={debt.memberId}
										className="flex items-center justify-between text-sm"
									>
										<span className="text-gray-700">
											{debt.amount < 0
												? `Doit ${formatAmount(Math.abs(debt.amount))} à ${debt.displayName}`
												: `${debt.displayName} lui doit ${formatAmount(debt.amount)}`}
										</span>
										<span
											className={`font-medium ${
												debt.amount < 0 ? "text-red-600" : "text-green-600"
											}`}
										>
											{debt.amount < 0 ? "-" : "+"}
											{formatAmount(Math.abs(debt.amount))}
										</span>
									</div>
								))}
							</div>
							<DialogFooter>
								<Button variant="outline" onClick={handleClose}>
									Annuler
								</Button>
								<Button
									variant="destructive"
									onClick={handleRemove}
									disabled={isLoading}
								>
									{isLoading
										? "Suppression..."
										: "Supprimer quand même"}
								</Button>
							</DialogFooter>
						</>
					) : (
						<>
							<DialogHeader>
								<DialogTitle>Supprimer {memberName}</DialogTitle>
								<DialogDescription>
									{isLoading
										? "Vérification des dettes en cours..."
										: `${memberName} sera définitivement supprimé de la colocation. Toutes ses données seront effacées (messages, dépenses, réactions, tâches...).`}
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<Button variant="outline" onClick={handleClose}>
									Annuler
								</Button>
								<Button
									variant="destructive"
									onClick={handleRemove}
									disabled={isLoading}
								>
									{isLoading ? "..." : "Supprimer"}
								</Button>
							</DialogFooter>
						</>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
