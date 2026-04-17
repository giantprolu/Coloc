"use client";

import { Share, X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "pompier-install-dismissed";

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
	const ua = navigator.userAgent;
	if (/iPhone|iPad|iPod/.test(ua)) return "ios";
	if (/Android/.test(ua)) return "android";
	return "other";
}

function isStandalone(): boolean {
	return (
		window.matchMedia("(display-mode: standalone)").matches ||
		Boolean((window.navigator as { standalone?: boolean }).standalone)
	);
}

export function PompierInstallPrompt() {
	const [visible, setVisible] = useState(false);
	const [platform, setPlatform] = useState<Platform>("other");

	useEffect(() => {
		if (localStorage.getItem(DISMISSED_KEY)) return;
		if (isStandalone()) return;

		const p = detectPlatform();
		if (p === "other") return;

		setPlatform(p);
		const timer = setTimeout(() => setVisible(true), 3000);
		return () => clearTimeout(timer);
	}, []);

	const dismiss = (permanent: boolean) => {
		if (permanent) localStorage.setItem(DISMISSED_KEY, "1");
		setVisible(false);
	};

	if (!visible) return null;

	return (
		<div className="fixed bottom-4 left-4 right-4 z-[70] mx-auto max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300">
			<div className="rounded-2xl border border-red-100 bg-white shadow-xl p-4">
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-center gap-3 flex-1 min-w-0">
						<div className="text-3xl flex-shrink-0">🚒</div>
						<div>
							<p className="text-sm font-semibold text-gray-900">
								Installer l&apos;App Pompier
							</p>
							{platform === "ios" ? (
								<p className="text-xs text-gray-500 mt-0.5">
									Appuie sur{" "}
									<span className="inline-flex items-center gap-0.5 font-medium text-gray-700">
										<Share className="h-3 w-3" /> Partager
									</span>{" "}
									puis <strong>« Sur l&apos;écran d&apos;accueil »</strong> pour recevoir les alertes.
								</p>
							) : (
								<p className="text-xs text-gray-500 mt-0.5">
									Ouvre le menu Chrome <strong>⋮</strong> puis{" "}
									<strong>« Ajouter à l&apos;écran d&apos;accueil »</strong> pour recevoir les alertes.
								</p>
							)}
						</div>
					</div>
					<button
						type="button"
						onClick={() => dismiss(false)}
						className="flex-shrink-0 text-gray-400 active:text-gray-600 mt-0.5"
						aria-label="Fermer"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
				<div className="flex gap-2 mt-3">
					<button
						type="button"
						onClick={() => dismiss(true)}
						className="flex-1 rounded-lg border border-gray-200 py-2 text-xs text-gray-500 active:bg-gray-50"
					>
						Ne plus afficher
					</button>
					<button
						type="button"
						onClick={() => dismiss(false)}
						className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-medium text-white active:bg-red-700"
					>
						OK, j&apos;installe
					</button>
				</div>
			</div>
		</div>
	);
}
