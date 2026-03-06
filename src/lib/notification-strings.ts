/**
 * Textes de notifications push — centralisés ici pour modification facile.
 * Chaque notification a un title, body (template ou fixe), url et tag.
 */

// ─── Chat ────────────────────────────────────────────────────────────────────

export const NOTIF_CHAT_MESSAGE = {
	title: (senderName: string) => `${senderName} dans le chat`,
	body: (content: string) =>
		content.length > 80 ? content.slice(0, 77) + "..." : content,
	url: "/chat",
	tag: "chat_message",
};

export const NOTIF_CHAT_MENTION = {
	title: (senderName: string) => `${senderName} vous a mentionné`,
	body: (content: string) =>
		content.length > 80 ? content.slice(0, 77) + "..." : content,
	url: "/chat",
	tag: "chat_mention",
};

// ─── Camion de pompier 🚒 ───────────────────────────────────────────────────

export const NOTIF_FIRETRUCK = {
	title: "🚒🚒🚒",
	body: (senderName: string) => `${senderName} à ken a l'instant !`,
	url: "/dashboard",
	tag: "firetruck",
};

// ─── Test (dev) ──────────────────────────────────────────────────────────────

export const NOTIF_TEST_CHAT = {
	title: "[TEST] Message dans le chat",
	body: "Ceci est une notification de test pour le chat.",
	url: "/chat",
	tag: "chat_message",
};

export const NOTIF_TEST_MENTION = {
	title: "[TEST] Quelqu'un vous a mentionné",
	body: "Ceci est une notification de test pour les mentions.",
	url: "/chat",
	tag: "chat_mention",
};

export const NOTIF_TEST_FIRETRUCK = {
	title: "[TEST] 🚒🚒🚒",
	body: "Ceci est un test du bouton camion de pompier !",
	url: "/dashboard",
	tag: "firetruck",
};
