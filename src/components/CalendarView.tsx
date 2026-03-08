"use client";

import {
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	format,
	isSameDay,
	isSameMonth,
	isToday,
	startOfMonth,
	startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatTime } from "@/lib/utils";
import type { Event } from "@/types";

interface CalendarViewProps {
	events: Event[];
}

const NOISE_COLORS = {
	quiet: "bg-green-200 text-green-800",
	moderate: "bg-yellow-200 text-yellow-800",
	festive: "bg-purple-200 text-purple-800",
};

export function CalendarView({ events }: CalendarViewProps) {
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [selectedDay, setSelectedDay] = useState<Date | null>(null);

	const monthStart = startOfMonth(currentMonth);
	const monthEnd = endOfMonth(currentMonth);
	const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
	const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

	const days = eachDayOfInterval({ start: calStart, end: calEnd });

	const getEventsForDay = (day: Date) =>
		events.filter((e) => isSameDay(new Date(e.start_at), day));

	const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

	const prevMonth = () =>
		setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1));
	const nextMonth = () =>
		setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1));

	const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

	return (
		<div className="space-y-4">
			{/* Navigation mois */}
			<div className="flex items-center justify-between">
				<Button variant="ghost" size="icon" onClick={prevMonth}>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<h2 className="text-base font-semibold capitalize">
					{format(currentMonth, "MMMM yyyy", { locale: fr })}
				</h2>
				<Button variant="ghost" size="icon" onClick={nextMonth}>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>

			{/* Grille du calendrier */}
			<div className="bg-white rounded-xl border overflow-hidden">
				{/* En-têtes des jours */}
				<div className="grid grid-cols-7 border-b">
					{weekDays.map((d) => (
						<div
							key={d}
							className="py-2 text-center text-xs font-medium text-gray-500"
						>
							{d}
						</div>
					))}
				</div>

				{/* Jours */}
				<div className="grid grid-cols-7">
					{days.map((day, idx) => {
						const dayEvents = getEventsForDay(day);
						const isCurrentMonth = isSameMonth(day, currentMonth);
						const isSelected = selectedDay && isSameDay(day, selectedDay);
						const isCurrentDay = isToday(day);

						return (
							<button
								key={idx}
								onClick={() =>
									setSelectedDay(
										isSameDay(day, selectedDay || new Date(-1)) ? null : day,
									)
								}
								className={cn(
									"relative min-h-[60px] p-1 text-left border-b border-r transition-colors",
									!isCurrentMonth && "bg-gray-50",
									isSelected && "bg-indigo-50",
									"hover:bg-indigo-50/50",
								)}
							>
								<span
									className={cn(
										"inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium mb-1",
										isCurrentDay && "bg-indigo-600 text-white",
										!isCurrentDay && isCurrentMonth && "text-gray-900",
										!isCurrentDay && !isCurrentMonth && "text-gray-400",
									)}
								>
									{format(day, "d")}
								</span>
								<div className="space-y-0.5">
									{dayEvents.slice(0, 2).map((e) => (
										<div
											key={e.id}
											className={cn(
												"rounded px-1 py-0.5 text-xs truncate",
												NOISE_COLORS[
													e.noise_level as keyof typeof NOISE_COLORS
												] || "bg-gray-200 text-gray-700",
											)}
										>
											{e.title}
										</div>
									))}
									{dayEvents.length > 2 && (
										<p className="text-xs text-gray-400 pl-1">
											+{dayEvents.length - 2}
										</p>
									)}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Détail du jour sélectionné */}
			{selectedDay && (
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-semibold text-gray-700 capitalize">
							{format(selectedDay, "EEEE d MMMM", { locale: fr })}
						</h3>
						<Link href="/events/new">
							<Button size="sm" variant="outline" className="h-7 text-xs">
								<Plus className="mr-1 h-3 w-3" />
								Ajouter
							</Button>
						</Link>
					</div>
					{selectedDayEvents.length === 0 ? (
						<p className="text-sm text-gray-400 text-center py-4">
							Aucun événement ce jour
						</p>
					) : (
						selectedDayEvents.map((event) => (
							<Link key={event.id} href={`/events/${event.id}`}>
								<div className="flex items-start gap-3 rounded-lg bg-white border p-3 hover:shadow-sm transition-shadow cursor-pointer">
									<div
										className={cn(
											"mt-1 h-2 w-2 rounded-full flex-shrink-0",
											event.noise_level === "quiet"
												? "bg-green-500"
												: event.noise_level === "festive"
													? "bg-purple-500"
													: "bg-yellow-500",
										)}
									/>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-gray-900">
											{event.title}
										</p>
										<p className="text-xs text-gray-500">
											{formatTime(event.start_at)} – {formatTime(event.end_at)}
										</p>
										{event.guest_count > 0 && (
											<p className="text-xs text-gray-400 mt-0.5">
												{event.guest_count} invité
												{event.guest_count > 1 ? "s" : ""}
											</p>
										)}
									</div>
									<Badge variant="secondary" className="text-xs">
										Confirmé
									</Badge>
								</div>
							</Link>
						))
					)}
				</div>
			)}

			{/* Légende */}
			<div className="flex gap-4 text-xs text-gray-500 justify-center">
				<span className="flex items-center gap-1">
					<span className="h-2 w-2 rounded-full bg-green-500" />
					Calme
				</span>
				<span className="flex items-center gap-1">
					<span className="h-2 w-2 rounded-full bg-yellow-500" />
					Modéré
				</span>
				<span className="flex items-center gap-1">
					<span className="h-2 w-2 rounded-full bg-purple-500" />
					Festif
				</span>
			</div>
		</div>
	);
}
