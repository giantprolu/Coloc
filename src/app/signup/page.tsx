"use client";

import { Home } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { signUpPompier } from "@/app/actions/auth";
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
	const searchParams = useSearchParams();
	const next = searchParams.get("next") || "";
	const isPompier = next.startsWith("/pompier");

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

		if (isPompier) {
			// Inscription pompier : email custom via Resend
			const result = await signUpPompier(
				email,
				password,
				window.location.origin,
			);
			if (result.error) {
				setError(result.error);
				setIsLoading(false);
				return;
			}
		} else {
			// Inscription coloc : email classique via Supabase
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
		}

		setIsConfirmation(true);
		setIsLoading(false);
	};

	const loginHref = isPompier ? `/login?next=${encodeURIComponent(next)}` : "/login";

	return (
		<div
			className={`min-h-screen flex items-center justify-center p-4 ${
				isPompier
					? "bg-gradient-to-br from-red-50 to-orange-50"
					: "bg-gradient-to-br from-indigo-50 to-purple-50"
			}`}
		>
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div
						className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
							isPompier ? "bg-red-600" : "bg-indigo-600"
						}`}
					>
						{isPompier ? (
							<span className="text-2xl">🚒</span>
						) : (
							<Home className="h-6 w-6 text-white" />
						)}
					</div>
					<CardTitle className="text-2xl font-bold">
						{isPompier ? "App Pompier" : "ColocEvents"}
					</CardTitle>
					<CardDescription>
						{isPompier
							? "Créer un compte pour accéder au bouton pompier"
							: "Créer un compte"}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{isConfirmation ? (
						<div className="text-center space-y-3">
							<p className="font-medium text-gray-900">
								Vérifiez vos emails !
							</p>
							<p className="text-sm text-gray-500">
								Un lien de confirmation a été envoyé à{" "}
								<span className="font-medium">{email}</span>
							</p>
							<Link href={loginHref}>
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
										onChange={(e) =>
											setConfirmPassword(e.target.value)
										}
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
									className={`w-full ${
										isPompier
											? "bg-red-600 hover:bg-red-700"
											: "bg-indigo-600 hover:bg-indigo-700"
									}`}
									disabled={isLoading}
								>
									{isLoading ? "Inscription..." : "Créer un compte"}
								</Button>
							</form>
							<p className="text-center text-sm text-gray-500">
								Déjà un compte ?{" "}
								<Link
									href={loginHref}
									className={`font-medium ${
										isPompier
											? "text-red-600 hover:text-red-500"
											: "text-indigo-600 hover:text-indigo-500"
									}`}
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
