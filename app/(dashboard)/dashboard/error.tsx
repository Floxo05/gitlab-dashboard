"use client";

type Props = { error: Error & { digest?: string }; reset: () => void };

export default function DashboardError({ error, reset }: Props) {
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Fehler beim Laden des Dashboards</h1>
      <p className="text-sm text-gray-600">
        {error?.message || "Unbekannter Fehler"}
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Erneut laden
        </button>
        <a
          href="/logout"
          className="inline-flex items-center rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          Abmelden
        </a>
      </div>
    </main>
  );
}
