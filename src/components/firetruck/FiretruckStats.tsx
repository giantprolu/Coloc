import {
	getFiretruckLocationStats,
	getFiretruckMonthlyStats,
	getFiretruckYearlyStats,
	type LocationStats,
} from "@/app/actions/firetruck";
import { FiretruckBarChart } from "@/components/firetruck/FiretruckBarChart";
import { FiretruckPieChart } from "@/components/firetruck/FiretruckPieChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function LocationBar({ stats }: { stats: LocationStats }) {
	const total = stats.domicile + stats.exterieur + stats.unknown;
	if (total === 0) return null;
	const domPct = Math.round((stats.domicile / total) * 100);
	const extPct = Math.round((stats.exterieur / total) * 100);
	const unkPct = 100 - domPct - extPct;

	return (
		<div className="space-y-2">
			<div className="flex h-4 w-full overflow-hidden rounded-full bg-gray-100">
				{domPct > 0 && (
					<div
						className="bg-red-400 transition-all"
						style={{ width: `${domPct}%` }}
						title={`Domicile ${domPct}%`}
					/>
				)}
				{extPct > 0 && (
					<div
						className="bg-orange-400 transition-all"
						style={{ width: `${extPct}%` }}
						title={`Extérieur ${extPct}%`}
					/>
				)}
				{unkPct > 0 && (
					<div
						className="bg-gray-200 transition-all"
						style={{ width: `${unkPct}%` }}
						title={`Non renseigné ${unkPct}%`}
					/>
				)}
			</div>
			<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
				{stats.domicile > 0 && (
					<span className="flex items-center gap-1">
						<span className="h-2.5 w-2.5 rounded-full bg-red-400 inline-block" />
						🏠 Domicile — {stats.domicile}
					</span>
				)}
				{stats.exterieur > 0 && (
					<span className="flex items-center gap-1">
						<span className="h-2.5 w-2.5 rounded-full bg-orange-400 inline-block" />
						🌍 Extérieur — {stats.exterieur}
					</span>
				)}
				{stats.unknown > 0 && (
					<span className="flex items-center gap-1">
						<span className="h-2.5 w-2.5 rounded-full bg-gray-200 inline-block" />
						❓ Non renseigné — {stats.unknown}
					</span>
				)}
			</div>
		</div>
	);
}

interface FiretruckStatsProps {
	colocationId: string;
}

export async function FiretruckStats({ colocationId }: FiretruckStatsProps) {
	const [monthlyStats, yearlyStats, locationStats] = await Promise.all([
		getFiretruckMonthlyStats(colocationId),
		getFiretruckYearlyStats(colocationId),
		getFiretruckLocationStats(colocationId),
	]);

	const now = new Date();
	const monthName = now.toLocaleDateString("fr-FR", { month: "long" });
	const year = now.getFullYear();

	return (
		<Card className="border-red-100">
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-sm font-semibold text-red-800">
					🚒 Statistiques Pompier
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Camembert mensuel */}
				<div>
					<h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
						{monthName} {year}
					</h3>
					<FiretruckPieChart data={monthlyStats} />
				</div>

				{/* Répartition domicile / extérieur */}
				{(locationStats.domicile > 0 || locationStats.exterieur > 0) && (
					<div>
						<h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
							Lieu ce mois
						</h3>
						<LocationBar stats={locationStats} />
					</div>
				)}

				{/* Histogramme annuel */}
				<div>
					<h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
						Année {year}
					</h3>
					<FiretruckBarChart data={yearlyStats} year={year} />
				</div>
			</CardContent>
		</Card>
	);
}
