"use client";

import { Home } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

export default function LoginPage() {
	const searchParams = useSearchParams();
	const next = searchParams.get("next") || "";
	const isPompier = next.startsWith("/pompier");

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();
	const supabase = createClient();

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			setError(
				error.message === "Invalid login credentials"
					? "Email ou mot de passe incorrect."
					: "Erreur lors de la connexion.",
			);
			setIsLoading(false);
			return;
		}

		// Redirige vers la destination appropriée
		router.push(isPompier ? "/pompier" : "/dashboard");
	};

	const signupHref = isPompier
		? `/signup?next=${encodeURIComponent(next)}`
		: "/signup";
	const forgotHref = isPompier
		? `/forgot-password?next=${encodeURIComponent(next)}`
		: "/forgot-password";

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
							? "Connecte-toi pour accéder au bouton pompier"
							: "Gérez facilement votre vie en colocation"}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<form onSubmit={handleLogin} className="space-y-3">
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
							<div className="flex items-center justify-between">
								<Label htmlFor="password">Mot de passe</Label>
								<Link
									href={forgotHref}
									className={`text-xs ${
										isPompier
											? "text-red-600 hover:text-red-500"
											: "text-indigo-600 hover:text-indigo-500"
									}`}
								>
									Mot de passe oublié ?
								</Link>
							</div>
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
							{isLoading ? "Connexion..." : "Se connecter"}
						</Button>
					</form>
					<p className="text-center text-sm text-gray-500">
						Pas encore de compte ?{" "}
						<Link
							href={signupHref}
							className={`font-medium ${
								isPompier
									? "text-red-600 hover:text-red-500"
									: "text-indigo-600 hover:text-indigo-500"
							}`}
						>
							Créer un compte
						</Link>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
