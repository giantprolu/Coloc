"use client";

import { Home, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createColocation, joinColocation } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function OnboardingPage() {
	const router = useRouter();

	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Formulaire création coloc
	const [displayName, setDisplayName] = useState("");
	const [room, setRoom] = useState("");
	const [colocName, setColocName] = useState("");

	// Formulaire rejoindre coloc
	const [joinDisplayName, setJoinDisplayName] = useState("");
	const [joinRoom, setJoinRoom] = useState("");
	const [inviteCode, setInviteCode] = useState("");

	const handleCreateColoc = async (
		e: React.SyntheticEvent<HTMLFormElement>,
	) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		const result = await createColocation(colocName, displayName, room);

		if (result.error) {
			setError(result.error);
			setIsLoading(false);
		} else {
			router.push("/dashboard");
		}
	};

	const handleJoinColoc = async (e: React.SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		const result = await joinColocation(inviteCode, joinDisplayName, joinRoom);

		if (result.error) {
			setError(result.error);
			setIsLoading(false);
		} else {
			router.push("/dashboard");
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
			<div className="w-full max-w-lg">
				<div className="text-center mb-8">
					<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600">
						<Home className="h-7 w-7 text-white" />
					</div>
					<h1 className="text-3xl font-bold text-gray-900">Bienvenue !</h1>
					<p className="text-gray-500 mt-2">
						Rejoignez ou créez votre colocation pour commencer
					</p>
				</div>

				<Card>
					<CardContent className="pt-6">
						<Tabs defaultValue="create">
							<TabsList className="grid w-full grid-cols-2 mb-6">
								<TabsTrigger value="create">
									<Home className="mr-2 h-4 w-4" />
									Créer une coloc
								</TabsTrigger>
								<TabsTrigger value="join">
									<Users className="mr-2 h-4 w-4" />
									Rejoindre
								</TabsTrigger>
							</TabsList>

							{/* Onglet création */}
							<TabsContent value="create">
								<form onSubmit={handleCreateColoc} className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="colocName">Nom de la colocation</Label>
										<Input
											id="colocName"
											placeholder="ex : Appart des Grands Boulevards"
											value={colocName}
											onChange={(e) => setColocName(e.target.value)}
											required
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="displayName">Votre prénom</Label>
										<Input
											id="displayName"
											placeholder="ex : Nathan"
											value={displayName}
											onChange={(e) => setDisplayName(e.target.value)}
											required
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="room">
											Votre chambre{" "}
											<span className="text-gray-400">(optionnel)</span>
										</Label>
										<Input
											id="room"
											placeholder="ex : Chambre 1"
											value={room}
											onChange={(e) => setRoom(e.target.value)}
										/>
									</div>

									{error && (
										<p className="text-sm text-red-600 bg-red-50 rounded-md p-3">
											{error}
										</p>
									)}

									<Button
										type="submit"
										className="w-full bg-indigo-600 hover:bg-indigo-700"
										disabled={isLoading}
									>
										{isLoading ? "Création en cours..." : "Créer ma colocation"}
									</Button>
								</form>
							</TabsContent>

							{/* Onglet rejoindre */}
							<TabsContent value="join">
								<form onSubmit={handleJoinColoc} className="space-y-4">
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
											Demandez le code à l&apos;un de vos colocataires
										</p>
									</div>
									<div className="space-y-2">
										<Label htmlFor="joinDisplayName">Votre prénom</Label>
										<Input
											id="joinDisplayName"
											placeholder="ex : Nathan"
											value={joinDisplayName}
											onChange={(e) => setJoinDisplayName(e.target.value)}
											required
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="joinRoom">
											Votre chambre{" "}
											<span className="text-gray-400">(optionnel)</span>
										</Label>
										<Input
											id="joinRoom"
											placeholder="ex : Chambre 2"
											value={joinRoom}
											onChange={(e) => setJoinRoom(e.target.value)}
										/>
									</div>

									{error && (
										<p className="text-sm text-red-600 bg-red-50 rounded-md p-3">
											{error}
										</p>
									)}

									<Button
										type="submit"
										className="w-full bg-indigo-600 hover:bg-indigo-700"
										disabled={isLoading}
									>
										{isLoading
											? "Rejoindre en cours..."
											: "Rejoindre la colocation"}
									</Button>
								</form>
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
