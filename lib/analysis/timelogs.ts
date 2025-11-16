// Server-only: Fetch and aggregate timelogs via GitLab GraphQL
import type { GitLabIssue, GitLabUserRef } from "./types";

type TimelogNode = {
  timeSpent: number; // seconds
  spentAt?: string | null;
  user?: { id?: string | null; username?: string | null; name?: string | null; webUrl?: string | null; avatarUrl?: string | null } | null;
};

type IssueTimelogsResponse = {
  project: {
    issue: {
      iid: string;
      id: string;
      timelogs: {
        nodes: TimelogNode[];
        pageInfo: { hasNextPage: boolean; endCursor?: string | null };
      };
    } | null;
  } | null;
};

const ISSUE_TIMELOGS_QUERY = /* GraphQL */ `
  query IssueTimelogs($fullPath: ID!, $iid: String!, $after: String) {
    project(fullPath: $fullPath) {
      issue(iid: $iid) {
        iid
        id
        timelogs(first: 100, after: $after) {
          nodes {
            timeSpent
            spentAt
            user { id username name webUrl avatarUrl }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  }
`;

async function fetchIssueTimelogsGQL(projectFullPath: string, issueIid: number, opts: { pat: string }) {
  const { gitlabGraphQL } = await import("@/lib/gitlab-graphql");
  const all: TimelogNode[] = [];
  let after: string | undefined;
  for (let i = 0; i < 50; i++) {
    const res = await gitlabGraphQL<IssueTimelogsResponse>(ISSUE_TIMELOGS_QUERY, { fullPath: projectFullPath, iid: String(issueIid), after }, { pat: opts.pat });
    if (!res.ok) {
      throw new Error(res.error);
    }
    const nodes = res.data.project?.issue?.timelogs?.nodes ?? [];
    all.push(...nodes);
    const pi = res.data.project?.issue?.timelogs?.pageInfo;
    if (!pi?.hasNextPage) break;
    after = pi?.endCursor ?? undefined;
  }
  return all;
}

function parseProjectPathAndIidFromWebUrl(webUrl?: string): { projectPath?: string; iid?: number } {
  if (!webUrl) return {};
  // Try to match .../<namespace>/<project>/-/issues/<iid>
  try {
    const u = new URL(webUrl);
    const parts = u.pathname.split("/").filter(Boolean);
    // find the segment "-" then "issues" before iid
    const dashIdx = parts.lastIndexOf("-");
    const issuesIdx = parts.lastIndexOf("issues");
    if (issuesIdx > 0) {
      const iidStr = parts[issuesIdx + 1];
      const iid = Number(iidStr);
      // project path is everything before "/-/issues/<iid>"
      let cut = issuesIdx - 1; // index of '-'
      if (dashIdx >= 0 && dashIdx < issuesIdx) cut = dashIdx - 1;
      const projectPath = parts.slice(0, cut + 1).join("/");
      if (projectPath && Number.isFinite(iid)) return { projectPath, iid };
    }
  } catch {
    // ignore
  }
  return {};
}

export type PerIssueSeconds = Record<number, number>;
export type PerIssueUserSeconds = Record<number, { userId: number | "__none__"; seconds: number; user: GitLabUserRef | null }[]>;
export type PerUserSecondsRow = { userId: number | "__none__"; seconds: number; user: GitLabUserRef | null };

export async function fetchTimelogsForIssues(issues: GitLabIssue[], opts: { pat: string }): Promise<{
  perIssueSeconds: PerIssueSeconds;
  perIssueUserSeconds: PerIssueUserSeconds;
  perUserSeconds: PerUserSecondsRow[];
}> {
  const perIssueSeconds: PerIssueSeconds = {};
  const perIssueUserSeconds: PerIssueUserSeconds = {};
  const perUser = new Map<number | "__none__", { user: GitLabUserRef | null; seconds: number }>();

  // Simple sequential to be safe; can be optimized with limited concurrency later
  for (const issue of issues) {
    const iid = typeof issue.iid === "number" ? issue.iid : parseProjectPathAndIidFromWebUrl(issue.web_url).iid;
    const projectPath = issue.project_path_with_namespace || parseProjectPathAndIidFromWebUrl(issue.web_url).projectPath;
    if (!iid || !projectPath) {
      // cannot fetch timelogs without both
      continue;
    }
    let nodes: TimelogNode[] = [];
    try {
      nodes = await fetchIssueTimelogsGQL(projectPath, iid, { pat: opts.pat });
    } catch {
      nodes = [];
    }

    let issueTotal = 0;
    const perUserForIssue = new Map<number | "__none__", { user: GitLabUserRef | null; seconds: number }>();
    for (const n of nodes) {
      const seconds = Number(n.timeSpent || 0) || 0;
      const gid = (n.user?.id ?? "").toString();
      // GitLab GraphQL global IDs look like gid://gitlab/User/123; we just want the numeric id
      let numericId: number | "__none__" = "__none__";
      const match = gid.match(/\/(\d+)$/);
      if (match) numericId = Number(match[1]);
      const user: GitLabUserRef | null = n.user
        ? { id: typeof numericId === "number" ? numericId : -1, username: n.user.username ?? undefined, name: n.user.name ?? undefined, web_url: n.user.webUrl ?? undefined, avatar_url: n.user.avatarUrl ?? undefined }
        : null;

      const key = user ? (user.id as number) : "__none__";
      const existing = perUserForIssue.get(key) || { user, seconds: 0 };
      existing.seconds += seconds;
      perUserForIssue.set(key, existing);

      const globalAgg = perUser.get(key) || { user, seconds: 0 };
      globalAgg.seconds += seconds;
      perUser.set(key, globalAgg);

      issueTotal += seconds;
    }

    perIssueSeconds[issue.id] = issueTotal;
    perIssueUserSeconds[issue.id] = Array.from(perUserForIssue.entries()).map(([key, val]) => ({ userId: key, seconds: val.seconds, user: val.user }));
  }

  const perUserSeconds: PerUserSecondsRow[] = Array.from(perUser.entries())
    .map(([userId, v]) => ({ userId, seconds: v.seconds, user: v.user }))
    .sort((a, b) => b.seconds - a.seconds);

  return { perIssueSeconds, perIssueUserSeconds, perUserSeconds };
}
