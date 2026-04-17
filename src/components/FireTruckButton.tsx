"use client";

import { useState } from "react";
import { toast } from "sonner";
import { recordFiretruckClick } from "@/app/actions/firetruck";
import { FiretruckRatingModal } from "@/components/firetruck/FiretruckRatingModal";
import type { FiretruckLocationType } from "@/types";

interface FireTruckButtonProps {
	colocationId: string;
	isPompier?: boolean;
	pompierUserId?: string;
}

export function FireTruckButton({
	colocationId,
	isPompier = false,
	pompierUserId,
}: FireTruckButtonProps) {
	const [loading, setLoading] = useState(false);
	const [modalOpen, setModalOpen] = useState(false);

	const handleSubmit = async (
		rating: number,
		locationType: FiretruckLocationType | null,
		description: string | null,
	) => {
		if (loading) return;
		setLoading(true);
		try {
			await recordFiretruckClick(
				colocationId,
				rating,
				isPompier ? pompierUserId : undefined,
				locationType,
				description,
			);
			toast.success("🚒 Notification envoyée !");
			setModalOpen(false);
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: "Impossible d'envoyer la notification",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<button
				type="button"
				onClick={() => setModalOpen(true)}
				disabled={loading}
				aria-label="Bouton camion de pompier"
				className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 border border-red-100 text-2xl active:scale-95 active:bg-red-100 transition-all disabled:opacity-50"
			>
				🚒
			</button>

			<FiretruckRatingModal
				open={modalOpen}
				onOpenChange={setModalOpen}
				onSubmit={handleSubmit}
				loading={loading}
			/>
		</>
	);
}
