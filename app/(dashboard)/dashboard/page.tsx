import { config } from "@/lib/config";
import { requirePat } from "@/lib/auth";
import { gitlabGet } from "@/lib/gitlab";

type ApiOk<T> = { ok: true; status: number; data: T };
type ApiErr = { ok: false; status: number; error: string; details?: unknown };
type ApiResult<T> = ApiOk<T> | ApiErr;

type GitLabGroup = {
  id: number;
  name: string;
  full_path: string;
  web_url?: string;
  visibility?: string;
  updated_at?: string;
};

type GitLabProject = {
  id: number;
  name: string;
  path_with_namespace: string;
  web_url?: string;
  visibility?: string;
  star_count?: number;
  last_activity_at?: string;
  archived?: boolean;
};

// no client-side fetch here; we call GitLab via our server-side lib directly

function fmtDate(d?: string) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return new Intl.DateTimeFormat("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(dt);
  } catch {
    return d;
  }
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Read PAT from secure cookie (server-side only)
  const pat = await requirePat();
  // Build queries equivalent to our internal REST endpoints
  const groupsQuery = { per_page: 50, order_by: "name", sort: "desc", top_level_only: true } as const;
  const projectsQuery = {
    per_page: 50,
    simple: true,
    membership: true,
    order_by: "last_activity_at",
    sort: "desc",
  } as const;

  const [groupsRes, projectsRes] = await Promise.all([
    gitlabGet<GitLabGroup[]>("/api/v4/groups", { pat, query: groupsQuery }),
    gitlabGet<GitLabProject[]>("/api/v4/projects", { pat, query: projectsQuery }),
  ]);

  if (!groupsRes.ok) {
    throw new Error(`Gruppen konnten nicht geladen werden: [${groupsRes.status}] ${groupsRes.error}`);
  }
  if (!projectsRes.ok) {
    throw new Error(`Projekte konnten nicht geladen werden: [${projectsRes.status}] ${projectsRes.error}`);
  }

  // Optional: archivierte Projekte ausblenden (Default)
  const projects = (projectsRes.data || []).filter((p) => !p.archived);
  const groups = groupsRes.data || [];

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-gray-500">Übersicht deiner Gruppen und Projekte</p>
      </header>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-medium">Meine Gruppen</h2>
          <span className="text-sm text-gray-500">{groups.length} Einträge</span>
        </div>
        {groups.length === 0 ? (
          <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-600">Keine Gruppen gefunden.</div>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
            {groups.map((g) => (
              <li key={g.id} className="p-4 flex items-center gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{g.name}</span>
                    <a
                      href={g.web_url || `${config.gitlabBaseUrl}/groups/${g.full_path}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      in GitLab öffnen
                    </a>
                    {g.visibility && (
                      <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                        {g.visibility}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 truncate">{g.full_path}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-medium">Meine Projekte</h2>
          <span className="text-sm text-gray-500">{projects.length} Einträge</span>
        </div>
        {projects.length === 0 ? (
          <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-600">Keine Projekte gefunden.</div>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
            {projects.map((p) => (
              <li key={p.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{p.name}</span>
                    <a
                      href={p.web_url || `${config.gitlabBaseUrl}/${p.path_with_namespace}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      in GitLab öffnen
                    </a>
                    {p.visibility && (
                      <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                        {p.visibility}
                      </span>
                    )}
                    {typeof p.star_count === "number" && p.star_count > 0 && (
                      <span className="text-xs rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-800">★ {p.star_count}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 truncate">{p.path_with_namespace}</div>
                </div>
                <div className="shrink-0 text-sm text-gray-500">Letzte Aktivität: {fmtDate(p.last_activity_at)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
