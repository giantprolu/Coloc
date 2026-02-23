/// <reference lib="webworker" />

const sw = self as unknown as ServiceWorkerGlobalScope & typeof globalThis;

// Push notification handler
sw.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let data: Record<string, string | undefined>;
  try {
    data = event.data.json();
  } catch {
    data = { title: "ColocEvents", body: event.data.text() };
  }

  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-192.png",
    tag: data.tag || "default",
    data: { url: data.url || "/dashboard" },
    vibrate: [200, 100, 200],
    renotify: true,
  } as NotificationOptions & { vibrate: number[]; renotify: boolean };

  event.waitUntil(
    sw.registration.showNotification(data.title || "ColocEvents", options)
  );
});

// Notification click handler
sw.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const url = (event.notification.data as { url?: string })?.url || "/dashboard";

  event.waitUntil(
    sw.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        if (sw.clients.openWindow) {
          return sw.clients.openWindow(url);
        }
      })
  );
});
