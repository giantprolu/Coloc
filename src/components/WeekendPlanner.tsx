"use client";

import { useState, useTransition } from "react";
import { toggleWeekendPresence } from "@/app/actions/presence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { CalendarDays } from "lucide-react";
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
    // Par défaut, on considère "présent" si pas d'entrée
    return entry ? entry.is_present : true;
  };

  const handleToggle = (weekendDate: string) => {
    const current = isPresent(currentMemberId, weekendDate);
    const newValue = !current;

    // Optimistic update
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
        // Revert on error
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <CalendarDays className="h-4 w-4" />
          Weekends du mois
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left pr-3 pb-2 text-gray-500 font-medium">
                  &nbsp;
                </th>
                {weekends.map((date) => {
                  const d = new Date(date + "T12:00:00");
                  return (
                    <th
                      key={date}
                      className="pb-2 px-1 text-center text-gray-500 font-medium min-w-[60px]"
                    >
                      <div>{format(d, "d", { locale: fr })}-{format(new Date(d.getTime() + 86400000), "d", { locale: fr })}</div>
                      <div className="text-[10px]">{format(d, "MMM", { locale: fr })}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="pr-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={m.avatar_url || undefined} />
                        <AvatarFallback className="text-[9px] bg-indigo-100 text-indigo-700">
                          {getInitials(m.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-gray-700 truncate max-w-[80px]">
                        {m.display_name}
                      </span>
                    </div>
                  </td>
                  {weekends.map((date) => {
                    const present = isPresent(m.id, date);
                    const isMe = m.id === currentMemberId;
                    return (
                      <td key={date} className="px-1 py-1.5 text-center">
                        <button
                          type="button"
                          disabled={!isMe || isPending}
                          onClick={() => isMe && handleToggle(date)}
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm transition-colors ${
                            present
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-400"
                          } ${
                            isMe
                              ? "cursor-pointer hover:ring-2 hover:ring-indigo-300"
                              : "cursor-default"
                          }`}
                          title={
                            isMe
                              ? present
                                ? "Cliquer pour marquer absent"
                                : "Cliquer pour marquer présent"
                              : present
                                ? "Présent"
                                : "Absent"
                          }
                        >
                          {present ? "✓" : "✗"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
