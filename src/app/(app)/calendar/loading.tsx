export default function CalendarLoading() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between pt-2">
        <div className="h-6 w-36 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-white p-4 space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-28 animate-pulse rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
