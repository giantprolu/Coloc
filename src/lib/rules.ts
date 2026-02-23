import { ColocRule, Event } from "@/types";

interface QuietHours {
  start: number; // heure de début (0-23)
  end: number;   // heure de fin (0-23)
}

interface RuleWarning {
  type: "quiet_hours" | "max_guests" | "min_notice";
  message: string;
}

// Extrait la valeur d'une règle par sa clé
function getRule<T>(rules: ColocRule[], key: string, defaultValue: T): T {
  const rule = rules.find((r) => r.rule_key === key);
  return rule ? (rule.rule_value as T) : defaultValue;
}

// Vérifie si un événement viole les règles de la coloc
export function checkEventRules(
  event: Event,
  rules: ColocRule[]
): RuleWarning[] {
  const warnings: RuleWarning[] = [];

  const startDate = new Date(event.start_at);
  const endDate = new Date(event.end_at);
  const isWeekend = startDate.getDay() === 0 || startDate.getDay() === 6;

  // Vérification des heures silencieuses
  const quietKey = isWeekend ? "quiet_hours_weekend" : "quiet_hours_weekday";
  const quietHours = getRule<QuietHours | null>(rules, quietKey, null);

  if (quietHours) {
    const startHour = startDate.getHours();
    const endHour = endDate.getHours();

    const violatesQuiet =
      startHour >= quietHours.start ||
      endHour >= quietHours.start ||
      startHour < quietHours.end ||
      endHour < quietHours.end;

    if (violatesQuiet && event.noise_level !== "quiet") {
      warnings.push({
        type: "quiet_hours",
        message: `⚠️ Cet événement chevauche les heures silencieuses (après ${quietHours.start}h)`,
      });
    }
  }

  // Vérification du nombre max d'invités
  const maxGuests = getRule<number>(rules, "max_guests_default", 0);
  if (maxGuests > 0 && event.guest_count > maxGuests) {
    warnings.push({
      type: "max_guests",
      message: `⚠️ Nombre d'invités (${event.guest_count}) supérieur à la limite (${maxGuests})`,
    });
  }

  // Vérification du délai minimum de prévenance
  const minNoticeHours = getRule<number>(rules, "min_notice_hours", 0);
  if (minNoticeHours > 0) {
    const hoursUntilEvent =
      (startDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilEvent < minNoticeHours && hoursUntilEvent > 0) {
      warnings.push({
        type: "min_notice",
        message: `⚠️ Délai de prévenance insuffisant (minimum ${minNoticeHours}h à l'avance)`,
      });
    }
  }

  return warnings;
}
