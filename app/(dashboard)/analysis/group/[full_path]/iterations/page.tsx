import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ANALYSIS_TARGET_COOKIE } from "@/lib/constants";
import { config } from "@/lib/config";
import { requirePat } from "@/lib/auth";
import { resolveGroupByFullPath, loadGroupIterations } from "@/lib/analysis/gitlab-group";
import { computeIterationMetricsForGroup } from "@/lib/analysis/iterations";

export const dynamic = "force-dynamic";

async function clearAnalysisTarget() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.set(ANALYSIS_TARGET_COOKIE, "", { httpOnly: false, path: "/", maxAge: 0 });
  redirect("/analysis");
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return new Intl.DateTimeFormat("de-DE", { year: "2-digit", month: "2-digit", day: "2-digit" }).format(dt);
  } catch {
    return String(d);
  }
}

function fmtTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")} h`;
}

export default async function GroupIterationsAnalysisPage(props: { params: Promise<{ full_path: string }> }) {
  const params = await props.params;
  const fullPath = String(params.full_path || "");

  const pat = await requirePat();
  const group = await resolveGroupByFullPath(fullPath, { pat });
  const iterations = await loadGroupIterations(group.id, { pat, perPage: 8, state: "all", orderBy: "start_date", sort: "desc" });
  const metrics = await computeIterationMetricsForGroup(group.id, iterations, { pat, includeSubgroups: true });

  const currentTarget = `/analysis/group/${fullPath}/iterations`;
  const gitlabUrl = `${config.gitlabBaseUrl.replace(/\/$/, "")}/groups/${fullPath}`;

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="space-y-1">
        <div className="text-sm text-gray-500">
          <Link href={`/analysis/group/${fullPath}`} className="text-blue-600 hover:underline">Analyse-Übersicht</Link>
          <span className="mx-2">/</span>
          <span>Iteration</span>
        </div>
        <h1 className="text-2xl font-semibold">Iteration-Analyse: {group.name}</h1>
        <p className="text-sm text-gray-500">{fullPath}</p>
      </header>

      <div className="flex items-center gap-3">
        <a href={gitlabUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
          In GitLab öffnen
        </a>
        <form action={clearAnalysisTarget}>
          <button type="submit" className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50">
            Auswahl ändern
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            const c = await cookies();
            c.set(ANALYSIS_TARGET_COOKIE, currentTarget, { httpOnly: false, path: "/" });
          }}
        >
          <button type="submit" className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50">
            Als Standard setzen
          </button>
        </form>
        <Link href="/dashboard" className="text-sm px-3 py-1.5 rounded hover:bg-foreground/5">Zum Board</Link>
      </div>

      <section className="rounded-md border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-medium">Iteration-Übersicht</h2>
          <span className="text-xs text-gray-500">Letzte {metrics.length} Iterationen</span>
        </div>
        {metrics.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">Keine Iterationen gefunden.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Iteration</th>
                  <th className="text-right px-3 py-2 font-medium">Issues (geschlossen)</th>
                  <th className="text-right px-3 py-2 font-medium">Gewicht (geschlossen)</th>
                  <th className="text-right px-3 py-2 font-medium">Zeit (gesamt)</th>
                  <th className="text-right px-3 py-2 font-medium">Fortschritt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {metrics.map((m) => {
                  const total = m.issuesTotal || 0;
                  const closed = m.issuesClosed || 0;
                  const wTotal = m.weightTotal || 0;
                  const wClosed = m.weightClosed || 0;
                  const pctByCount = total > 0 ? Math.round((closed / total) * 100) : 0;
                  const pctByWeight = wTotal > 0 ? Math.round((wClosed / wTotal) * 100) : 0;
                  return (
                    <tr key={m.iteration.id} className="align-top">
                      <td className="px-3 py-2">
                        <Link
                          href={`/analysis/group/${fullPath}/iterations/${m.iteration.id}`}
                          className="font-medium truncate text-blue-700 hover:underline"
                        >
                          {m.iteration.title || `Iteration #${m.iteration.iid ?? m.iteration.id}`}
                        </Link>
                        <div className="text-xs text-gray-500">
                          {fmtDate(m.iteration.start_date)} – {fmtDate(m.iteration.due_date)} • {m.iteration.state}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {total} <span className="text-gray-500">({closed})</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {wTotal} <span className="text-gray-500">({wClosed})</span>
                      </td>
                      <td className="px-3 py-2 text-right">{fmtTime(m.timeTotalSec)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="text-xs text-gray-600">{pctByCount}% nach Tickets</div>
                        <div className="text-xs text-gray-600">{pctByWeight}% nach Gewicht</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-3 text-xs text-gray-500 border-t border-gray-200">Hinweis: Subgruppen sind einbezogen.</div>
      </section>
    </div>
  );
}
