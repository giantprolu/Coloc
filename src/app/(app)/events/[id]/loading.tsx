export default function EventLoading() {
  return (
    <div className="space-y-4 p-4">
      {/* Navigation */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200" />
        <div className="flex-1 space-y-1.5">
          <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-28 animate-pulse rounded bg-gray-200" />
        </div>
      </div>

      {/* Détails */}
      <div className="rounded-xl border bg-white p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-4 w-4 animate-pulse rounded bg-gray-200 flex-shrink-0" />
            <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
          </div>
        ))}
      </div>

      {/* Réactions */}
      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
