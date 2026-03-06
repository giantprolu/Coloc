const CACHE_NAME = "coloc-v1";

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
	// Skip non-GET and API/auth requests
	if (event.request.method !== "GET") return;
	const url = new URL(event.request.url);
	if (url.pathname.startsWith("/api/")) return;
	if (url.pathname.startsWith("/auth/")) return;

	event.respondWith(
		fetch(event.request)
			.then((response) => {
				// Cache successful responses
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
		data = { title: "ColocEvents", body: event.data.text() };
	}

	const isEmergency = data.tag === "emergency" || data.tag === "firetruck";

	const options = {
		body: data.body || "",
		icon: data.icon || "/icons/icon-192.png",
		badge: data.badge || "/icons/icon-192.png",
		tag: data.tag || "default",
		data: { url: data.url || "/dashboard" },
		vibrate: isEmergency ? [500, 200, 500, 200, 500] : [200, 100, 200],
		renotify: true,
		requireInteraction: isEmergency,
	};

	event.waitUntil(
		self.registration.showNotification(data.title || "ColocEvents", options),
	);
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
	event.notification.close();

	const url = event.notification.data?.url || "/dashboard";

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
