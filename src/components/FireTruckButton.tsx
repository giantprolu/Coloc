"use client";

import { useState } from "react";
import { toast } from "sonner";
import { sendEmergencyNotification } from "@/app/actions/emergency";

interface FireTruckButtonProps {
	colocationId: string;
}

export function FireTruckButton({ colocationId }: FireTruckButtonProps) {
	const [loading, setLoading] = useState(false);

	const handleClick = async () => {
		if (loading) return;
		setLoading(true);
		try {
			await sendEmergencyNotification(colocationId);
			toast.success("🚒 Notification envoyée !");
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
		<button
			type="button"
			onClick={handleClick}
			disabled={loading}
			aria-label="Bouton camion de pompier"
			className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 border border-red-100 text-2xl active:scale-95 active:bg-red-100 transition-all disabled:opacity-50"
		>
			🚒
		</button>
	);
}
