import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isTomorrow, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Génère un code d'invitation aléatoire (6 caractères alphanumériques)
export function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Formate une date en français
export function formatDate(date: string | Date, pattern = "dd MMMM yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, pattern, { locale: fr });
}

// Formate une heure
export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "HH:mm", { locale: fr });
}

// Formate une date/heure relative ("il y a 2 minutes", "dans 1 heure")
export function formatRelative(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
}

// Formate un événement avec sa date de manière lisible
export function formatEventDate(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (isSameDay(start, end)) {
    let dateLabel = formatDate(start, "EEEE d MMMM");
    if (isToday(start)) dateLabel = "Aujourd'hui";
    else if (isTomorrow(start)) dateLabel = "Demain";
    return `${dateLabel}, ${formatTime(start)} – ${formatTime(end)}`;
  }

  // Jours différents : "20 janvier 14:00 – 22 janvier 18:00"
  return `${formatDate(start, "d MMMM")} ${formatTime(start)} – ${formatDate(end, "d MMMM")} ${formatTime(end)}`;
}

// Obtient les initiales d'un nom
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Tronque un texte
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
