import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ANALYSIS_TARGET_COOKIE } from "@/lib/constants";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

async function clearAnalysisTarget() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.set(ANALYSIS_TARGET_COOKIE, "", { httpOnly: false, path: "/", maxAge: 0 });
  redirect("/analysis");
}

export default async function GroupCycleTimePage(props: { params: Promise<{ full_path: string }> }) {
  const params = await props.params;
  const fullPath = String(params.full_path || "");

  const cookieStore = await cookies();
  const currentTarget = `/analysis/group/${fullPath}/cycle-time`;
  const gitlabUrl = `${config.gitlabBaseUrl.replace(/\/$/, "")}/groups/${fullPath}`;
  cookieStore.set(ANALYSIS_TARGET_COOKIE, currentTarget, { httpOnly: false, path: "/" });

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="space-y-1">
        <div className="text-sm text-gray-500">
          <Link href={`/analysis/group/${fullPath}`} className="text-blue-600 hover:underline">Analyse-Übersicht</Link>
          <span className="mx-2">/</span>
          <span>Cycle/Lead Time</span>
        </div>
        <h1 className="text-2xl font-semibold">Cycle/Lead Time (Platzhalter)</h1>
        <p className="text-sm text-gray-500">{fullPath}</p>
      </header>

      <div className="flex items-center gap-3">
        <a href={gitlabUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">In GitLab öffnen</a>
        <form action={clearAnalysisTarget}>
          <button type="submit" className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50">Auswahl ändern</button>
        </form>
        <Link href="/dashboard" className="text-sm px-3 py-1.5 rounded hover:bg-foreground/5">Zum Board</Link>
      </div>

      <section className="rounded-md border border-gray-200 p-4">
        <div className="text-sm text-gray-600">Demnächst: Zeit von Issue-Erstellung bis Abschluss/Deploy, Perzentile, Trends.</div>
      </section>
    </div>
  );
}
