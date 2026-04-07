"use client";

import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const DISMISSED_KEY = "notif-prompt-dismissed";

interface NotificationPromptProps {
	variant?: "coloc" | "pompier";
}

export function NotificationPrompt({ variant = "coloc" }: NotificationPromptProps) {
	const isPompier = variant === "pompier";
	const [visible, setVisible] = useState(false);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		// Vérifier si les notifications sont supportées
		if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
		// Déjà accordé ou refusé → ne pas afficher
		if (Notification.permission !== "default") return;
		// Déjà dismissé cette session
		if (sessionStorage.getItem(DISMISSED_KEY)) return;
		// Afficher après un court délai pour ne pas bloquer
		const timer = setTimeout(() => setVisible(true), 2000);
		return () => clearTimeout(timer);
	}, []);

	const handleEnable = async () => {
		setLoading(true);
		try {
			const permission = await Notification.requestPermission();
			if (permission === "granted") {
				const registration = await navigator.serviceWorker.ready;
				const subscription = await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
				});

				await fetch("/api/push/subscribe", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ subscription }),
				});

				toast.success("Notifications activées !");
			}
			setVisible(false);
		} catch {
			toast.error("Impossible d'activer les notifications");
		} finally {
			setLoading(false);
		}
	};

	const dismiss = () => {
		sessionStorage.setItem(DISMISSED_KEY, "1");
		setVisible(false);
	};

	if (!visible) return null;

	return (
		<div className="fixed top-4 left-4 right-4 z-[60] mx-auto max-w-md animate-in slide-in-from-top-4 fade-in duration-300">
			<div className="rounded-xl border bg-white shadow-lg p-4 flex items-start gap-3">
				<div className={`flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0 ${isPompier ? "bg-red-100" : "bg-indigo-100"}`}>
					<Bell className={`h-5 w-5 ${isPompier ? "text-red-600" : "text-indigo-600"}`} />
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium text-gray-900">
						Activer les notifications
					</p>
					<p className="text-xs text-gray-500 mt-0.5">
						{isPompier
							? "Recevez une alerte quand quelqu'un appuie sur le bouton."
							: "Recevez les messages du chat, les mentions et les alertes de la coloc."}
					</p>
					<div className="flex gap-2 mt-2">
						<button
							type="button"
							onClick={handleEnable}
							disabled={loading}
							className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 ${isPompier ? "bg-red-600 active:bg-red-700" : "bg-indigo-600 active:bg-indigo-700"}`}
						>
							{loading ? "Activation..." : "Activer"}
						</button>
						<button
							type="button"
							onClick={dismiss}
							className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 active:bg-gray-50"
						>
							Plus tard
						</button>
					</div>
				</div>
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
