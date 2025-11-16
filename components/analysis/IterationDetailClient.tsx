"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { GitLabIssue, IterationSummary, GitLabUserRef } from "@/lib/analysis/types";

type Props = {
  summary: IterationSummary;
  issues: GitLabIssue[];
  perIssueSeconds?: Record<number, number>;
  // per issue: list of user time contributions
  perIssueUserSeconds?: Record<number, { userId: number | "__none__"; seconds: number; user: GitLabUserRef | null }[]>;
  usesFallback?: boolean;
  // context for deep links
  fullPath?: string;
  iterationId?: number;
};

type View = "summary" | "issues" | "people";

function fmtTime(sec: number) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")} h`;
}

export default function IterationDetailClient({ summary, issues, perIssueSeconds = {}, perIssueUserSeconds = {}, usesFallback = false, fullPath, iterationId }: Props) {
  const [view, setView] = useState<View>("summary");
  const [stateFilter, setStateFilter] = useState<"all" | "opened" | "closed">("all");
  const [sortBy, setSortBy] = useState<"issue" | "assignee" | "weight" | "time" | "status">("issue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(column: typeof sortBy) {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  const filteredIssues = useMemo(() => {
    if (stateFilter === "all") return issues;
    return issues.filter((i) => String(i.state).toLowerCase() === stateFilter);
  }, [issues, stateFilter]);

  const sortedIssues = useMemo(() => {
    const arr = [...filteredIssues];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const aTime = Number(perIssueSeconds[a.id] ?? a.time_stats?.total_time_spent ?? 0) || 0;
      const bTime = Number(perIssueSeconds[b.id] ?? b.time_stats?.total_time_spent ?? 0) || 0;
      const aWeight = Number(a.weight ?? 0) || 0;
      const bWeight = Number(b.weight ?? 0) || 0;
      const aAssignee = (a.assignees && a.assignees[0]?.name) || a.assignees?.[0]?.username || "";
      const bAssignee = (b.assignees && b.assignees[0]?.name) || b.assignees?.[0]?.username || "";
      const aTitle = (a.title || "") + String(a.iid ?? a.id);
      const bTitle = (b.title || "") + String(b.iid ?? b.id);
      const aStatus = String(a.state || "").toLowerCase();
      const bStatus = String(b.state || "").toLowerCase();
      switch (sortBy) {
        case "time":
          return (aTime - bTime) * dir;
        case "weight":
          return (aWeight - bWeight) * dir;
        case "assignee":
          return aAssignee.localeCompare(bAssignee, undefined, { sensitivity: "base" }) * dir;
        case "status":
          return aStatus.localeCompare(bStatus, undefined, { sensitivity: "base" }) * dir;
        case "issue":
        default:
          return aTitle.localeCompare(bTitle, undefined, { sensitivity: "base", numeric: true }) * dir;
      }
    });
    return arr;
  }, [filteredIssues, sortBy, sortDir]);

  const clientSummary = useMemo(() => {
    // Ableiten aus gefilterten Issues, damit Summary zur Filterung passt
    const total = filteredIssues.length;
    let closed = 0;
    let wTotal = 0;
    let wClosed = 0;
    let time = 0;
    for (const is of filteredIssues) {
      const isClosed = String(is.state).toLowerCase() === "closed";
      if (isClosed) closed++;
      const w = Number(is.weight ?? 0) || 0;
      wTotal += w;
      if (isClosed) wClosed += w;
      // Zeit aus Timelogs, Fallback auf time_stats wenn nicht verfügbar
      time += Number(perIssueSeconds[is.id] ?? is.time_stats?.total_time_spent ?? 0) || 0;
    }
    return { issuesTotal: total, issuesClosed: closed, weightTotal: wTotal, weightClosed: wClosed, timeTotalSec: time } as IterationSummary;
  }, [filteredIssues, perIssueSeconds]);

  // Aggregation pro Person auf Basis der Timelog-Beiträge je Issue
  type PersonRow = { user: GitLabUserRef | null; seconds: number; issues: number; issuesClosed: number; weightTotal: number; weightClosed: number };
  const byPerson = useMemo<PersonRow[]>(() => {
    const map = new Map<number | "__none__", PersonRow>();
    for (const is of filteredIssues) {
      const contribs = perIssueUserSeconds[is.id] || [];
      // Falls keine expliziten Timelogs vorhanden sind, keine Zuweisung (Personenansicht bleibt leer)
      if (!contribs.length) continue;
      const isClosed = String(is.state).toLowerCase() === "closed";
      const w = Number(is.weight ?? 0) || 0;
      for (const c of contribs) {
        const key = c.user ? (c.user.id as number) : "__none__";
        const row = map.get(key) || { user: c.user ?? null, seconds: 0, issues: 0, issuesClosed: 0, weightTotal: 0, weightClosed: 0 };
        row.seconds += Number(c.seconds || 0) || 0;
        // Zählt das Issue je Person, die daran Zeit geloggt hat
        row.issues += 1;
        if (isClosed) row.issuesClosed += 1;
        row.weightTotal += w;
        if (isClosed) row.weightClosed += w;
        map.set(key, row);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.seconds - a.seconds);
  }, [filteredIssues, perIssueUserSeconds]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
          <button
            className={`px-3 py-1.5 text-sm ${view === "summary" ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`}
            onClick={() => setView("summary")}
          >
            Übersicht
          </button>
          <button
            className={`px-3 py-1.5 text-sm border-l border-gray-300 ${view === "issues" ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`}
            onClick={() => setView("issues")}
          >
            Pro Issue
          </button>
          <button
            className={`px-3 py-1.5 text-sm border-l border-gray-300 ${view === "people" ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`}
            onClick={() => setView("people")}
          >
            Pro Person
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2 text-sm">
          <label htmlFor="stateFilter" className="text-gray-600">Status:</label>
          <select
            id="stateFilter"
            className="border border-gray-300 rounded px-2 py-1 bg-background"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value as any)}
          >
            <option value="all">Alle</option>
            <option value="opened">Offen</option>
            <option value="closed">Geschlossen</option>
          </select>
        </div>
      </div>

      {view === "summary" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-md border border-gray-200 p-4">
            <div className="text-xs text-gray-500">Issues (geschlossen)</div>
            <div className="text-xl font-semibold">{clientSummary.issuesTotal} <span className="text-gray-500 text-base">({clientSummary.issuesClosed})</span></div>
          </div>
          <div className="rounded-md border border-gray-200 p-4">
            <div className="text-xs text-gray-500">Weight (geschlossen)</div>
            <div className="text-xl font-semibold">{clientSummary.weightTotal} <span className="text-gray-500 text-base">({clientSummary.weightClosed})</span></div>
          </div>
          <div className="rounded-md border border-gray-200 p-4">
            <div className="text-xs text-gray-500">Zeit gesamt</div>
            <div className="text-xl font-semibold">{fmtTime(clientSummary.timeTotalSec)}</div>
          </div>
          <div className="rounded-md border border-gray-200 p-4">
            <div className="text-xs text-gray-500">Fortschritt</div>
            <div className="text-xl font-semibold">
              {clientSummary.issuesTotal > 0 ? Math.round((clientSummary.issuesClosed / clientSummary.issuesTotal) * 100) : 0}% (Tickets)
            </div>
          </div>
        </div>
      )}

      {view === "issues" && (
        <div className="rounded-md border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-3 py-2 font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort("issue")}
                    className="inline-flex items-center gap-1 hover:underline"
                    aria-sort={sortBy === "issue" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    Issue {sortBy === "issue" && (sortDir === "asc" ? "▲" : "▼")}
                  </button>
                </th>
                <th className="text-left px-3 py-2 font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort("assignee")}
                    className="inline-flex items-center gap-1 hover:underline"
                    aria-sort={sortBy === "assignee" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    Assignee {sortBy === "assignee" && (sortDir === "asc" ? "▲" : "▼")}
                  </button>
                </th>
                <th className="text-right px-3 py-2 font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort("weight")}
                    className="inline-flex items-center gap-1 hover:underline"
                    aria-sort={sortBy === "weight" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    Weight {sortBy === "weight" && (sortDir === "asc" ? "▲" : "▼")}
                  </button>
                </th>
                <th className="text-right px-3 py-2 font-medium min-w-[7.5rem]">
                  <button
                    type="button"
                    onClick={() => toggleSort("time")}
                    className="inline-flex items-center gap-1 hover:underline"
                    aria-sort={sortBy === "time" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    Zeit {sortBy === "time" && (sortDir === "asc" ? "▲" : "▼")}
                  </button>
                </th>
                <th className="text-left px-3 py-2 font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort("status")}
                    className="inline-flex items-center gap-1 hover:underline"
                    aria-sort={sortBy === "status" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    Status {sortBy === "status" && (sortDir === "asc" ? "▲" : "▼")}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedIssues.map((is) => (
                <tr key={is.id}>
                  <td className="px-3 py-2">
                    <a href={is.web_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                      {is.title || `#${is.iid ?? is.id}`}
                    </a>
                    {/* Zusatzinformationen: Parent & Labels */}
                    {(is.parent || (is.labels && is.labels.length > 0)) && (
                      <div className="mt-1 space-y-1">
                        {is.parent && (
                          <div className="text-xs text-gray-500">
                            Parent: {is.parent.web_url ? (
                              <a href={is.parent.web_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                {is.parent.title || `#${is.parent.iid ?? is.parent.id}`}
                              </a>
                            ) : (
                              <span>{is.parent.title || `#${is.parent.iid ?? is.parent.id}`}</span>
                            )}
                          </div>
                        )}
                        {is.labels && is.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {is.labels.slice(0, 12).map((lb, idx) => (
                              <span key={idx} className="inline-flex items-center rounded-full bg-foreground/10 text-foreground px-2 py-0.5 text-[11px]">
                                {lb}
                              </span>
                            ))}
                            {is.labels.length > 12 && (
                              <span className="text-[11px] text-gray-500">+{is.labels.length - 12} mehr</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {is.assignees && is.assignees.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {is.assignees.map((a, idx) => {
                          const uid = typeof a.id === "number" ? a.id : undefined;
                          const href = fullPath && iterationId && uid
                            ? `/analysis/group/${fullPath}/iterations/${iterationId}/person/${uid}`
                            : undefined;
                          const chip = (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px]">
                              {a.name || a.username || (uid ? `#${uid}` : "Assignee")}
                            </span>
                          );
                          return (
                            <span key={a.id ?? idx}>
                              {href ? (
                                <Link href={href} className="hover:underline">{chip}</Link>
                              ) : (
                                chip
                              )}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">{Number(is.weight ?? 0) || 0}</td>
                  <td className="px-3 py-2 text-right min-w-[7.5rem]">{fmtTime(Number(perIssueSeconds[is.id] ?? is.time_stats?.total_time_spent ?? 0) || 0)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        `inline-flex items-center rounded-full px-2 py-0.5 text-xs ` +
                        (String(is.state).toLowerCase() === "closed"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-blue-50 text-blue-700")
                      }
                    >
                      {String(is.state)}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredIssues.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-sm text-gray-600" colSpan={5}>Keine Issues für den gewählten Filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === "people" && (
        <div className="rounded-md border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Person</th>
                <th className="text-right px-3 py-2 font-medium">Issues (geschlossen)</th>
                <th className="text-right px-3 py-2 font-medium">Weight (geschlossen)</th>
                <th className="text-right px-3 py-2 font-medium">Zeit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {byPerson.map((row, idx) => (
                <tr key={row.user?.id ?? `unassigned-${idx}`}>
                  <td className="px-3 py-2">
                    {row.user ? (
                      (() => {
                        const uid = typeof row.user?.id === "number" ? row.user.id : undefined;
                        const href = fullPath && iterationId && uid
                          ? `/analysis/group/${fullPath}/iterations/${iterationId}/person/${uid}`
                          : undefined;
                        const label = row.user.name || (row.user.username ? `@${row.user.username}` : `#${row.user.id}`);
                        return href ? <Link href={href} className="text-blue-700 hover:underline">{label}</Link> : <span>{label}</span>;
                      })()
                    ) : (
                      "(unassigned)"
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">{row.issues} <span className="text-gray-500">({row.issuesClosed})</span></td>
                  <td className="px-3 py-2 text-right">{row.weightTotal} <span className="text-gray-500">({row.weightClosed})</span></td>
                  <td className="px-3 py-2 text-right">{fmtTime(row.seconds)}</td>
                </tr>
              ))}
              {byPerson.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-sm text-gray-600" colSpan={4}>Keine Daten für den gewählten Filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {usesFallback && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
          Hinweis: Timelog‑Daten konnten nicht geladen werden. Zeitwerte basieren auf der Issue‑Gesamtzeit und können pro Person ungenau sein.
        </div>
      )}
    </section>
  );
}
