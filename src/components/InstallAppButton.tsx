"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import {
	clearInstallPrompt,
	getInstallPrompt,
} from "@/components/PwaInstallPrompt";

export function InstallAppButton() {
	const [available, setAvailable] = useState(false);
	const [isStandalone] = useState(
		() =>
			typeof window !== "undefined" &&
			window.matchMedia("(display-mode: standalone)").matches,
	);

	useEffect(() => {
		// Check if the install prompt is available (event was captured)
		const check = () => setAvailable(!!getInstallPrompt());
		check();
		// Re-check periodically in case event fires late
		const interval = setInterval(check, 1000);
		return () => clearInterval(interval);
	}, []);

	if (isStandalone) {
		return (
			<div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
				<Download className="h-4 w-4 text-green-600" />
				<span className="text-sm text-green-700">App installée</span>
			</div>
		);
	}

	const handleInstall = async () => {
		const prompt = getInstallPrompt();
		if (!prompt) return;
		await prompt.prompt();
		const { outcome } = await prompt.userChoice;
		if (outcome === "accepted") {
			clearInstallPrompt();
			setAvailable(false);
		}
	};

	if (!available) {
		return (
			<div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
				<Download className="h-4 w-4 text-gray-400" />
				<div>
					<p className="text-sm text-gray-500">
						Ouvrez cette page dans Chrome ou Safari pour installer l&apos;app.
					</p>
				</div>
			</div>
		);
	}

	return (
		<button
			type="button"
			onClick={handleInstall}
			className="flex w-full items-center gap-3 p-4 rounded-lg bg-indigo-50 border border-indigo-200 active:bg-indigo-100 transition-colors"
		>
			<div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100">
				<Download className="h-4 w-4 text-indigo-600" />
			</div>
			<div className="text-left">
				<p className="text-sm font-medium text-indigo-700">
					Installer l&apos;application
				</p>
				<p className="text-xs text-indigo-500">
					Ajouter à l&apos;écran d&apos;accueil
				</p>
			</div>
		</button>
	);
}
