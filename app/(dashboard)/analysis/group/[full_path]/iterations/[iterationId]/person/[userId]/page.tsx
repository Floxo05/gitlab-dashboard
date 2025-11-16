import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ANALYSIS_TARGET_COOKIE } from "@/lib/constants";
import { config } from "@/lib/config";
import { requirePat } from "@/lib/auth";
import { resolveGroupByFullPath } from "@/lib/analysis/gitlab-group";
import { fetchGroupIssuesForIteration } from "@/lib/analysis/iterations";
import { fetchTimelogsForIssues } from "@/lib/analysis/timelogs";
import type { GitLabIssue } from "@/lib/analysis/types";

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
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")} h`;
}

export default async function IterationPersonPage(props: { params: Promise<{ full_path: string; iterationId: string; userId: string }> }) {
  const params = await props.params;
  const fullPath = String(params.full_path || "");
  const iterationId = Number(params.iterationId);
  const userId = Number(params.userId);

  const pat = await requirePat();
  const group = await resolveGroupByFullPath(fullPath, { pat });

  // Issues der Iteration laden
  const issues: GitLabIssue[] = await fetchGroupIssuesForIteration(group.id, iterationId, {
    pat,
    includeSubgroups: true,
    state: "all",
    maxPages: 20,
  });

  // Timelogs laden und Beiträge der gewählten Person herausfiltern
  const { perIssueUserSeconds } = await fetchTimelogsForIssues(issues, { pat });

  // Liste der Issues, an denen die Person Zeit geloggt hat, inkl. Sekunden
  const rows = issues
    .map((is) => {
      const contribs = perIssueUserSeconds[is.id] || [];
      const entry = contribs.find((c) => typeof c.userId === "number" && c.userId === userId);
      const seconds = entry ? Number(entry.seconds || 0) || 0 : 0;
      return { issue: is, seconds };
    })
    .filter((r) => r.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);

  // Aggregate
  const totals = rows.reduce(
    (acc, r) => {
      const isClosed = String(r.issue.state).toLowerCase() === "closed";
      const w = Number(r.issue.weight ?? 0) || 0;
      acc.seconds += r.seconds;
      acc.issues += 1;
      if (isClosed) acc.issuesClosed += 1;
      acc.weight += w;
      if (isClosed) acc.weightClosed += w;
      return acc;
    },
    { seconds: 0, issues: 0, issuesClosed: 0, weight: 0, weightClosed: 0 }
  );

  const currentTarget = `/analysis/group/${fullPath}/iterations/${iterationId}/person/${userId}`;
  const gitlabUrl = `${config.gitlabBaseUrl.replace(/\/$/, "")}/groups/${fullPath}`;

  // Personendaten aus einem beliebigen Beitrag entnehmen (falls vorhanden)
  const anyUser = Object.values(perIssueUserSeconds)[0]?.find((c) => c.user && c.userId === userId)?.user || null;
  const personLabel = anyUser ? anyUser.name || (anyUser.username ? `@${anyUser.username}` : `#${anyUser.id}`) : `#${userId}`;

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="space-y-1">
        <div className="text-sm text-gray-500">
          <Link href={`/analysis/group/${fullPath}`} className="text-blue-600 hover:underline">Analyse-Übersicht</Link>
          <span className="mx-2">/</span>
          <Link href={`/analysis/group/${fullPath}/iterations`} className="text-blue-600 hover:underline">Iterationen</Link>
          <span className="mx-2">/</span>
          <Link href={`/analysis/group/${fullPath}/iterations/${iterationId}`} className="text-blue-600 hover:underline">Iteration</Link>
          <span className="mx-2">/</span>
          <span>Person</span>
        </div>
        <h1 className="text-2xl font-semibold">Iteration • Person: {personLabel}</h1>
        <p className="text-sm text-gray-500">{fullPath} • Iteration #{iterationId}</p>
      </header>

      <div className="flex items-center gap-3">
        <a href={gitlabUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">In GitLab öffnen</a>
        <form action={clearAnalysisTarget}>
          <button type="submit" className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50">Auswahl ändern</button>
        </form>
        <form
          action={async () => {
            "use server";
            const c = await cookies();
            c.set(ANALYSIS_TARGET_COOKIE, currentTarget, { httpOnly: false, path: "/" });
          }}
        >
          <button type="submit" className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50">Als Standard setzen</button>
        </form>
        <Link href="/dashboard" className="text-sm px-3 py-1.5 rounded hover:bg-foreground/5">Zum Board</Link>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs text-gray-500">Issues (geschlossen)</div>
          <div className="text-xl font-semibold">{totals.issues} <span className="text-gray-500 text-base">({totals.issuesClosed})</span></div>
        </div>
        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs text-gray-500">Weight (geschlossen)</div>
          <div className="text-xl font-semibold">{totals.weight} <span className="text-gray-500 text-base">({totals.weightClosed})</span></div>
        </div>
        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs text-gray-500">Zeit gesamt</div>
          <div className="text-xl font-semibold">{fmtTime(totals.seconds)}</div>
        </div>
        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs text-gray-500">Durchschnitt pro Issue</div>
          <div className="text-xl font-semibold">{fmtTime(totals.issues > 0 ? Math.round(totals.seconds / totals.issues) : 0)}</div>
        </div>
      </section>

      <section className="rounded-md border border-gray-200 overflow-x-auto">
        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-medium">Issues dieser Person in der Iteration</h2>
          <span className="text-xs text-gray-500">{rows.length} Einträge</span>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Issue</th>
              <th className="text-right px-3 py-2 font-medium">Weight</th>
              <th className="text-right px-3 py-2 font-medium min-w-[7.5rem]">Zeit (Person)</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map(({ issue, seconds }) => (
              <tr key={issue.id} className="align-top">
                <td className="px-3 py-2">
                  <a href={issue.web_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                    {issue.title || `#${issue.iid ?? issue.id}`}
                  </a>
                  {(issue.parent || (issue.labels && issue.labels.length > 0)) && (
                    <div className="mt-1 space-y-1">
                      {issue.parent && (
                        <div className="text-xs text-gray-500">
                          Parent: {issue.parent.web_url ? (
                            <a href={issue.parent.web_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                              {issue.parent.title || `#${issue.parent.iid ?? issue.parent.id}`}
                            </a>
                          ) : (
                            <span>{issue.parent.title || `#${issue.parent.iid ?? issue.parent.id}`}</span>
                          )}
                        </div>
                      )}
                      {issue.labels && issue.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {issue.labels.slice(0, 12).map((lb, idx) => (
                            <span key={idx} className="inline-flex items-center rounded-full bg-foreground/10 text-foreground px-2 py-0.5 text-[11px]">
                              {lb}
                            </span>
                          ))}
                          {issue.labels.length > 12 && (
                            <span className="text-[11px] text-gray-500">+{issue.labels.length - 12} mehr</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-right">{Number(issue.weight ?? 0) || 0}</td>
                <td className="px-3 py-2 text-right min-w-[7.5rem]">{fmtTime(seconds)}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      `inline-flex items-center rounded-full px-2 py-0.5 text-xs ` +
                      (String(issue.state).toLowerCase() === "closed"
                        ? "bg-gray-100 text-gray-700"
                        : "bg-blue-50 text-blue-700")
                    }
                  >
                    {String(issue.state)}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-sm text-gray-600" colSpan={4}>Keine Issues mit erfasster Zeit für diese Person in dieser Iteration.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
