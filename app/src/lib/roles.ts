import {
  loadStringListFile,
  listSelectOptions,
  saveStringListFile,
} from "./referenceList";

export const ROLES_PATH = "reference/roles.json";

export const DEFAULT_ROLES: string[] = [
  "FDE Lead",
  "FDE",
  "Forward Deployed Engineer",
  "Technical Lead",
  "Engineering Manager",
  "Product Manager",
  "Project Manager",
  "Executive Sponsor",
  "Domain Expert",
  "Customer Owner",
  "Stakeholder",
  "Partner",
  "UAT Tester",
];

export interface RolesFile {
  roles: string[];
}

export async function loadRoles(): Promise<string[]> {
  return loadStringListFile(ROLES_PATH, "roles", DEFAULT_ROLES);
}

export async function saveRoles(roles: string[]): Promise<void> {
  return saveStringListFile(ROLES_PATH, "roles", roles);
}

export function roleSelectOptions(
  roles: string[],
  currentValue?: string,
  emptyLabel = "Select role",
): { value: string; label: string }[] {
  return listSelectOptions(roles, currentValue, emptyLabel);
}
