export default function DashboardLoading() {
  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="space-y-2">
          <div className="h-6 w-52 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-36 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="h-8 w-24 animate-pulse rounded-lg bg-gray-200" />
      </div>

      {/* Présence */}
      <div className="h-20 animate-pulse rounded-xl bg-gray-200" />

      {/* Événements */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
        <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
        {[1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>

      {/* Colocataires */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
