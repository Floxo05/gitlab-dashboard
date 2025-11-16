import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requirePat } from "@/lib/auth";
import { gitlabGet } from "@/lib/gitlab";
import { ANALYSIS_TARGET_COOKIE } from "@/lib/constants";
import { config } from "@/lib/config";

type GitLabGroup = {
  id: number;
  name: string;
  full_path: string;
  web_url?: string;
};

type GitLabProject = {
  id: number;
  name: string;
  path_with_namespace: string;
  web_url?: string;
  archived?: boolean;
};

export const dynamic = "force-dynamic";

async function setAnalysisTarget(targetPath: string) {
  "use server";
  const cookieStore = await cookies();
  cookieStore.set(ANALYSIS_TARGET_COOKIE, targetPath, {
    httpOnly: false,
    secure: config.isProd,
    sameSite: "lax",
    path: "/",
  });
  redirect(targetPath);
}

export default async function AnalysisIndexPage() {
  const cookieStore = await cookies();
  const saved = cookieStore.get(ANALYSIS_TARGET_COOKIE)?.value;
  if (saved) {
    redirect(saved);
  }

  const pat = await requirePat();

  const groupsQuery = { per_page: 50, order_by: "name", sort: "asc", top_level_only: true } as const;
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

  const groups = groupsRes.ok ? groupsRes.data : [];
  const projects = (projectsRes.ok ? projectsRes.data : []).filter((p) => !p.archived);

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Analyse</h1>
        <p className="text-sm text-gray-500">Wähle zuerst eine Gruppe oder ein Projekt für die Analyse.</p>
      </header>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-medium">Gruppen</h2>
          <span className="text-sm text-gray-500">{groups.length} Einträge</span>
        </div>
        {groups.length === 0 ? (
          <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-600">Keine Gruppen gefunden.</div>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
            {groups.map((g) => (
              <li key={g.id} className="p-4 flex items-center justify-between gap-4">
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
                  </div>
                  <div className="text-sm text-gray-500 truncate">{g.full_path}</div>
                </div>
                <form action={setAnalysisTarget.bind(null, `/analysis/group/${g.full_path}`)}>
                  <button type="submit" className="text-sm px-3 py-1.5 rounded bg-foreground/90 text-background hover:opacity-90">
                    Analysieren
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-medium">Projekte</h2>
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
                  </div>
                  <div className="text-sm text-gray-500 truncate">{p.path_with_namespace}</div>
                </div>
                <form action={setAnalysisTarget.bind(null, `/analysis/project/${p.id}`)}>
                  <button type="submit" className="text-sm px-3 py-1.5 rounded bg-foreground/90 text-background hover:opacity-90">
                    Analysieren
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
