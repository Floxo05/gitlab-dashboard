// Shared GitLab fetch utilities with PAT injection, whitelist and simple retry/backoff
import { config, assertGitLabHostAllowed } from "./config";

type Query = Record<string, string | number | boolean | undefined | null>;

const DEFAULT_RETRIES = 2; // total attempts = retries + 1

function buildGitLabUrl(path: string, query?: Query): string {
  const base = `${config.gitlabBaseUrl.replace(/\/$/, "")}`;
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(base + p);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  // SSRF guard (optional, depends on env setting)
  assertGitLabHostAllowed(url.toString());
  return url.toString();
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function pickRetryAfterSeconds(res: Response): number | null {
  const ra = res.headers.get("Retry-After");
  if (!ra) return null;
  const n = Number(ra);
  if (!Number.isNaN(n) && n >= 0) return n;
  // http-date not parsed here; fallback to small wait
  return 1;
}

export type GitLabError = {
  ok: false;
  status: number;
  error: string;
  details?: unknown;
};

export type GitLabSuccess<T = unknown> = {
  ok: true;
  status: number;
  data: T;
  rateLimit?: {
    limit?: number;
    remaining?: number;
    reset?: number;
  };
};

export type GitLabResult<T = unknown> = GitLabSuccess<T> | GitLabError;

function extractRate(res: Response) {
  const limit = Number(res.headers.get("ratelimit-limit") || res.headers.get("RateLimit-Limit"));
  const remaining = Number(res.headers.get("ratelimit-remaining") || res.headers.get("RateLimit-Remaining"));
  const reset = Number(res.headers.get("ratelimit-reset") || res.headers.get("RateLimit-Reset"));
  return {
    limit: Number.isFinite(limit) ? limit : undefined,
    remaining: Number.isFinite(remaining) ? remaining : undefined,
    reset: Number.isFinite(reset) ? reset : undefined,
  };
}

export async function gitlabGet<T = unknown>(
  path: string,
  opts: {
    pat: string;
    query?: Query;
    signal?: AbortSignal;
    retries?: number;
    etag?: string;
  }
): Promise<GitLabResult<T>> {
  const { pat, query, signal, etag } = opts;
  const retries = opts.retries ?? DEFAULT_RETRIES;
  let attempt = 0;
  let backoff = 250; // ms

  while (true) {
    const url = buildGitLabUrl(path, query);
    const headers: Record<string, string> = {
      // GitLab PAT: use Private-Token header
      "Private-Token": pat,
      Accept: "application/json",
    };
    if (etag) headers["If-None-Match"] = etag;

    let res: Response;
    try {
      res = await fetch(url, { method: "GET", headers, signal, cache: "no-store" });
    } catch (e: any) {
      if (attempt < retries) {
        attempt++;
        await sleep(backoff);
        backoff *= 2;
        continue;
      }
      return { ok: false, status: 599, error: "Network error", details: String(e?.message || e) };
    }

    // Retry on 429 or 5xx
    if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
      if (attempt < retries) {
        const ra = pickRetryAfterSeconds(res);
        attempt++;
        await sleep((ra ?? backoff / 1000) * 1000);
        backoff *= 2;
        continue;
      }
    }

    // Handle 204/304 no content
    if (res.status === 204 || res.status === 304) {
      return { ok: true, status: res.status, data: null as unknown as T, rateLimit: extractRate(res) };
    }

    const ctype = res.headers.get("content-type") || "";
    const isJson = ctype.includes("application/json");
    const body = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => undefined);

    if (res.ok) {
      return { ok: true, status: res.status, data: (body as T) ?? (null as any), rateLimit: extractRate(res) };
    }

    const message = isJson ? (body?.message || JSON.stringify(body)) : String(body);
    return { ok: false, status: res.status, error: message || `GitLab error ${res.status}`, details: body };
  }
}

export function jsonOk(data: unknown, init?: number | ResponseInit) {
  const status = typeof init === "number" ? init : (init as ResponseInit | undefined)?.status ?? 200;
  const headers = typeof init === "number" ? undefined : (init as ResponseInit | undefined)?.headers;
  return Response.json({ ok: true, status, data }, { status, headers });
}

export function jsonErr(status: number, error: string, details?: unknown) {
  return Response.json({ ok: false, status, error, details }, { status });
}

export async function gitlabPostJson<T = unknown>(
  path: string,
  body: unknown,
  opts: { pat: string; signal?: AbortSignal; retries?: number }
): Promise<GitLabResult<T>> {
  const { pat, signal } = opts;
  const retries = opts.retries ?? DEFAULT_RETRIES;
  let attempt = 0;
  let backoff = 250;

  while (true) {
    const url = buildGitLabUrl(path);
    const headers: Record<string, string> = {
      "Private-Token": pat,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body ?? {}),
        signal,
        cache: "no-store",
      });
    } catch (e: any) {
      if (attempt < retries) {
        attempt++;
        await sleep(backoff);
        backoff *= 2;
        continue;
      }
      return { ok: false, status: 599, error: "Network error", details: String(e?.message || e) };
    }

    if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
      if (attempt < retries) {
        const ra = pickRetryAfterSeconds(res);
        attempt++;
        await sleep((ra ?? backoff / 1000) * 1000);
        backoff *= 2;
        continue;
      }
    }

    const ctype = res.headers.get("content-type") || "";
    const isJson = ctype.includes("application/json");
    const resBody = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => undefined);
    if (res.ok) {
      return { ok: true, status: res.status, data: (resBody as T) ?? (null as any), rateLimit: extractRate(res) };
    }
    const message = isJson ? (resBody?.message || JSON.stringify(resBody)) : String(resBody);
    return { ok: false, status: res.status, error: message || `GitLab error ${res.status}`, details: resBody };
  }
}
