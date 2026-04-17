"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { FiretruckLocationType } from "@/types";

interface FiretruckRatingModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (
		rating: number,
		locationType: FiretruckLocationType | null,
		description: string | null,
	) => void;
	loading: boolean;
}

export function FiretruckRatingModal({
	open,
	onOpenChange,
	onSubmit,
	loading,
}: FiretruckRatingModalProps) {
	const [rating, setRating] = useState(0);
	const [hovered, setHovered] = useState(0);
	const [locationType, setLocationType] = useState<FiretruckLocationType | null>(null);
	const [description, setDescription] = useState("");

	const handleSubmit = () => {
		if (rating > 0) {
			onSubmit(rating, locationType, description.trim() || null);
		}
	};

	const handleOpenChange = (value: boolean) => {
		if (!value) {
			setRating(0);
			setLocationType(null);
			setDescription("");
		}
		onOpenChange(value);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent showCloseButton={!loading}>
				<DialogHeader>
					<DialogTitle className="text-center text-2xl">
						🚒 Note ton expérience
					</DialogTitle>
					<DialogDescription className="text-center">
						Donne une note de 1 à 5 étoiles
					</DialogDescription>
				</DialogHeader>

				{/* Étoiles */}
				<div className="flex justify-center gap-2 py-2">
					{[1, 2, 3, 4, 5].map((star) => (
						<button
							key={star}
							type="button"
							disabled={loading}
							onClick={() => setRating(star)}
							onMouseEnter={() => setHovered(star)}
							onMouseLeave={() => setHovered(0)}
							className="transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
							aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
						>
							<Star
								className={`h-10 w-10 transition-colors ${
									star <= (hovered || rating)
										? "fill-yellow-400 text-yellow-400"
										: "text-gray-300"
								}`}
							/>
						</button>
					))}
				</div>

				{/* Lieu */}
				<div className="space-y-1.5">
					<p className="text-xs font-medium text-gray-500 text-center">
						Où ? <span className="text-gray-400">(optionnel)</span>
					</p>
					<div className="flex gap-2 justify-center">
						<button
							type="button"
							disabled={loading}
							onClick={() => setLocationType(locationType === "domicile" ? null : "domicile")}
							className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${
								locationType === "domicile"
									? "bg-red-50 border-red-300 text-red-700"
									: "border-gray-200 text-gray-500 hover:bg-gray-50"
							}`}
						>
							🏠 Domicile
						</button>
						<button
							type="button"
							disabled={loading}
							onClick={() => setLocationType(locationType === "exterieur" ? null : "exterieur")}
							className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${
								locationType === "exterieur"
									? "bg-red-50 border-red-300 text-red-700"
									: "border-gray-200 text-gray-500 hover:bg-gray-50"
							}`}
						>
							🌍 Extérieur
						</button>
					</div>
				</div>

				{/* Description */}
				<div className="space-y-1.5">
					<p className="text-xs font-medium text-gray-500 text-center">
						Description <span className="text-gray-400">(optionnel)</span>
					</p>
					<textarea
						disabled={loading}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						maxLength={200}
						placeholder="Un petit mot ? (max 200 caractères)"
						rows={2}
						className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-red-300 disabled:opacity-50"
					/>
				</div>

				<DialogFooter>
					<Button
						onClick={handleSubmit}
						disabled={rating === 0 || loading}
						className="w-full bg-red-500 hover:bg-red-600"
					>
						{loading ? "Envoi..." : "Envoyer 🚒"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
