const CACHE_NAME = "pompier-v1";

// Install — cache le minimum
self.addEventListener("install", (event) => {
	self.skipWaiting();
});

// Activate — nettoie les anciens caches
self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((names) =>
				Promise.all(
					names
						.filter((name) => name !== CACHE_NAME)
						.map((name) => caches.delete(name)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

// Fetch — network first, fallback to cache
self.addEventListener("fetch", (event) => {
	if (event.request.method !== "GET") return;
	const url = new URL(event.request.url);
	if (url.pathname.startsWith("/api/")) return;
	if (url.pathname.startsWith("/auth/")) return;

	event.respondWith(
		fetch(event.request)
			.then((response) => {
				if (response.ok && response.type === "basic") {
					const clone = response.clone();
					caches
						.open(CACHE_NAME)
						.then((cache) => cache.put(event.request, clone));
				}
				return response;
			})
			.catch(() => caches.match(event.request)),
	);
});

// Push notification handler
self.addEventListener("push", (event) => {
	if (!event.data) return;

	let data;
	try {
		data = event.data.json();
	} catch (e) {
		data = { title: "App Pompier", body: event.data.text() };
	}

	const isEmergency = data.tag === "emergency" || data.tag === "firetruck";

	const options = {
		body: data.body || "",
		icon: data.icon || "/icons/icon-192.png",
		badge: data.badge || "/icons/icon-192.png",
		tag: data.tag || "default",
		data: { url: data.url || "/pompier" },
		vibrate: isEmergency ? [500, 200, 500, 200, 500] : [200, 100, 200],
		renotify: true,
		requireInteraction: isEmergency,
	};

	event.waitUntil(
		Promise.all([
			self.registration.showNotification(
				data.title || "App Pompier",
				options,
			),
			self.clients
				.matchAll({ type: "window", includeUncontrolled: true })
				.then(async (clients) => {
					const hasFocusedClient = clients.some((c) => c.focused);
					if (!hasFocusedClient && navigator.setAppBadge) {
						await navigator.setAppBadge(1).catch(() => {});
					}
					for (const client of clients) {
						client.postMessage({
							type: "push-received",
							tag: data.tag || "default",
						});
					}
				}),
		]),
	);
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
	event.notification.close();

	if (navigator.clearAppBadge) {
		navigator.clearAppBadge().catch(() => {});
	}

	const url = event.notification.data?.url || "/pompier";

	event.waitUntil(
		self.clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((clientList) => {
				for (const client of clientList) {
					if (client.url.includes(url) && "focus" in client) {
						return client.focus();
					}
				}
				if (self.clients.openWindow) {
					return self.clients.openWindow(url);
				}
			}),
	);
});
