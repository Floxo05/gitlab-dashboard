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

export default async function GroupAnalysisOverviewPage(props: { params: Promise<{ full_path: string }> }) {
  const params = await props.params;
  const fullPath = String(params.full_path || "");

  const currentTarget = `/analysis/group/${fullPath}`;

  const gitlabUrl = `${config.gitlabBaseUrl.replace(/\/$/, "")}/groups/${fullPath}`;

  const analyses: { href: string; title: string; desc: string }[] = [
    { href: `/analysis/group/${fullPath}/iterations`, title: "Iterationen", desc: "Issues, Weight und Zeit pro Iteration – Fortschritt & Abschluss." },
    { href: `/analysis/group/${fullPath}/issues`, title: "Issues nach Status/Label", desc: "Offen/geschlossen, SLA, Labels, Trends (Platzhalter)." },
    { href: `/analysis/group/${fullPath}/merge-requests`, title: "Merge-Requests Durchsatz", desc: "Erstellt/merged, Review-Zeiten, WIP (Platzhalter)." },
    { href: `/analysis/group/${fullPath}/cycle-time`, title: "Cycle/Lead Time", desc: "Von Erstellung bis Abschluss/Deploy (Platzhalter)." },
  ];

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Analyse-Übersicht: Gruppe</h1>
        <p className="text-sm text-gray-500">{fullPath}</p>
      </header>

      <div className="flex items-center gap-3">
        <a href={gitlabUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
          In GitLab öffnen
        </a>
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

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {analyses.map((a) => (
          <Link key={a.href} href={a.href} className="block rounded-md border border-gray-200 p-4 hover:bg-foreground/5">
            <div className="font-medium">{a.title}</div>
            <div className="text-sm text-gray-600 mt-1">{a.desc}</div>
          </Link>
        ))}
      </section>
    </div>
  );
}
