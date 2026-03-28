import {
	getFiretruckMonthlyStats,
	getFiretruckYearlyStats,
} from "@/app/actions/firetruck";
import { FiretruckBarChart } from "@/components/firetruck/FiretruckBarChart";
import { FiretruckPieChart } from "@/components/firetruck/FiretruckPieChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FiretruckStatsProps {
	colocationId: string;
}

export async function FiretruckStats({ colocationId }: FiretruckStatsProps) {
	const [monthlyStats, yearlyStats] = await Promise.all([
		getFiretruckMonthlyStats(colocationId),
		getFiretruckYearlyStats(colocationId),
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
