"use client";

import { Check, Lock, Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

interface SetPasswordFormProps {
	passwordInitialized?: boolean;
}

export function SetPasswordForm({
	passwordInitialized = false,
}: SetPasswordFormProps) {
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [editing, setEditing] = useState(false);
	const supabase = createClient();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (password.length < 6) {
			setError("Le mot de passe doit contenir au moins 6 caractères.");
			return;
		}

		if (password !== confirmPassword) {
			setError("Les mots de passe ne correspondent pas.");
			return;
		}

		setIsLoading(true);

		const { error } = await supabase.auth.updateUser({
			password,
			data: { password_initialized: true },
		});

		if (error) {
			setError("Erreur lors de la mise à jour du mot de passe.");
			setIsLoading(false);
			return;
		}

		setSuccess(true);
		setPassword("");
		setConfirmPassword("");
		setIsLoading(false);
		setEditing(false);
	};

	// Password already set: show compact view with edit option
	if (passwordInitialized && !editing && !success) {
		return (
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
						<Lock className="h-4 w-4" />
						Mot de passe
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between">
						<p className="text-sm text-gray-500">••••••••</p>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setEditing(true)}
							className="text-xs text-indigo-600 hover:text-indigo-700"
						>
							<Pencil className="h-3 w-3 mr-1" />
							Modifier
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
					<Lock className="h-4 w-4" />
					Mot de passe
				</CardTitle>
			</CardHeader>
			<CardContent>
				{success ? (
					<div className="flex items-center gap-2 text-sm text-green-600">
						<Check className="h-4 w-4" />
						Mot de passe mis à jour !
					</div>
				) : (
					<form onSubmit={handleSubmit} className="space-y-3">
						<div className="space-y-2">
							<Label htmlFor="new-password" className="text-xs">
								{passwordInitialized
									? "Nouveau mot de passe"
									: "Définir un mot de passe"}
							</Label>
							<Input
								id="new-password"
								type="password"
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								minLength={6}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirm-new-password" className="text-xs">
								Confirmer
							</Label>
							<Input
								id="confirm-new-password"
								type="password"
								placeholder="••••••••"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								required
								minLength={6}
							/>
						</div>
						{error && (
							<p className="text-xs text-red-600 bg-red-50 rounded-md p-2">
								{error}
							</p>
						)}
						<div className="flex gap-2">
							{passwordInitialized && (
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="flex-1"
									onClick={() => {
										setEditing(false);
										setPassword("");
										setConfirmPassword("");
										setError(null);
									}}
								>
									Annuler
								</Button>
							)}
							<Button
								type="submit"
								size="sm"
								className="flex-1"
								disabled={isLoading}
							>
								{isLoading
									? "Enregistrement..."
									: passwordInitialized
										? "Modifier le mot de passe"
										: "Définir le mot de passe"}
							</Button>
						</div>
					</form>
				)}
			</CardContent>
		</Card>
	);
}
