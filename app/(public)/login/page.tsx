export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-2">Login</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          Melde dich mit deinem GitLab Personal Access Token (PAT) an.
          Hinweis: In Phase 1 wird hier die sichere Server‑Verarbeitung ergänzt.
        </p>
        {/* No client-side interactivity yet; server action will be added in Phase 1 */}
        <form className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm">Personal Access Token</span>
            <input
              type="password"
              name="pat"
              placeholder="glpat-..."
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </label>
          <button
            className="h-10 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black hover:opacity-90 transition"
            type="button"
            aria-disabled
            title="Wird in Phase 1 aktiviert"
          >
            Anmelden (demnächst)
          </button>
        </form>
      </div>
    </main>
  );
}
