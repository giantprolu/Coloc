"use client";

import { Calendar, Home, MessageSquare, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const CHAT_TAGS = new Set(["chat_message", "chat_mention"]);

const navItems = [
	{ href: "/dashboard", label: "Accueil", icon: Home },
	{ href: "/calendar", label: "Calendrier", icon: Calendar },
	{ href: "/chat", label: "Chat", icon: MessageSquare },
	{ href: "/settings", label: "Réglages", icon: Settings },
];

interface BottomNavProps {
	hasUnreadChat?: boolean;
}

export function BottomNav({ hasUnreadChat }: BottomNavProps) {
	const pathname = usePathname();
	const [hidden, setHidden] = useState(false);
	const [hasNewChatPush, setHasNewChatPush] = useState(false);
	const [hasNewOtherPush, setHasNewOtherPush] = useState(false);

	useEffect(() => {
		const hide = () => setHidden(true);
		const show = () => setHidden(false);
		window.addEventListener("chat-input-focus", hide);
		window.addEventListener("chat-input-blur", show);
		return () => {
			window.removeEventListener("chat-input-focus", hide);
			window.removeEventListener("chat-input-blur", show);
		};
	}, []);

	// Listen for push notifications from service worker
	useEffect(() => {
		const handler = (event: MessageEvent) => {
			if (event.data?.type === "push-received") {
				if (CHAT_TAGS.has(event.data.tag)) {
					setHasNewChatPush(true);
				} else {
					setHasNewOtherPush(true);
				}
			}
		};
		navigator.serviceWorker?.addEventListener("message", handler);
		return () =>
			navigator.serviceWorker?.removeEventListener("message", handler);
	}, []);

	if (hidden) return null;

	return (
		<nav
			aria-label="Navigation principale"
			className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
		>
			<div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
				{navItems.map((item) => {
					const Icon = item.icon;
					const isActive = pathname.startsWith(item.href);

					// Show dot on Chat for chat notifications
					const showChatBadge =
						item.href === "/chat" &&
						(hasUnreadChat || hasNewChatPush) &&
						!isActive;

					// Show dot on Accueil for other notifications (events, emergency, etc.)
					const showOtherBadge =
						item.href === "/dashboard" && hasNewOtherPush && !isActive;

					const showBadge = showChatBadge || showOtherBadge;

					return (
						<Link
							key={item.href}
							href={item.href}
							onClick={() => {
								if (item.href === "/chat") setHasNewChatPush(false);
								if (item.href === "/dashboard") setHasNewOtherPush(false);
							}}
							aria-current={isActive ? "page" : undefined}
							className={cn(
								"relative flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
								isActive
									? "text-indigo-600"
									: "text-gray-500 hover:text-gray-900",
							)}
						>
							<span className="relative">
								<Icon
									className={cn("h-5 w-5", isActive && "stroke-[2.5]")}
									aria-hidden="true"
								/>
								{showBadge && (
									<span
										className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500"
										aria-label="Notifications non lues"
									/>
								)}
							</span>
							<span>{item.label}</span>
							{isActive && (
								<span
									className="absolute bottom-1 h-1 w-1 rounded-full bg-indigo-600"
									aria-hidden="true"
								/>
							)}
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
