import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ANALYSIS_TARGET_COOKIE } from "@/lib/constants";
import { config } from "@/lib/config";
import { requirePat } from "@/lib/auth";
import { resolveGroupByFullPath } from "@/lib/analysis/gitlab-group";
import { fetchGroupIssuesForIteration, computeIterationSummary } from "@/lib/analysis/iterations";
import { fetchTimelogsForIssues } from "@/lib/analysis/timelogs";
import type { GitLabIteration, GitLabIssue } from "@/lib/analysis/types";
import IterationDetailClient from "@/components/analysis/IterationDetailClient";

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

async function loadIteration(groupId: number, iterationId: number, opts: { pat: string }): Promise<GitLabIteration | null> {
  // Es gibt keine dedizierte GitLab-API für einzelne Iteration per ID im Gruppen-Kontext (stand heute),
  // daher laden wir die letzten 50 und picken per ID (performant genug für Detailansicht)
  const { gitlabGet } = await import("@/lib/gitlab");
  const res = await gitlabGet<GitLabIteration[]>(`/api/v4/groups/${groupId}/iterations`, {
    pat: opts.pat,
    query: { per_page: 50, state: "all", order_by: "start_date", sort: "desc" },
  });
  if (!res.ok) return null;
  return (res.data || []).find((i) => Number(i.id) === Number(iterationId)) || null;
}

export default async function GroupIterationDetailPage(props: { params: Promise<{ full_path: string; iterationId: string }> }) {
  const params = await props.params;
  const fullPath = String(params.full_path || "");
  const iterationId = Number(params.iterationId);

  const pat = await requirePat();
  const group = await resolveGroupByFullPath(fullPath, { pat });
  const iteration = await loadIteration(group.id, iterationId, { pat });
  if (!iteration) {
    throw new Error(`Iteration ${iterationId} wurde nicht gefunden.`);
  }

  // Standard: alle Issues in dieser Iteration inkl. Subgruppen, alle Stati
  const issues: GitLabIssue[] = await fetchGroupIssuesForIteration(group.id, iteration.id, {
    pat,
    includeSubgroups: true,
    state: "all",
    maxPages: 20,
  });
  const summary = computeIterationSummary(issues);

  // Timelogs via GraphQL laden und aggregieren (pro Issue & pro Person)
  let perIssueSeconds: Record<number, number> = {};
  let perIssueUserSeconds: Record<number, { userId: number | "__none__"; seconds: number; user: any }[]> = {};
  let usesFallback = false;
  try {
    const tl = await fetchTimelogsForIssues(issues, { pat });
    perIssueSeconds = tl.perIssueSeconds;
    perIssueUserSeconds = tl.perIssueUserSeconds;
  } catch (e) {
    // GraphQL fehlgeschlagen → Fallback bleibt: issue.time_stats (ungenau)
    usesFallback = true;
  }

  const currentTarget = `/analysis/group/${fullPath}/iterations/${iterationId}`;
  const gitlabUrl = `${config.gitlabBaseUrl.replace(/\/$/, "")}/groups/${fullPath}`;

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="space-y-1">
        <div className="text-sm text-gray-500">
          <Link href={`/analysis/group/${fullPath}`} className="text-blue-600 hover:underline">Analyse-Übersicht</Link>
          <span className="mx-2">/</span>
          <Link href={`/analysis/group/${fullPath}/iterations`} className="text-blue-600 hover:underline">Iterationen</Link>
          <span className="mx-2">/</span>
          <span>Iteration</span>
        </div>
        <h1 className="text-2xl font-semibold">Iteration: {iteration.title || `#${iteration.iid ?? iteration.id}`}</h1>
        <p className="text-sm text-gray-500">
          {fullPath} • {fmtDate(iteration.start_date)} – {fmtDate(iteration.due_date)} • {iteration.state}
        </p>
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

      <IterationDetailClient
        summary={summary}
        issues={issues}
        perIssueSeconds={perIssueSeconds}
        perIssueUserSeconds={perIssueUserSeconds}
        usesFallback={usesFallback}
        fullPath={fullPath}
        iterationId={iteration.id}
      />
    </div>
  );
}
