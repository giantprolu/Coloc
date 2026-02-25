"use client";

import { useState, useTransition, useCallback } from "react";
import {
  toggleWeekendPresence,
  fetchWeekendPresences,
} from "@/app/actions/presence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { getInitials } from "@/lib/utils";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachWeekendOfInterval,
  isSaturday,
  addMonths,
} from "date-fns";
import { fr } from "date-fns/locale";

interface WeekendPresenceData {
  member_id: string;
  weekend_date: string;
  is_present: boolean;
}

interface MemberData {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface WeekendPlannerProps {
  currentMemberId: string;
  members: MemberData[];
  weekendPresences: WeekendPresenceData[];
  weekends: string[]; // ISO date strings (samedi de chaque weekend) — mois initial
}

function getWeekendsForMonth(date: Date): string[] {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return eachWeekendOfInterval({ start, end })
    .filter((d) => isSaturday(d))
    .map((d) => format(d, "yyyy-MM-dd"));
}

export function WeekendPlanner({
  currentMemberId,
  members,
  weekendPresences,
  weekends: initialWeekends,
}: WeekendPlannerProps) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [presences, setPresences] = useState<WeekendPresenceData[]>(weekendPresences);
  const [loadedMonths, setLoadedMonths] = useState<Set<number>>(new Set([0]));
  const [isPending, startTransition] = useTransition();

  const currentMonth = addMonths(new Date(), monthOffset);
  const weekends =
    monthOffset === 0
      ? initialWeekends
      : getWeekendsForMonth(currentMonth);

  const isPresent = useCallback(
    (memberId: string, weekendDate: string) => {
      const entry = presences.find(
        (p) => p.member_id === memberId && p.weekend_date === weekendDate
      );
      return entry ? entry.is_present : true;
    },
    [presences]
  );

  const navigateMonth = async (offset: number) => {
    const newOffset = monthOffset + offset;
    setMonthOffset(newOffset);

    if (!loadedMonths.has(newOffset)) {
      const month = addMonths(new Date(), newOffset);
      const dates = getWeekendsForMonth(month);
      try {
        const data = await fetchWeekendPresences(dates);
        setPresences((prev) => {
          const existing = new Set(
            prev.map((p) => `${p.member_id}:${p.weekend_date}`)
          );
          const toAdd = (data as WeekendPresenceData[]).filter(
            (d) => !existing.has(`${d.member_id}:${d.weekend_date}`)
          );
          return [...prev, ...toAdd];
        });
      } catch {
        // Données non chargées, on utilise le défaut (présent)
      }
      setLoadedMonths((prev) => new Set([...prev, newOffset]));
    }
  };

  const handleToggle = (weekendDate: string, newValue: boolean) => {
    setPresences((prev) => {
      const idx = prev.findIndex(
        (p) =>
          p.member_id === currentMemberId && p.weekend_date === weekendDate
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], is_present: newValue };
        return updated;
      }
      return [
        ...prev,
        { member_id: currentMemberId, weekend_date: weekendDate, is_present: newValue },
      ];
    });

    startTransition(async () => {
      try {
        await toggleWeekendPresence(weekendDate, newValue);
      } catch {
        // Revert
        setPresences((prev) => {
          const idx = prev.findIndex(
            (p) =>
              p.member_id === currentMemberId && p.weekend_date === weekendDate
          );
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], is_present: !newValue };
            return updated;
          }
          return prev;
        });
        toast.error("Impossible de mettre à jour");
      }
    });
  };

  const handleBulk = (setPresent: boolean) => {
    setPresences((prev) => {
      const updated = [...prev];
      for (const date of weekends) {
        const idx = updated.findIndex(
          (p) => p.member_id === currentMemberId && p.weekend_date === date
        );
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], is_present: setPresent };
        } else {
          updated.push({
            member_id: currentMemberId,
            weekend_date: date,
            is_present: setPresent,
          });
        }
      }
      return updated;
    });

    startTransition(async () => {
      try {
        await Promise.all(
          weekends.map((date) => toggleWeekendPresence(date, setPresent))
        );
      } catch {
        toast.error("Erreur lors de la mise à jour");
      }
    });
  };

  const allPresent = weekends.every((d) => isPresent(currentMemberId, d));
  const allAbsent = weekends.every((d) => !isPresent(currentMemberId, d));
  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: fr });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <CalendarDays className="h-4 w-4" />
          Weekends
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Navigation mois */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={monthOffset <= 0}
            onClick={() => navigateMonth(-1)}
            className="p-1.5 rounded-lg text-gray-400 active:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 capitalize">
            {monthLabel}
          </span>
          <button
            type="button"
            disabled={monthOffset >= 5}
            onClick={() => navigateMonth(1)}
            className="p-1.5 rounded-lg text-gray-400 active:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Boutons bulk */}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending || allPresent}
            onClick={() => handleBulk(true)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              allPresent
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-gray-50 text-gray-500 border border-gray-200 active:bg-green-50"
            }`}
          >
            Tout cocher
          </button>
          <button
            type="button"
            disabled={isPending || allAbsent}
            onClick={() => handleBulk(false)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              allAbsent
                ? "bg-gray-200 text-gray-600 border border-gray-300"
                : "bg-gray-50 text-gray-500 border border-gray-200 active:bg-gray-100"
            }`}
          >
            Tout décocher
          </button>
        </div>

        {/* Timeline des weekends */}
        {weekends.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">
            Aucun weekend ce mois-ci
          </p>
        ) : (
          <div className="space-y-2">
            {weekends.map((date) => {
              const d = new Date(date + "T12:00:00");
              const sunday = new Date(d.getTime() + 86400000);
              const label = `Sam ${format(d, "d")} - Dim ${format(sunday, "d MMM", { locale: fr })}`;
              const myPresence = isPresent(currentMemberId, date);
              const otherPresent = members.filter(
                (m) => m.id !== currentMemberId && isPresent(m.id, date)
              );

              return (
                <div
                  key={date}
                  className="flex items-center gap-3 rounded-lg border bg-white p-3"
                >
                  {/* Date + avatars */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {label}
                    </p>
                    {otherPresent.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <div className="flex -space-x-1.5">
                          {otherPresent.slice(0, 5).map((m) => (
                            <Avatar key={m.id} className="h-5 w-5 border-2 border-white">
                              <AvatarImage src={m.avatar_url || undefined} />
                              <AvatarFallback className="text-[8px] bg-green-100 text-green-700">
                                {getInitials(m.display_name)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        <span className="text-[10px] text-gray-400 ml-0.5">
                          {otherPresent.length <= 3
                            ? otherPresent.map(m => m.display_name.split(" ")[0]).join(", ")
                            : `${otherPresent.slice(0, 2).map(m => m.display_name.split(" ")[0]).join(", ")} +${otherPresent.length - 2}`}
                        </span>
                      </div>
                    )}
                    {otherPresent.length === 0 && (
                      <p className="text-[10px] text-gray-300 mt-1">
                        Personne d&apos;autre
                      </p>
                    )}
                  </div>

                  {/* Switch */}
                  <div className="flex flex-col items-center gap-0.5">
                    <Switch
                      checked={myPresence}
                      onCheckedChange={(checked) => handleToggle(date, checked)}
                      disabled={isPending}
                      className="data-[state=checked]:bg-green-500"
                    />
                    <span className={`text-[10px] ${myPresence ? "text-green-600" : "text-gray-400"}`}>
                      {myPresence ? "Là" : "Absent"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
