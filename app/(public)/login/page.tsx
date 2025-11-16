import { loginWithPat } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const error = typeof searchParams?.error === "string" ? searchParams?.error : undefined;
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-2">Login</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
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
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-400"
              />
          </label>
          <button
            className="h-10 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black hover:opacity-90 transition"
            type="submit"
          >
            Anmelden
          </button>
        </form>
      </div>
    </main>
  );
}
