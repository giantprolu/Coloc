"use client";

import { Download, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const DISMISSED_KEY = "pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Store the deferred prompt globally so the settings install button can use it
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
	return globalDeferredPrompt;
}

export function clearInstallPrompt() {
	globalDeferredPrompt = null;
}

export function PwaInstallPrompt() {
	const [visible, setVisible] = useState(false);
	const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

	useEffect(() => {
		// Ne pas afficher si déjà en mode standalone (PWA installée)
		if (window.matchMedia("(display-mode: standalone)").matches) return;

		const handler = (e: Event) => {
			e.preventDefault();
			const event = e as BeforeInstallPromptEvent;
			deferredPrompt.current = event;
			globalDeferredPrompt = event;

			// Ne pas afficher le banner si déjà dismissé
			const dismissed = localStorage.getItem(DISMISSED_KEY);
			if (!dismissed) {
				setVisible(true);
			}
		};

		window.addEventListener("beforeinstallprompt", handler);
		return () => window.removeEventListener("beforeinstallprompt", handler);
	}, []);

	const handleInstall = async () => {
		const prompt = deferredPrompt.current;
		if (!prompt) return;

		await prompt.prompt();
		const { outcome } = await prompt.userChoice;
		if (outcome === "accepted") {
			setVisible(false);
			globalDeferredPrompt = null;
		}
		deferredPrompt.current = null;
	};

	const dismiss = () => {
		localStorage.setItem(DISMISSED_KEY, "1");
		setVisible(false);
	};

	if (!visible) return null;

	return (
		<div className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300">
			<div className="rounded-xl border bg-white shadow-lg p-4 flex items-center gap-3">
				<div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 flex-shrink-0">
					<Download className="h-5 w-5 text-indigo-600" />
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium text-gray-900">
						Installer l&apos;app
					</p>
					<p className="text-xs text-gray-500">
						Ajoutez ColocEvents à votre écran d&apos;accueil pour un accès
						rapide.
					</p>
				</div>
				<button
					type="button"
					onClick={handleInstall}
					className="flex-shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white active:bg-indigo-700"
				>
					Installer
				</button>
				<button
					type="button"
					onClick={dismiss}
					className="flex-shrink-0 text-gray-400 active:text-gray-600"
					aria-label="Fermer"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
}
