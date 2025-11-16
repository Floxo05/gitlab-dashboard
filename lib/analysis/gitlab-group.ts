import { gitlabGet } from "@/lib/gitlab";
import type { GitLabGroup, GitLabIteration } from "./types";

export async function resolveGroupByFullPath(fullPath: string, opts: { pat: string }) {
  const res = await gitlabGet<GitLabGroup>(`/api/v4/groups/${encodeURIComponent(fullPath)}`, { pat: opts.pat });
  if (!res.ok) throw new Error(`Gruppe konnte nicht geladen werden: [${res.status}] ${res.error}`);
  return res.data;
}

export async function loadGroupIterations(groupId: number, opts: {
  pat: string;
  perPage?: number;
  state?: "all" | "started" | "upcoming" | "closed";
  orderBy?: "start_date" | "due_date" | "created_at";
  sort?: "asc" | "desc";
}): Promise<GitLabIteration[]> {
  const { pat, perPage = 8, state = "all", orderBy = "start_date", sort = "desc" } = opts;
  const itRes = await gitlabGet<GitLabIteration[]>(`/api/v4/groups/${groupId}/iterations`, {
    pat,
    query: { state, order_by: orderBy, sort, per_page: perPage },
  });
  if (!itRes.ok) return [];
  return itRes.data ?? [];
}
