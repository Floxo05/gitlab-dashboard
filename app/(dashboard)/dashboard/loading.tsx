export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-6xl p-6 space-y-8">
      <header className="space-y-1">
        <div className="h-7 w-48 rounded bg-gray-200 animate-pulse" />
        <div className="h-4 w-80 rounded bg-gray-100 animate-pulse" />
      </header>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="h-6 w-40 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-16 rounded bg-gray-100 animate-pulse" />
        </div>
        <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-5 w-64 rounded bg-gray-100 animate-pulse" />
                <div className="h-4 w-40 rounded bg-gray-50 animate-pulse" />
              </div>
              <div className="h-4 w-40 rounded bg-gray-50 animate-pulse" />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="h-6 w-44 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-16 rounded bg-gray-100 animate-pulse" />
        </div>
        <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-5 w-72 rounded bg-gray-100 animate-pulse" />
                <div className="h-4 w-52 rounded bg-gray-50 animate-pulse" />
              </div>
              <div className="h-4 w-44 rounded bg-gray-50 animate-pulse" />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
