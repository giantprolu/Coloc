"use client";

import { Home } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isConfirmation, setIsConfirmation] = useState(false);
	const supabase = createClient();

	const handleSignup = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (password !== confirmPassword) {
			setError("Les mots de passe ne correspondent pas.");
			return;
		}

		setIsLoading(true);

		const { error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: `${window.location.origin}/auth/callback`,
			},
		});

		if (error) {
			setError(
				error.message === "User already registered"
					? "Un compte existe déjà avec cet email."
					: "Erreur lors de l'inscription.",
			);
			setIsLoading(false);
			return;
		}

		setIsConfirmation(true);
		setIsLoading(false);
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600">
						<Home className="h-6 w-6 text-white" />
					</div>
					<CardTitle className="text-2xl font-bold">ColocEvents</CardTitle>
					<CardDescription>Créer un compte</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{isConfirmation ? (
						<div className="text-center space-y-3">
							<p className="font-medium text-gray-900">Vérifiez vos emails !</p>
							<p className="text-sm text-gray-500">
								Un lien de confirmation a été envoyé à{" "}
								<span className="font-medium">{email}</span>
							</p>
							<Link href="/login">
								<Button variant="ghost" className="text-sm">
									Retour à la connexion
								</Button>
							</Link>
						</div>
					) : (
						<>
							<form onSubmit={handleSignup} className="space-y-3">
								<div className="space-y-2">
									<Label htmlFor="email">Adresse email</Label>
									<Input
										id="email"
										type="email"
										placeholder="toi@example.com"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="password">Mot de passe</Label>
									<Input
										id="password"
										type="password"
										placeholder="••••••••"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
										minLength={6}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="confirmPassword">
										Confirmer le mot de passe
									</Label>
									<Input
										id="confirmPassword"
										type="password"
										placeholder="••••••••"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										required
										minLength={6}
									/>
								</div>
								{error && (
									<p className="text-sm text-red-600 bg-red-50 rounded-md p-2">
										{error}
									</p>
								)}
								<Button
									type="submit"
									className="w-full bg-indigo-600 hover:bg-indigo-700"
									disabled={isLoading}
								>
									{isLoading ? "Inscription..." : "Créer un compte"}
								</Button>
							</form>
							<p className="text-center text-sm text-gray-500">
								Déjà un compte ?{" "}
								<Link
									href="/login"
									className="font-medium text-indigo-600 hover:text-indigo-500"
								>
									Se connecter
								</Link>
							</p>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
