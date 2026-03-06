export default function NewEventLoading() {
	return (
		<div className="space-y-5 p-4">
			<div className="pt-2">
				<div className="h-6 w-44 animate-pulse rounded bg-gray-200" />
			</div>
			{[1, 2, 3, 4].map((i) => (
				<div key={i} className="space-y-2">
					<div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
					<div className="h-10 animate-pulse rounded-md bg-gray-200" />
				</div>
			))}
			<div className="h-10 animate-pulse rounded-md bg-indigo-200" />
		</div>
	);
}
