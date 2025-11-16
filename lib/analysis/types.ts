// Reusable types for analysis

export type GitLabGroup = {
  id: number;
  full_path: string;
  name: string;
};

export type GitLabIteration = {
  id: number;
  iid?: number;
  title?: string;
  state?: "upcoming" | "started" | "closed" | string;
  start_date?: string | null;
  due_date?: string | null;
};

export type GitLabUserRef = { id: number; username?: string; name?: string; web_url?: string; avatar_url?: string };

export type GitLabIssue = {
  id: number;
  iid?: number;
  title?: string;
  web_url?: string;
  state: "opened" | "closed" | string;
  weight?: number | null;
  time_stats?: { total_time_spent?: number | null };
  // optional: Kontext fürs Timelogging via GraphQL
  project_id?: number;
  project_path_with_namespace?: string;
  assignees?: GitLabUserRef[];
  author?: GitLabUserRef;
  labels?: string[];
  // Optional: Parent-Issue (falls API es liefert; ansonsten undefined)
  parent?: {
    id: number;
    iid?: number;
    title?: string;
    web_url?: string;
  };
};

export type IterationMetrics = {
  iteration: GitLabIteration;
  issuesTotal: number;
  issuesClosed: number;
  weightTotal: number;
  weightClosed: number;
  timeTotalSec: number;
};

export type IterationSummary = {
  issuesTotal: number;
  issuesClosed: number;
  weightTotal: number;
  weightClosed: number;
  timeTotalSec: number;
};
