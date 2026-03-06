export default function AnnouncementsLoading() {
	return (
		<div className="space-y-4 p-4">
			<div className="pt-2">
				<div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
			</div>
			<div className="h-16 animate-pulse rounded-xl bg-gray-200" />
			{[1, 2, 3].map((i) => (
				<div key={i} className="rounded-xl border bg-white p-4 space-y-2">
					<div className="flex items-center gap-3">
						<div className="h-8 w-8 animate-pulse rounded-full bg-gray-200 flex-shrink-0" />
						<div className="flex-1 space-y-1">
							<div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
							<div className="h-4 w-full animate-pulse rounded bg-gray-200" />
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
