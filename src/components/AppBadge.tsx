"use client";

import { useEffect } from "react";

/**
 * Clears the PWA app badge when the user opens or foregrounds the app.
 * The badge is SET by the service worker on every push notification received
 * (for all notification types: chat, events, emergency, etc.).
 */
export function AppBadge() {
	useEffect(() => {
		if (!("setAppBadge" in navigator)) return;

		// Clear badge immediately when component mounts (app just opened)
		navigator.clearAppBadge?.().catch(() => {});

		// Clear badge when app comes back to foreground
		const handleVisibility = () => {
			if (document.visibilityState === "visible") {
				navigator.clearAppBadge?.().catch(() => {});
			}
		};

		document.addEventListener("visibilitychange", handleVisibility);
		return () =>
			document.removeEventListener("visibilitychange", handleVisibility);
	}, []);

	return null;
}
