"use client";

import { useState, useTransition } from "react";
import { toggleWeekendPresence } from "@/app/actions/presence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { CalendarDays, Check, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
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
  weekends: string[]; // ISO date strings (samedi de chaque weekend)
}

export function WeekendPlanner({
  currentMemberId,
  members,
  weekendPresences,
  weekends,
}: WeekendPlannerProps) {
  const [presences, setPresences] = useState(weekendPresences);
  const [isPending, startTransition] = useTransition();

  const isPresent = (memberId: string, weekendDate: string) => {
    const entry = presences.find(
      (p) => p.member_id === memberId && p.weekend_date === weekendDate
    );
    return entry ? entry.is_present : true;
  };

  const handleToggle = (weekendDate: string) => {
    const current = isPresent(currentMemberId, weekendDate);
    const newValue = !current;

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
        {
          member_id: currentMemberId,
          weekend_date: weekendDate,
          is_present: newValue,
        },
      ];
    });

    startTransition(async () => {
      try {
        await toggleWeekendPresence(weekendDate, newValue);
      } catch {
        setPresences((prev) => {
          const idx = prev.findIndex(
            (p) =>
              p.member_id === currentMemberId && p.weekend_date === weekendDate
          );
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], is_present: current };
            return updated;
          }
          return prev;
        });
        toast.error("Impossible de mettre à jour");
      }
    });
  };

  const handleBulkToggle = (setPresent: boolean) => {
    // Optimistic update for all weekends
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
        toast.success(
          setPresent
            ? "Présent tous les weekends !"
            : "Absent tous les weekends"
        );
      } catch {
        toast.error("Erreur lors de la mise à jour");
      }
    });
  };

  // Vérifie l'état global du membre courant pour les boutons bulk
  const allPresent = weekends.every((d) => isPresent(currentMemberId, d));
  const allAbsent = weekends.every((d) => !isPresent(currentMemberId, d));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <CalendarDays className="h-4 w-4" />
          Weekends du mois
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Boutons bulk */}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending || allPresent}
            onClick={() => handleBulkToggle(true)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              allPresent
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-gray-50 text-gray-600 border border-gray-200 active:bg-green-50"
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            Présent partout
          </button>
          <button
            type="button"
            disabled={isPending || allAbsent}
            onClick={() => handleBulkToggle(false)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              allAbsent
                ? "bg-red-50 text-red-600 border border-red-200"
                : "bg-gray-50 text-gray-600 border border-gray-200 active:bg-red-50"
            }`}
          >
            <X className="h-3.5 w-3.5" />
            Absent partout
          </button>
        </div>

        {/* Liste des weekends */}
        {weekends.map((date) => {
          const d = new Date(date + "T12:00:00");
          const sunday = new Date(d.getTime() + 86400000);
          const label = `Sam ${format(d, "d", { locale: fr })} - Dim ${format(sunday, "d MMM", { locale: fr })}`;

          return (
            <div key={date} className="rounded-lg border bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-600 mb-2">{label}</p>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const present = isPresent(m.id, date);
                  const isMe = m.id === currentMemberId;

                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={!isMe || isPending}
                      onClick={() => isMe && handleToggle(date)}
                      className={`flex items-center gap-1.5 rounded-full pl-0.5 pr-2.5 py-0.5 text-xs transition-colors ${
                        present
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : "bg-gray-100 text-gray-400 border border-gray-200"
                      } ${
                        isMe ? "active:ring-2 active:ring-indigo-300" : ""
                      }`}
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={m.avatar_url || undefined} />
                        <AvatarFallback
                          className={`text-[9px] ${
                            present
                              ? "bg-green-200 text-green-800"
                              : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {getInitials(m.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-[60px]">
                        {m.display_name.split(" ")[0]}
                      </span>
                      {present ? (
                        <Check className="h-3 w-3 flex-shrink-0" />
                      ) : (
                        <X className="h-3 w-3 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
