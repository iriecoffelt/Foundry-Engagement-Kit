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

export type ProjectUserKind = "team" | "stakeholder" | "both";

export interface ProjectUser {
  id: string;
  name: string;
  role: string;
  email?: string;
  organization?: string;
  kind: ProjectUserKind;
  stakeholderId?: string;
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
  teamMembers: ProjectUser[];
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

export type ArchNodeType = string;

export interface ArchitectureGraph {
  nodes: {
    id: string;
    type: ArchNodeType;
    position: { x: number; y: number };
    data: {
      label: string;
      notes?: string;
      foundryLink?: string;
      /** Links to ontology-elements.json entry when added from Ontology tab */
      ontologyElementId?: string;
      /** @deprecated Use ontologyElementId */
      ontologyObjectId?: string;
    };
  }[];
  edges: { id: string; source: string; target: string; label?: string }[];
}

export interface Milestone {
  id: string;
  name: string;
  targetDate: string;
  status: "pending" | "in_progress" | "done";
}

export interface OntologyElement {
  id: string;
  /** Kind id from Library → reference/ontology-element-types.json */
  kind: string;
  name: string;
  description: string;
  primaryKey?: string;
  properties: string[];
  linkFrom?: string;
  linkTo?: string;
  targetObject?: string;
}

/** @deprecated Use OntologyElement */
export type OntologyObjectType = OntologyElement;

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

// --- FDE execution layer ---

export type DeliveryStatus = "backlog" | "in_dev" | "in_uat" | "blocked" | "done";

export interface DeliveryCard {
  id: string;
  title: string;
  /** Delivery type id from Library → reference/delivery-types.json */
  type: string;
  status: DeliveryStatus;
  owner: string;
  designRef?: string;
  resourceId?: string;
  notes?: string;
  /** Stable link to architecture.json node id */
  architectureNodeId?: string;
  blockerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryBoard {
  cards: DeliveryCard[];
}

export type RegisterItemStatus = "open" | "resolved" | "mitigated" | "accepted";

export interface BlockerEntry {
  id: string;
  title: string;
  owner: string;
  escalate: boolean;
  status: RegisterItemStatus;
  linkedCardId?: string;
  sourcePath?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface RiskEntry {
  id: string;
  title: string;
  likelihood: "Low" | "Medium" | "High";
  impact: "Low" | "Medium" | "High";
  mitigation: string;
  status: RegisterItemStatus;
  sourcePath?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface EngagementRegister {
  blockers: BlockerEntry[];
  risks: RiskEntry[];
}

export type UatStatus = "not_started" | "pass" | "fail" | "blocked";

export interface UatScenario {
  id: string;
  scenario: string;
  steps: string;
  expected: string;
  status: UatStatus;
  tester?: string;
  testedAt?: string;
  notes?: string;
}

export interface ActionItem {
  id: string;
  title: string;
  assignee: string;
  stakeholderId?: string;
  dueDate?: string;
  status: "open" | "done";
  createdAt: string;
  completedAt?: string;
}

export interface DecisionSummary {
  number: number;
  title: string;
  status: string;
  date: string;
  path: string;
}

export interface JiraConfig {
  baseUrl?: string;
  projectKey?: string;
}

export interface TodayItem {
  id: string;
  kind: "action" | "blocker" | "delivery" | "uat" | "cadence" | "milestone";
  project: string;
  projectSlug: string;
  projectPath: string;
  title: string;
  meta?: string;
  priority: "high" | "medium" | "low";
  path?: string;
  tab?: string;
}
