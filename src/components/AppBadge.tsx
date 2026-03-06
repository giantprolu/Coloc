"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

interface AppBadgeProps {
	unreadCount: number;
}

/**
 * Sets the PWA app badge (home screen icon) based on unread count.
 * Uses the Badging API (navigator.setAppBadge / clearAppBadge).
 */
export function AppBadge({ unreadCount }: AppBadgeProps) {
	const pathname = usePathname();

	useEffect(() => {
		if (!("setAppBadge" in navigator)) return;

		// Clear badge when user is on the chat page
		if (pathname.startsWith("/chat")) {
			navigator.clearAppBadge?.().catch(() => {});
			return;
		}

		if (unreadCount > 0) {
			navigator.setAppBadge?.(unreadCount).catch(() => {});
		} else {
			navigator.clearAppBadge?.().catch(() => {});
		}
	}, [unreadCount, pathname]);

	return null;
}
