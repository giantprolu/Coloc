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

interface FiretruckRatingModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (rating: number) => void;
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

	const handleSubmit = () => {
		if (rating > 0) {
			onSubmit(rating);
		}
	};

	const handleOpenChange = (value: boolean) => {
		if (!value) setRating(0);
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

				<div className="flex justify-center gap-2 py-4">
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
