import Link from "next/link";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr] grid-rows-[56px_1fr]">
      <header className="col-span-2 row-start-1 h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 justify-between bg-white/70 dark:bg-black/70 backdrop-blur">
        <div className="font-semibold">GitLab Dashboard</div>
        <nav className="text-sm text-zinc-600 dark:text-zinc-400">
          {/* Platzhalter für User/Projektumschalter */}
          <span>Demo • Read‑only</span>
        </nav>
      </header>

      <aside className="row-start-2 border-r border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-black">
        <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400 px-2 mb-2">Navigation</div>
        <ul className="space-y-1">
          <li>
            <Link href="/dashboard" className="block px-2 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900">
              Board
            </Link>
          </li>
          <li>
            <button className="w-full text-left px-2 py-1.5 rounded text-zinc-500 dark:text-zinc-400 cursor-not-allowed">
              Graph (bald)
            </button>
          </li>
          <li>
            <Link href="/login" className="block px-2 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900">
              Logout
            </Link>
          </li>
        </ul>
      </aside>

      <main className="row-start-2 p-4 bg-white dark:bg-black">{children}</main>
    </div>
  );
}
