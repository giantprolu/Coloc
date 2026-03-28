"use client";

import type { YearlyStatEntry } from "@/app/actions/firetruck";

const MONTH_LABELS = [
	"Jan",
	"Fév",
	"Mar",
	"Avr",
	"Mai",
	"Juin",
	"Juil",
	"Août",
	"Sep",
	"Oct",
	"Nov",
	"Déc",
];

interface FiretruckBarChartProps {
	data: YearlyStatEntry[];
	year: number;
}

export function FiretruckBarChart({ data, year }: FiretruckBarChartProps) {
	// Calculer le max pour l'échelle Y
	const maxTotal = Math.max(
		1,
		...data.map((m) =>
			m.members.reduce((sum, mem) => sum + mem.clickCount, 0),
		),
	);

	const chartWidth = 340;
	const chartHeight = 150;
	const paddingLeft = 25;
	const paddingBottom = 22;
	const paddingTop = 10;
	const barGroupWidth = (chartWidth - paddingLeft) / 12;
	const barWidth = barGroupWidth * 0.6;
	const drawableHeight = chartHeight - paddingBottom - paddingTop;

	// Grille Y (lignes horizontales)
	const yTicks = getYTicks(maxTotal);

	// Collecter tous les membres uniques pour la légende
	const memberMap = new Map<string, { name: string; color: string }>();
	for (const month of data) {
		for (const mem of month.members) {
			if (!memberMap.has(mem.memberId)) {
				memberMap.set(mem.memberId, {
					name: mem.memberName,
					color: mem.color,
				});
			}
		}
	}

	const hasData = data.some((m) => m.members.length > 0);

	if (!hasData) {
		return (
			<div className="text-center py-8 text-gray-400 text-sm">
				Aucune donnée en {year}
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<svg
				viewBox={`0 0 ${chartWidth} ${chartHeight}`}
				className="w-full"
				preserveAspectRatio="xMidYMid meet"
			>
				{/* Grille Y */}
				{yTicks.map((tick) => {
					const y =
						paddingTop +
						drawableHeight -
						(tick / maxTotal) * drawableHeight;
					return (
						<g key={tick}>
							<line
								x1={paddingLeft}
								y1={y}
								x2={chartWidth}
								y2={y}
								stroke="#e5e7eb"
								strokeWidth="0.5"
							/>
							<text
								x={paddingLeft - 4}
								y={y + 3}
								textAnchor="end"
								fontSize="8"
								className="fill-gray-400"
							>
								{tick}
							</text>
						</g>
					);
				})}

				{/* Barres empilées par mois */}
				{data.map((monthData, i) => {
					const groupX =
						paddingLeft + i * barGroupWidth + (barGroupWidth - barWidth) / 2;
					let yOffset = 0;

					return (
						<g key={monthData.month}>
							{/* Barres empilées */}
							{monthData.members.map((mem) => {
								const barH =
									(mem.clickCount / maxTotal) * drawableHeight;
								const y =
									paddingTop + drawableHeight - yOffset - barH;
								yOffset += barH;

								return (
									<rect
										key={mem.memberId}
										x={groupX}
										y={y}
										width={barWidth}
										height={Math.max(barH, 0)}
										fill={mem.color}
										rx="2"
									/>
								);
							})}

							{/* Label mois */}
							<text
								x={groupX + barWidth / 2}
								y={chartHeight - 4}
								textAnchor="middle"
								fontSize="7"
								className="fill-gray-500"
							>
								{MONTH_LABELS[i]}
							</text>
						</g>
					);
				})}
			</svg>

			{/* Légende des membres */}
			<div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
				{[...memberMap.entries()].map(([id, { name, color }]) => (
					<div key={id} className="flex items-center gap-1 text-xs text-gray-600">
						<span
							className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
							style={{ backgroundColor: color }}
						/>
						{name}
					</div>
				))}
			</div>
		</div>
	);
}

function getYTicks(max: number): number[] {
	if (max <= 5) return Array.from({ length: max + 1 }, (_, i) => i);
	const step = Math.ceil(max / 4);
	const ticks: number[] = [];
	for (let i = 0; i <= max; i += step) {
		ticks.push(i);
	}
	if (ticks[ticks.length - 1] < max) ticks.push(max);
	return ticks;
}
