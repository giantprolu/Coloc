"use client";

import { Database } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cleanupOrphanedData } from "@/app/actions/members";
import { Button } from "@/components/ui/button";

interface CleanupOrphanedButtonProps {
	colocationId: string;
}

export function CleanupOrphanedButton({
	colocationId,
}: CleanupOrphanedButtonProps) {
	const [isLoading, setIsLoading] = useState(false);

	const handleCleanup = async () => {
		setIsLoading(true);
		try {
			const result = await cleanupOrphanedData(colocationId);
			if (result.cleaned > 0) {
				toast.success(
					`Nettoyage terminé : ${result.cleaned} enregistrement${result.cleaned > 1 ? "s" : ""} orphelin${result.cleaned > 1 ? "s" : ""} supprimé${result.cleaned > 1 ? "s" : ""}`,
				);
			} else {
				toast.success("Aucune donnée orpheline trouvée");
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Erreur");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleCleanup}
			disabled={isLoading}
			className="w-full"
		>
			<Database className="mr-2 h-4 w-4" />
			{isLoading ? "Nettoyage en cours..." : "Vérifier et nettoyer la BDD"}
		</Button>
	);
}
