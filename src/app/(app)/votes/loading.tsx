export default function VotesLoading() {
  return (
    <div className="space-y-4 p-4">
      <div className="pt-2">
        <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-3">
          <div className="h-5 w-48 animate-pulse rounded bg-orange-200" />
          <div className="h-3 w-64 animate-pulse rounded bg-orange-200" />
          <div className="h-2 animate-pulse rounded-full bg-orange-200" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-9 animate-pulse rounded-lg bg-orange-200" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
