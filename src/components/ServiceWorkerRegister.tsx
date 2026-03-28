"use client";

import { useEffect } from "react";

interface ServiceWorkerRegisterProps {
	swPath?: string;
	scope?: string;
}

export default function ServiceWorkerRegister({
	swPath = "/sw.js",
	scope,
}: ServiceWorkerRegisterProps) {
	useEffect(() => {
		if ("serviceWorker" in navigator) {
			const options = scope ? { scope } : undefined;
			navigator.serviceWorker.register(swPath, options).catch((err) => {
				console.error("SW registration failed:", err);
			});
		}
	}, [swPath, scope]);

	return null;
}
