import { loadStringListFile, listSelectOptions, saveStringListFile } from "./referenceList";

export const ORGANIZATIONS_PATH = "reference/organizations.json";

export const DEFAULT_ORGANIZATIONS: string[] = [
  "Internal",
  "Customer",
  "Partner",
];

export async function loadOrganizations(): Promise<string[]> {
  return loadStringListFile(ORGANIZATIONS_PATH, "organizations", DEFAULT_ORGANIZATIONS);
}

export async function saveOrganizations(organizations: string[]): Promise<void> {
  return saveStringListFile(ORGANIZATIONS_PATH, "organizations", organizations);
}

export function organizationSelectOptions(
  organizations: string[],
  currentValue?: string,
  emptyLabel = "Select organization",
) {
  return listSelectOptions(organizations, currentValue, emptyLabel);
}
