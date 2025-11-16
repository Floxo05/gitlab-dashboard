import Link from "next/link";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr] grid-rows-[56px_1fr] bg-background text-foreground">
      <header className="col-span-2 row-start-1 h-14 border-b border-border flex items-center px-4 justify-between bg-card/70 backdrop-blur">
        <div className="font-semibold">GitLab Dashboard</div>
        <div className="flex items-center gap-3">
          <nav className="text-sm text-muted">
            {/* Platzhalter für User/Projektumschalter */}
            <span>Demo • Read‑only</span>
          </nav>
          {/* Theme-Toggle entfernt – Dark-Mode wird per Variablen als Standard gesetzt */}
        </div>
      </header>

      <aside className="row-start-2 border-r border-border p-3 bg-card">
        <div className="text-xs uppercase tracking-wide text-muted px-2 mb-2">Navigation</div>
        <ul className="space-y-1">
          <li>
            <Link href="/dashboard" className="block px-2 py-1.5 rounded hover:bg-foreground/5">
              Board
            </Link>
          </li>
          <li>
            <Link href="/analysis" className="block px-2 py-1.5 rounded hover:bg-foreground/5">
              Analyse
            </Link>
          </li>
          <li>
            <button className="w-full text-left px-2 py-1.5 rounded text-muted cursor-not-allowed">
              Graph (bald)
            </button>
          </li>
          <li>
            <Link href="/logout" className="block px-2 py-1.5 rounded hover:bg-foreground/5">
              Logout
            </Link>
          </li>
        </ul>
      </aside>

      <main className="row-start-2 p-4 bg-background">{children}</main>
    </div>
  );
}
