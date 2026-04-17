"use client";

import { Bug, Send, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { recordTestFiretruckClick, sendTestPushPompier } from "@/app/actions/dev";
import type { FiretruckLocationType } from "@/types";

export function PompierDevSection() {
	const [sendingNotif, setSendingNotif] = useState(false);
	const [sendingClick, setSendingClick] = useState(false);

	// État pour le clic de test
	const [testRating, setTestRating] = useState(3);
	const [testLocation, setTestLocation] = useState<FiretruckLocationType | null>(null);
	const [testDesc, setTestDesc] = useState("");

	const handleTestNotif = async () => {
		setSendingNotif(true);
		try {
			await sendTestPushPompier();
			toast.success("Notification test envoyée !");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Erreur");
		} finally {
			setSendingNotif(false);
		}
	};

	const handleTestClick = async () => {
		setSendingClick(true);
		try {
			await recordTestFiretruckClick(testRating, testLocation, testDesc.trim() || null);
			toast.success("Clic test ajouté dans le feed !");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Erreur");
		} finally {
			setSendingClick(false);
		}
	};

	return (
		<div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 space-y-4">
			<div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
				<Bug className="h-3.5 w-3.5" />
				Section dev (test)
			</div>

			{/* Test notification */}
			<div className="space-y-1.5">
				<p className="text-xs font-medium text-gray-600">Notification push</p>
				<button
					type="button"
					disabled={sendingNotif}
					onClick={handleTestNotif}
					className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-200 py-2 text-sm font-medium text-gray-700 active:bg-gray-300 disabled:opacity-50"
				>
					<Send className="h-4 w-4" />
					{sendingNotif ? "Envoi..." : "Envoyer une notif test"}
				</button>
			</div>

			{/* Test clic */}
			<div className="space-y-2">
				<p className="text-xs font-medium text-gray-600">Note d&apos;expérience test</p>

				{/* Étoiles */}
				<div className="flex gap-1 justify-center">
					{[1, 2, 3, 4, 5].map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => setTestRating(s)}
							className="transition-transform active:scale-95"
							aria-label={`${s} étoile${s > 1 ? "s" : ""}`}
						>
							<Star
								className={`h-7 w-7 transition-colors ${
									s <= testRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
								}`}
							/>
						</button>
					))}
				</div>

				{/* Lieu */}
				<div className="flex gap-2">
					{(["domicile", "exterieur"] as FiretruckLocationType[]).map((loc) => (
						<button
							key={loc}
							type="button"
							onClick={() => setTestLocation(testLocation === loc ? null : loc)}
							className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
								testLocation === loc
									? "bg-gray-300 border-gray-400 text-gray-800"
									: "border-gray-200 text-gray-500"
							}`}
						>
							{loc === "domicile" ? "🏠 Domicile" : "🌍 Extérieur"}
						</button>
					))}
				</div>

				{/* Description */}
				<input
					type="text"
					value={testDesc}
					onChange={(e) => setTestDesc(e.target.value)}
					placeholder="Description (optionnel)"
					maxLength={200}
					className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-300 focus:outline-none"
				/>

				<button
					type="button"
					disabled={sendingClick}
					onClick={handleTestClick}
					className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-200 py-2 text-sm font-medium text-gray-700 active:bg-gray-300 disabled:opacity-50"
				>
					{sendingClick ? "Envoi..." : "Ajouter dans le feed"}
				</button>
			</div>
		</div>
	);
}
