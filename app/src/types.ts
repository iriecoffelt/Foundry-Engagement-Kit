export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileEntry[];
}

export type Section =
  | "home"
  | "portfolio"
  | "projects"
  | "daily"
  | "weekly"
  | "library"
  | "search"
  | "focus"
  | "settings";

export interface SearchHit {
  path: string;
  name: string;
  snippet: string;
  category: string;
  project: string | null;
}

export interface OpenFile {
  path: string;
  content: string;
  dirty: boolean;
}

export interface ProjectMeta {
  slug: string;
  path: string;
  display_name: string;
  customer: string;
  status: string;
  target_go_live: string;
}

export type EngagementStatus =
  | "discovery"
  | "scoping"
  | "design"
  | "build"
  | "deploy"
  | "handoff";

export interface Stakeholder {
  id?: string;
  name: string;
  role: string;
  influence: string;
  interest?: string;
  notes: string;
}

export interface SuccessMetric {
  metric: string;
  baseline: string;
  target: string;
}

export interface EngagementData {
  displayName: string;
  customer: string;
  fdeLead: string;
  startDate: string;
  targetGoLive: string;
  status: EngagementStatus;
  description: string;
  asIs: string;
  pain: string;
  toBe: string;
  outOfScope: string;
  foundryStackUrl?: string;
  stakeholders: Stakeholder[];
  successMetrics: SuccessMetric[];
}

export interface StandupData {
  projectSlug: string;
  projectDisplay: string;
  date?: string;
  milestone: string;
  yesterday: string[];
  today: { task: string; surface: string; priority: string }[];
  blockers: { blocker: string; owner: string; escalate: boolean }[];
  meetings: string;
  notes: string;
}

export interface WeeklyReviewData {
  projectSlug: string;
  projectDisplay: string;
  date?: string;
  phase: string;
  wins: string[];
  deliverables: { name: string; resource: string; customerVisible: boolean }[];
  risks: { risk: string; likelihood: string; impact: string; mitigation: string }[];
  nextWeek: string[];
  openQuestions: string;
}

export type ArchNodeType =
  | "source"
  | "dataset"
  | "pipeline"
  | "objectType"
  | "workshop"
  | "user";

export interface ArchitectureGraph {
  nodes: {
    id: string;
    type: ArchNodeType;
    position: { x: number; y: number };
    data: { label: string; notes?: string; foundryLink?: string };
  }[];
  edges: { id: string; source: string; target: string; label?: string }[];
}

export interface Milestone {
  id: string;
  name: string;
  targetDate: string;
  status: "pending" | "in_progress" | "done";
}

export interface OntologyObjectType {
  id: string;
  name: string;
  description: string;
  primaryKey: string;
  properties: string[];
}

export interface CustomerSyncData {
  projectSlug: string;
  projectDisplay: string;
  meetingName: string;
  attendees: string;
  duration: string;
  objective: string;
  statusSummary: string;
  demoActions: string;
  decisionsNeeded: string;
  risks: string;
}
