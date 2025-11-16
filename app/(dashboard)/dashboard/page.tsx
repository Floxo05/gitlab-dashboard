export default function DashboardPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Board</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Dies ist eine Platzhalter‑Ansicht für das Board. In den nächsten Phasen
        werden hier die echten GitLab‑Daten (Read‑only) angezeigt.
      </p>
      <div className="rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-zinc-500 dark:text-zinc-400">
        Board‑Layout (Spalten/Karten) folgt in Phase 3.
      </div>
    </section>
  );
}
