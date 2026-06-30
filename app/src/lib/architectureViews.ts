export type ArchitectureViewId = "working" | "ontology";

export interface ArchitectureViewDefinition {
  id: ArchitectureViewId;
  label: string;
  /** Relative path under project root */
  path: string;
  /** When true, syncs with the delivery board */
  deliveryLinked: boolean;
  description: string;
}

export const ARCHITECTURE_VIEWS: ArchitectureViewDefinition[] = [
  {
    id: "working",
    label: "Working diagram",
    path: "02-design/architecture.json",
    deliveryLinked: true,
    description: "Engagement architecture linked to the delivery board",
  },
  {
    id: "ontology",
    label: "Foundry ontology",
    path: "02-design/ontology-architecture.json",
    deliveryLinked: false,
    description: "Read-only reference graph imported from Foundry — not synced to delivery",
  },
];

export function architectureViewById(id: ArchitectureViewId): ArchitectureViewDefinition {
  return ARCHITECTURE_VIEWS.find((v) => v.id === id) ?? ARCHITECTURE_VIEWS[0];
}

export function architectureRelativePath(
  projectPath: string,
  viewId: ArchitectureViewId = "working",
): string {
  return `${projectPath}/${architectureViewById(viewId).path}`;
}

function viewStorageKey(projectPath: string): string {
  return `architecture-view-${projectPath.replace(/[^a-zA-Z0-9]/g, "-")}`;
}

export function loadStoredArchitectureView(projectPath: string): ArchitectureViewId {
  try {
    const stored = localStorage.getItem(viewStorageKey(projectPath));
    if (stored === "ontology" || stored === "working") return stored;
  } catch {
    // ignore
  }
  return "working";
}

export function storeArchitectureView(projectPath: string, viewId: ArchitectureViewId): void {
  try {
    localStorage.setItem(viewStorageKey(projectPath), viewId);
  } catch {
    // ignore
  }
}
