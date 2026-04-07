"use client";

import { Check, ChevronDown, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { settleDebt } from "@/app/actions/expenses";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { formatAmount } from "@/lib/expenses";

interface PairwiseDebt {
	memberId: string;
	displayName: string;
	amount: number; // positif = l'autre me doit, négatif = je lui dois
}

interface BalanceCardProps {
	balance: number;
	debts: PairwiseDebt[];
}

export function BalanceCard({ balance, debts }: BalanceCardProps) {
	const [expanded, setExpanded] = useState(false);
	const [settleTarget, setSettleTarget] = useState<PairwiseDebt | null>(null);
	const [isSettling, setIsSettling] = useState(false);

	// Ne garder que les dettes non nulles, triées par montant absolu décroissant
	const nonZeroDebts = debts
		.filter((d) => Math.abs(d.amount) >= 0.01)
		.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

	const handleSettle = async () => {
		if (!settleTarget) return;
		setIsSettling(true);
		try {
			await settleDebt(settleTarget.memberId, Math.abs(settleTarget.amount));
			toast.success(
				`Remboursement de ${formatAmount(Math.abs(settleTarget.amount))} à ${settleTarget.displayName} enregistré`,
			);
			setSettleTarget(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Erreur");
		} finally {
			setIsSettling(false);
		}
	};

	return (
		<>
			<Card
				className={`cursor-pointer transition-colors ${
					balance > 0
						? "border-green-200 bg-green-50"
						: balance < 0
							? "border-red-200 bg-red-50"
							: ""
				}`}
				onClick={() => setExpanded(!expanded)}
			>
				<CardContent className="pt-4">
					<div className="flex items-center gap-3">
						{balance >= 0 ? (
							<TrendingUp className="h-8 w-8 text-green-600 shrink-0" />
						) : (
							<TrendingDown className="h-8 w-8 text-red-600 shrink-0" />
						)}
						<div className="flex-1">
							<p className="text-sm text-gray-600">Mon solde</p>
							<p
								className={`text-2xl font-bold ${
									balance > 0
										? "text-green-700"
										: balance < 0
											? "text-red-700"
											: "text-gray-700"
								}`}
							>
								{balance >= 0 ? "+" : ""}
								{formatAmount(balance)}
							</p>
							<p className="text-xs text-gray-500">
								{balance > 0
									? "On vous doit de l'argent"
									: balance < 0
										? "Vous devez de l'argent"
										: "Vous êtes à l'équilibre"}
							</p>
						</div>
						{nonZeroDebts.length > 0 && (
							<ChevronDown
								className={`h-5 w-5 text-gray-400 shrink-0 transition-transform ${
									expanded ? "rotate-180" : ""
								}`}
							/>
						)}
					</div>

					{expanded && nonZeroDebts.length > 0 && (
						<div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
							{nonZeroDebts.map((debt) => (
								<div
									key={debt.memberId}
									className="flex items-center justify-between"
								>
									<span className="text-sm text-gray-700">
										{debt.amount > 0
											? `${debt.displayName} vous doit`
											: `Vous devez à ${debt.displayName}`}
									</span>
									<div className="flex items-center gap-2">
										<span
											className={`text-sm font-medium ${
												debt.amount > 0 ? "text-green-600" : "text-red-600"
											}`}
										>
											{formatAmount(Math.abs(debt.amount))}
										</span>
										{debt.amount < 0 && (
											<Button
												variant="outline"
												size="sm"
												className="h-7 text-xs px-2 text-green-700 border-green-300 hover:bg-green-50"
												onClick={(e) => {
													e.stopPropagation();
													setSettleTarget(debt);
												}}
											>
												<Check className="mr-1 h-3 w-3" />
												Remboursé
											</Button>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={!!settleTarget}
				onOpenChange={() => setSettleTarget(null)}
			>
				<DialogContent onClick={(e) => e.stopPropagation()}>
					<DialogHeader>
						<DialogTitle>Confirmer le remboursement</DialogTitle>
						<DialogDescription>
							Vous confirmez avoir remboursé{" "}
							<strong>{formatAmount(Math.abs(settleTarget?.amount || 0))}</strong>{" "}
							à <strong>{settleTarget?.displayName}</strong> ?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setSettleTarget(null)}
						>
							Annuler
						</Button>
						<Button
							onClick={handleSettle}
							disabled={isSettling}
							className="bg-green-600 hover:bg-green-700"
						>
							{isSettling ? "Enregistrement..." : "Confirmer"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
