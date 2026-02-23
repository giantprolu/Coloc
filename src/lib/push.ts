import webpush from "web-push";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Configure VAPID lazily (au moment de l'utilisation, pas au chargement du module)
function initWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  return webpush;
}

// Envoie une notification push à un abonné
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<void> {
  const wp = initWebPush();

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  await wp.sendNotification(
    pushSubscription,
    JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || "/dashboard",
      icon: payload.icon || "/icons/icon-192x192.png",
      badge: payload.badge || "/icons/icon-192x192.png",
      tag: payload.tag,
    })
  );
}

// Envoie une notification à plusieurs abonnés
export async function sendPushToMany(
  subscriptions: PushSubscriptionData[],
  payload: PushPayload
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await sendPushNotification(sub, payload);
        success++;
      } catch (error) {
        console.error("Échec d'envoi de notification push :", error);
        failed++;
      }
    })
  );

  return { success, failed };
}
