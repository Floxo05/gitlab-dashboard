import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ANALYSIS_TARGET_COOKIE } from "@/lib/constants";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

async function clearAnalysisTarget() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.set(ANALYSIS_TARGET_COOKIE, "", {
    httpOnly: false,
    path: "/",
    maxAge: 0,
  });
  redirect("/analysis");
}

export default async function ProjectAnalysisPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const projectId = String(params.id);

  const currentTarget = `/analysis/project/${projectId}`;

  const gitlabUrl = `${config.gitlabBaseUrl.replace(/\/$/, "")}/projects/${projectId}`;

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Analyse: Projekt</h1>
        <p className="text-sm text-gray-500">ID: {projectId}</p>
      </header>

      <div className="flex items-center gap-3">
        <a href={gitlabUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
          In GitLab öffnen
        </a>
        <form action={clearAnalysisTarget}>
          <button type="submit" className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50">
            Auswahl ändern
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            const c = await cookies();
            c.set(ANALYSIS_TARGET_COOKIE, currentTarget, { httpOnly: false, path: "/" });
          }}
        >
          <button type="submit" className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50">
            Als Standard setzen
          </button>
        </form>
        <Link href="/dashboard" className="text-sm px-3 py-1.5 rounded hover:bg-foreground/5">
          Zum Board
        </Link>
      </div>

      <section className="rounded-md border border-gray-200 p-4">
        <div className="text-sm text-gray-600">
          Platzhalter für Projekt-Analysen (Pipelines, MRs, Issues, CI/CD, Releases …)
        </div>
      </section>
    </div>
  );
}
