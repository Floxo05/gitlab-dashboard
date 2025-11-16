import { requirePat } from "@/lib/auth";
import { gitlabGet, jsonErr, jsonOk } from "@/lib/gitlab";

export const dynamic = "force-dynamic";

const allowedParams = new Set([
  "page",
  "per_page",
  "all_available",
  "owned",
  "min_access_level",
  "search",
  "order_by",
  "sort",
  "top_level_only",
]);

function pickQuery(url: URL) {
  const out: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) {
    if (allowedParams.has(k)) out[k] = v;
  }
  if (!out.per_page) out.per_page = "50";
  return out;
}

export async function GET(request: Request) {
  try {
    const pat = await requirePat();
    const url = new URL(request.url);
    const query = pickQuery(url);
    const res = await gitlabGet("/api/v4/groups", { pat, query });
    if (!res.ok) return jsonErr(res.status, res.error, res.details);
    return jsonOk(res.data);
  } catch (e: any) {
    if (e?.message?.includes("No PAT")) return jsonErr(401, "Nicht angemeldet");
    return jsonErr(500, "Interner Fehler");
  }
}
