export default function SettingsLoading() {
  return (
    <div className="space-y-4 p-4">
      <div className="pt-2 h-6 w-32 animate-pulse rounded bg-gray-200" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-200" />
      ))}
    </div>
  );
}
