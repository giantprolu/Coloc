"use client";

import { Star } from "lucide-react";
import type { MonthlyStatEntry } from "@/app/actions/firetruck";

interface FiretruckPieChartProps {
	data: MonthlyStatEntry[];
}

export function FiretruckPieChart({ data }: FiretruckPieChartProps) {
	if (data.length === 0) {
		return (
			<div className="text-center py-8 text-gray-400 text-sm">
				Aucune donnée ce mois-ci
			</div>
		);
	}

	const total = data.reduce((sum, d) => sum + d.clickCount, 0);
	const cx = 80;
	const cy = 80;
	const r = 70;

	// Construire les arcs du camembert
	let cumulative = 0;
	const slices = data.map((entry) => {
		const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
		cumulative += entry.clickCount;
		const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
		return { ...entry, startAngle, endAngle };
	});

	function describeArc(
		startAngle: number,
		endAngle: number,
	): string {
		const x1 = cx + r * Math.cos(startAngle);
		const y1 = cy + r * Math.sin(startAngle);
		const x2 = cx + r * Math.cos(endAngle);
		const y2 = cy + r * Math.sin(endAngle);
		const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

		return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
	}

	return (
		<div className="flex flex-col items-center gap-4">
			{/* SVG Pie Chart */}
			<svg viewBox="0 0 160 160" className="w-40 h-40">
				{data.length === 1 ? (
					<circle cx={cx} cy={cy} r={r} fill={data[0].color} />
				) : (
					slices.map((slice) => (
						<path
							key={slice.participantId}
							d={describeArc(slice.startAngle, slice.endAngle)}
							fill={slice.color}
							stroke="white"
							strokeWidth="2"
						/>
					))
				)}
				{/* Centre blanc avec total */}
				<circle cx={cx} cy={cy} r={30} fill="white" />
				<text
					x={cx}
					y={cy - 4}
					textAnchor="middle"
					className="text-lg font-bold fill-gray-900"
					fontSize="18"
				>
					{total}
				</text>
				<text
					x={cx}
					y={cy + 12}
					textAnchor="middle"
					className="fill-gray-400"
					fontSize="9"
				>
					ce mois
				</text>
			</svg>

			{/* Légende */}
			<div className="w-full space-y-1.5">
				{data.map((entry) => (
					<div
						key={entry.participantId}
						className="flex items-center justify-between text-sm"
					>
						<div className="flex items-center gap-2 min-w-0">
							<span
								className="h-3 w-3 rounded-full flex-shrink-0"
								style={{ backgroundColor: entry.color }}
							/>
							<span className="truncate text-gray-700">
								{entry.participantName}
							</span>
						</div>
						<div className="flex items-center gap-2 flex-shrink-0">
							<span className="text-gray-900 font-medium">
								{entry.clickCount}
							</span>
							<span className="flex items-center gap-0.5 text-yellow-500">
								<Star className="h-3 w-3 fill-yellow-400" />
								<span className="text-xs text-gray-500">
									{entry.avgRating}
								</span>
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
