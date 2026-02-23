export default function ExpensesLoading() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between pt-2">
        <div className="h-6 w-28 animate-pulse rounded bg-gray-200" />
        <div className="h-8 w-24 animate-pulse rounded-lg bg-indigo-200" />
      </div>
      <div className="rounded-xl border bg-white p-4">
        <div className="h-16 animate-pulse rounded-lg bg-gray-100" />
      </div>
      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
            <div className="space-y-1">
              <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-28 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
