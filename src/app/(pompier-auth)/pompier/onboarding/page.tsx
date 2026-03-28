"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { joinColocationAsPompier } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PompierOnboardingPage() {
	const router = useRouter();

	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [displayName, setDisplayName] = useState("");
	const [inviteCode, setInviteCode] = useState("");

	const handleJoin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		const result = await joinColocationAsPompier(inviteCode, displayName);

		if (result.error) {
			setError(result.error);
			setIsLoading(false);
		} else {
			router.push("/pompier");
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
			<div className="w-full max-w-lg">
				<div className="text-center mb-8">
					<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-600">
						<span className="text-3xl">🚒</span>
					</div>
					<h1 className="text-3xl font-bold text-gray-900">App Pompier</h1>
					<p className="text-gray-500 mt-2">
						Rejoins une coloc avec ton code d&apos;invitation
					</p>
				</div>

				<Card>
					<CardContent className="pt-6">
						<form onSubmit={handleJoin} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="inviteCode">Code d&apos;invitation</Label>
								<Input
									id="inviteCode"
									placeholder="ex : ABC123"
									value={inviteCode}
									onChange={(e) => setInviteCode(e.target.value)}
									maxLength={6}
									className="uppercase text-center text-lg tracking-widest font-mono"
									required
								/>
								<p className="text-xs text-gray-500">
									Demande le code à un membre de la coloc
								</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor="displayName">Ton prénom</Label>
								<Input
									id="displayName"
									placeholder="ex : Nathan"
									value={displayName}
									onChange={(e) => setDisplayName(e.target.value)}
									required
								/>
							</div>

							{error && (
								<p className="text-sm text-red-600 bg-red-50 rounded-md p-3">
									{error}
								</p>
							)}

							<Button
								type="submit"
								className="w-full bg-red-600 hover:bg-red-700"
								disabled={isLoading}
							>
								{isLoading ? "Connexion en cours..." : "Rejoindre"}
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
