import type { GitLabIssue, GitLabIteration, IterationMetrics, IterationSummary, GitLabUserRef } from "./types";

export async function fetchGroupIssuesForIteration(
  groupId: number,
  iterationId: number,
  opts: { pat: string; includeSubgroups?: boolean; maxPages?: number; state?: "all" | "opened" | "closed" } 
): Promise<GitLabIssue[]> {
  const { pat, includeSubgroups = true, maxPages = 20, state = "all" } = opts;
  const perPage = 100;
  let page = 1;
  const out: GitLabIssue[] = [];
  // Lazy-load gitlab client to avoid importing server-only config in client bundles
  const { gitlabGet } = await import("@/lib/gitlab");
  while (true) {
    const issuesRes = await gitlabGet<GitLabIssue[]>(`/api/v4/groups/${groupId}/issues`, {
      pat,
      query: {
        per_page: perPage,
        page,
        include_subgroups: includeSubgroups,
        iteration_id: iterationId,
        with_time_stats: true,
        scope: "all",
        state,
      },
    });
    if (!issuesRes.ok) break;
    const batch = issuesRes.data || [];
    out.push(...batch);
    if (batch.length < perPage) break; // letzte Seite erreicht
    page++;
    if (page > maxPages) break; // harte Kappung
  }
  return out;
}

export async function computeIterationMetricsForGroup(
  groupId: number,
  iterations: GitLabIteration[],
  opts: { pat: string; includeSubgroups?: boolean }
): Promise<IterationMetrics[]> {
  const { pat, includeSubgroups } = opts;
  const arr = await Promise.all(
    (iterations || []).map(async (it) => {
      const issues = await fetchGroupIssuesForIteration(groupId, it.id, { pat, includeSubgroups });
      let issuesTotal = issues.length;
      let issuesClosed = 0;
      let weightTotal = 0;
      let weightClosed = 0;
      let timeTotalSec = 0;
      for (const is of issues) {
        const isClosed = String(is.state).toLowerCase() === "closed";
        if (isClosed) issuesClosed++;
        const w = Number(is.weight ?? 0) || 0;
        weightTotal += w;
        if (isClosed) weightClosed += w;
        const t = Number(is.time_stats?.total_time_spent ?? 0) || 0;
        timeTotalSec += t;
      }
      return { iteration: it, issuesTotal, issuesClosed, weightTotal, weightClosed, timeTotalSec } as IterationMetrics;
    })
  );
  return arr;
}

export function computeIterationSummary(issues: GitLabIssue[]): IterationSummary {
  let issuesTotal = issues.length;
  let issuesClosed = 0;
  let weightTotal = 0;
  let weightClosed = 0;
  let timeTotalSec = 0;
  for (const is of issues) {
    const isClosed = String(is.state).toLowerCase() === "closed";
    if (isClosed) issuesClosed++;
    const w = Number(is.weight ?? 0) || 0;
    weightTotal += w;
    if (isClosed) weightClosed += w;
    const t = Number(is.time_stats?.total_time_spent ?? 0) || 0;
    timeTotalSec += t;
  }
  return { issuesTotal, issuesClosed, weightTotal, weightClosed, timeTotalSec };
}

export type AssigneeAggregation = {
  user: GitLabUserRef | null;
  issues: number;
  issuesClosed: number;
  weightTotal: number;
  weightClosed: number;
  timeTotalSec: number;
};

export function aggregateByAssignee(issues: GitLabIssue[]): AssigneeAggregation[] {
  const map = new Map<number | "__unassigned__", AssigneeAggregation>();
  const keyFor = (u: GitLabUserRef | undefined) => (u && typeof u.id === "number" ? u.id : "__unassigned__");

  for (const is of issues) {
    const assignee = (is.assignees && is.assignees[0]) || undefined; // erste:n Zuständige:n
    const key = keyFor(assignee);
    const entry = map.get(key) ?? {
      user: assignee ?? null,
      issues: 0,
      issuesClosed: 0,
      weightTotal: 0,
      weightClosed: 0,
      timeTotalSec: 0,
    };
    entry.issues += 1;
    const isClosed = String(is.state).toLowerCase() === "closed";
    if (isClosed) entry.issuesClosed += 1;
    const w = Number(is.weight ?? 0) || 0;
    entry.weightTotal += w;
    if (isClosed) entry.weightClosed += w;
    const t = Number(is.time_stats?.total_time_spent ?? 0) || 0;
    entry.timeTotalSec += t;
    map.set(key, entry);
  }

  return Array.from(map.values()).sort((a, b) => b.timeTotalSec - a.timeTotalSec);
}
