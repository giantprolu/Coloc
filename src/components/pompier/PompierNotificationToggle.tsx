"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const rawData = atob(base64);
	const arr = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
	return arr.buffer;
}

type NotifState = "loading" | "unsupported" | "denied" | "enabled" | "disabled";

export function PompierNotificationToggle() {
	const [state, setState] = useState<NotifState>("loading");

	useEffect(() => {
		if (!("Notification" in window) || !("serviceWorker" in navigator)) {
			setState("unsupported");
			return;
		}
		if (Notification.permission === "denied") {
			setState("denied");
			return;
		}
		if (Notification.permission === "granted") {
			// Check if actually subscribed
			navigator.serviceWorker.ready.then((reg) => {
				reg.pushManager.getSubscription().then((sub) => {
					setState(sub ? "enabled" : "disabled");
				});
			});
			return;
		}
		setState("disabled");
	}, []);

	const handleEnable = async () => {
		setState("loading");
		try {
			const permission = await Notification.requestPermission();
			if (permission !== "granted") {
				setState(permission === "denied" ? "denied" : "disabled");
				return;
			}

			const registration = await navigator.serviceWorker.ready;
			const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(vapidKey),
			});

			const res = await fetch("/api/push/subscribe", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ subscription }),
			});
			if (!res.ok) throw new Error("Erreur serveur abonnement");

			setState("enabled");
			toast.success("Notifications activées !");
		} catch {
			toast.error("Impossible d'activer les notifications");
			setState("disabled");
		}
	};

	const handleDisable = async () => {
		setState("loading");
		try {
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.getSubscription();
			if (subscription) {
				await subscription.unsubscribe();
			}
			setState("disabled");
			toast.success("Notifications désactivées");
		} catch {
			toast.error("Erreur");
			setState("enabled");
		}
	};

	if (state === "unsupported") return null;

	return (
		<Button
			variant="ghost"
			size="icon"
			className="h-9 w-9"
			onClick={state === "enabled" ? handleDisable : handleEnable}
			disabled={state === "loading" || state === "denied"}
			title={
				state === "denied"
					? "Notifications bloquées par le navigateur"
					: state === "enabled"
						? "Désactiver les notifications"
						: "Activer les notifications"
			}
		>
			{state === "enabled" ? (
				<Bell className="h-5 w-5 text-red-600" />
			) : (
				<BellOff className="h-5 w-5 text-gray-400" />
			)}
		</Button>
	);
}
