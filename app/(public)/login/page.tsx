import { loginWithPat } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  // In Next 16, searchParams is a Promise in Server Components
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const error = typeof sp?.error === "string" ? sp.error : undefined;
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-card">
        <h1 className="text-xl font-semibold mb-2">Login</h1>
        <p className="text-sm text-muted mb-6">
          Melde dich mit deinem GitLab Personal Access Token (PAT) an.
          Dein Token wird sicher serverseitig verarbeitet und nicht im Client gespeichert.
        </p>
        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 text-red-800 text-sm px-3 py-2">
            {error}
          </div>
        )}
        <form className="grid gap-4" action={loginWithPat}>
          <label className="grid gap-2">
            <span className="text-sm">Personal Access Token</span>
            <input
              type="password"
              name="pat"
              placeholder="glpat-..."
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              />
          </label>
          <button
            className="h-10 rounded-md px-4 bg-foreground text-background hover:opacity-90 transition"
            type="submit"
          >
            Anmelden
          </button>
        </form>
      </div>
    </main>
  );
}
