import type { ProjectMeta } from "../types";

interface EngagementJson {
  displayName?: string;
  customer?: string;
  fdeLead?: string;
  status?: string;
  targetGoLive?: string;
  description?: string;
  milestones?: { name: string; targetDate: string; status: string }[];
}

export function generateCustomerSummary(
  project: ProjectMeta,
  engagement: EngagementJson | null,
  phaseProgress: number,
): string {
  const name = engagement?.displayName || project.display_name;
  const customer = engagement?.customer || project.customer;
  const status = engagement?.status || project.status;
  const goLive = engagement?.targetGoLive || project.target_go_live;
  const desc = engagement?.description || "";

  const lines = [
    `📋 ${name} — Status Update`,
    `Customer: ${customer}`,
    `Phase: ${status} (${phaseProgress}% checklist complete)`,
    goLive ? `Target go-live: ${goLive}` : "",
    "",
    desc ? `Summary: ${desc}` : "",
    "",
    "Recent progress:",
    "• [Add your latest win here before sending]",
    "",
    "Next steps:",
    "• [Add upcoming milestone or deliverable]",
    "",
    "Questions / decisions needed:",
    "• None at this time",
  ].filter((l) => l !== undefined);

  return lines.join("\n");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
