"use client";

export default function AppError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 px-4 text-center">
			<div className="text-4xl">😵</div>
			<h2 className="text-lg font-semibold text-gray-900">
				Une erreur est survenue
			</h2>
			<p className="text-sm text-gray-500 max-w-xs">
				{error.message || "Quelque chose s'est mal passé. Veuillez réessayer."}
			</p>
			<button
				onClick={reset}
				className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white active:bg-indigo-700 transition-colors"
			>
				Réessayer
			</button>
		</div>
	);
}
