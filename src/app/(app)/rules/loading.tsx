export default function RulesLoading() {
	return (
		<div className="space-y-4 p-4">
			<div className="pt-2">
				<div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
			</div>
			<div className="h-16 animate-pulse rounded-xl bg-amber-100" />
			{[1, 2, 3, 4].map((i) => (
				<div key={i} className="rounded-xl border bg-white p-4 space-y-3">
					<div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
					<div className="h-9 w-32 animate-pulse rounded-md bg-gray-200" />
				</div>
			))}
		</div>
	);
}
