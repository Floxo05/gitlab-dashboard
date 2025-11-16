// Minimal GraphQL client for GitLab (server-only)
import { config, assertGitLabHostAllowed } from "./config";

type GraphQLResult<T> = {
  data?: T;
  errors?: { message: string }[];
};

export async function gitlabGraphQL<T = any>(
  query: string,
  variables: Record<string, any>,
  opts: { pat: string; signal?: AbortSignal }
): Promise<{ ok: true; data: T } | { ok: false; error: string; details?: any }> {
  const endpoint = `${config.gitlabBaseUrl.replace(/\/$/, "")}/api/graphql`;
  assertGitLabHostAllowed(endpoint);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Private-Token": opts.pat,
  };
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
      signal: opts.signal,
    });
  } catch (e: any) {
    return { ok: false, error: "Network error", details: String(e?.message || e) };
  }
  const json = (await res.json().catch(() => ({}))) as GraphQLResult<T>;
  if (!res.ok) {
    return { ok: false, error: json?.errors?.[0]?.message || `HTTP ${res.status}`, details: json };
  }
  if (json.errors && json.errors.length > 0) {
    return { ok: false, error: json.errors.map((e) => e.message).join("; "), details: json };
  }
  return { ok: true, data: (json.data as T) ?? ({} as T) };
}
