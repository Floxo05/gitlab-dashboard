import { requirePat } from "@/lib/auth";
import { gitlabGet, jsonErr, jsonOk } from "@/lib/gitlab";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pat = await requirePat();
    const res = await gitlabGet("/api/v4/user", { pat });
    if (!res.ok) return jsonErr(res.status, res.error, res.details);
    return jsonOk(res.data);
  } catch (e: any) {
    if (e?.message?.includes("No PAT")) return jsonErr(401, "Nicht angemeldet");
    return jsonErr(500, "Interner Fehler");
  }
}
