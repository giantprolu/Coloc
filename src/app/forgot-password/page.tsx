"use client";

import { Home } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { resetPasswordForEmail } from "@/app/actions/auth";
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

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isSent, setIsSent] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		const result = await resetPasswordForEmail(email);

		if (result.error) {
			setError("Erreur lors de l'envoi de l'email. Veuillez réessayer.");
			setIsLoading(false);
			return;
		}

		setIsSent(true);
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
					<CardDescription>Réinitialiser votre mot de passe</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{isSent ? (
						<div className="text-center space-y-3">
							<p className="font-medium text-gray-900">Vérifiez vos emails !</p>
							<p className="text-sm text-gray-500">
								Un lien de réinitialisation a été envoyé à{" "}
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
							<form onSubmit={handleSubmit} className="space-y-3">
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
									{isLoading ? "Envoi..." : "Envoyer le lien"}
								</Button>
							</form>
							<p className="text-center text-sm text-gray-500">
								<Link
									href="/login"
									className="font-medium text-indigo-600 hover:text-indigo-500"
								>
									Retour à la connexion
								</Link>
							</p>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
