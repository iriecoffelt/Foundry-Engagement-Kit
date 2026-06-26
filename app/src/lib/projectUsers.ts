import { loadEngagementJson, saveEngagementJson } from "./engagementData";
import type { ProjectUser, ProjectUserKind, Stakeholder } from "../types";

export function newProjectUserId() {
  return `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function emptyTeamMember(): ProjectUser {
  return {
    id: newProjectUserId(),
    name: "",
    role: "FDE",
    email: "",
    organization: "Internal",
    kind: "team",
  };
}

function normalizeUser(raw: Partial<ProjectUser>): ProjectUser {
  return {
    id: raw.id || newProjectUserId(),
    name: raw.name?.trim() || "",
    role: raw.role?.trim() || "",
    email: raw.email?.trim() || "",
    organization: raw.organization?.trim() || "",
    kind: raw.kind || "team",
    stakeholderId: raw.stakeholderId,
  };
}

export function userPickerOptions(users: ProjectUser[]): { value: string; label: string }[] {
  return users
    .filter((u) => u.name.trim())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((u) => ({
      value: u.name,
      label: u.role ? `${u.name} (${u.role})` : u.name,
    }));
}

export function seedUsersFromEngagement(eng: Record<string, unknown>): ProjectUser[] {
  const users: ProjectUser[] = [];
  const seen = new Set<string>();

  const fdeLead = String(eng.fdeLead || "").trim();
  if (fdeLead) {
    users.push({
      id: "u-fde-lead",
      name: fdeLead,
      role: "FDE Lead",
      organization: "Internal",
      kind: "team",
    });
    seen.add(fdeLead.toLowerCase());
  }

  const stakeholders = Array.isArray(eng.stakeholders) ? (eng.stakeholders as Stakeholder[]) : [];
  for (const sh of stakeholders) {
    const name = sh.name?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) {
      const existing = users.find((u) => u.name.toLowerCase() === key);
      if (existing && existing.kind === "team") existing.kind = "both";
      continue;
    }
    users.push({
      id: newProjectUserId(),
      name,
      role: sh.role?.trim() || "Stakeholder",
      organization: "Customer",
      kind: "stakeholder",
      stakeholderId: sh.id,
    });
    seen.add(key);
  }

  return users;
}

export function mergeStakeholdersIntoUsers(
  users: ProjectUser[],
  stakeholders: Stakeholder[],
): ProjectUser[] {
  const stakeholderIds = new Set(
    stakeholders.map((sh) => sh.id).filter((id): id is string => Boolean(id)),
  );
  const stakeholderNames = new Set(
    stakeholders
      .map((sh) => sh.name?.trim().toLowerCase())
      .filter((name): name is string => Boolean(name)),
  );

  const pruned = users.flatMap((u): ProjectUser[] => {
    if (u.stakeholderId) {
      if (stakeholderIds.has(u.stakeholderId)) return [u];
      if (u.kind === "both") {
        return [{ ...u, kind: "team", stakeholderId: undefined }];
      }
      if (u.kind === "stakeholder") {
        return [];
      }
      return [{ ...u, stakeholderId: undefined }];
    }

    if (u.kind === "stakeholder") {
      const nameKey = u.name.trim().toLowerCase();
      if (nameKey && stakeholderNames.has(nameKey)) return [u];
      return [];
    }

    return [u];
  });

  const next = pruned.map((u) => ({ ...u }));
  const byStakeholderId = new Map(
    next.filter((u) => u.stakeholderId).map((u) => [u.stakeholderId!, u]),
  );
  const byName = new Map(next.map((u) => [u.name.toLowerCase(), u]));

  for (const sh of stakeholders) {
    const name = sh.name?.trim();
    if (!name) continue;
    const id = sh.id || newProjectUserId();

    if (sh.id && byStakeholderId.has(sh.id)) {
      const user = byStakeholderId.get(sh.id)!;
      user.name = name;
      user.role = sh.role?.trim() || user.role;
      user.organization = user.organization || "Customer";
      user.kind = user.kind === "team" ? "both" : "stakeholder";
      continue;
    }

    const existing = byName.get(name.toLowerCase());
    if (existing) {
      existing.stakeholderId = id;
      existing.role = sh.role?.trim() || existing.role;
      existing.organization = existing.organization || "Customer";
      existing.kind = existing.kind === "team" ? "both" : "stakeholder";
      continue;
    }

    const created: ProjectUser = {
      id: newProjectUserId(),
      name,
      role: sh.role?.trim() || "Stakeholder",
      organization: "Customer",
      kind: "stakeholder",
      stakeholderId: id,
    };
    next.push(created);
    byName.set(name.toLowerCase(), created);
    byStakeholderId.set(id, created);
  }

  return next;
}

export function buildProjectUsersFromWizard(
  fdeLead: string,
  teamMembers: ProjectUser[],
  stakeholders: Stakeholder[],
): ProjectUser[] {
  let users: ProjectUser[] = [];

  const lead = fdeLead.trim();
  if (lead) {
    users.push({
      id: "u-fde-lead",
      name: lead,
      role: "FDE Lead",
      organization: "Internal",
      kind: "team",
    });
  }

  for (const member of teamMembers) {
    if (!member.name.trim()) continue;
    if (lead && member.name.trim().toLowerCase() === lead.toLowerCase()) continue;
    users.push(normalizeUser({ ...member, kind: "team", organization: member.organization || "Internal" }));
  }

  return mergeStakeholdersIntoUsers(users, stakeholders);
}

export async function loadProjectUsers(projectPath: string): Promise<ProjectUser[]> {
  try {
    const eng = await loadEngagementJson(projectPath);
    const stakeholders = Array.isArray(eng.stakeholders)
      ? (eng.stakeholders as Stakeholder[])
      : [];

    let users = Array.isArray(eng.projectUsers)
      ? (eng.projectUsers as ProjectUser[]).map(normalizeUser)
      : [];

    if (!users.length) {
      users = seedUsersFromEngagement(eng);
    }

    const synced = mergeStakeholdersIntoUsers(users, stakeholders).filter((u) => u.name.trim());

    const syncKey = (list: ProjectUser[]) =>
      [...list]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((u) => `${u.id}:${u.kind}:${u.stakeholderId ?? ""}:${u.name}`)
        .join("|");

    const changed = users.length > 0 && syncKey(synced) !== syncKey(users);

    if (changed) {
      await saveEngagementJson(projectPath, { ...eng, projectUsers: synced });
    }

    return synced;
  } catch {
    return [];
  }
}

export async function saveProjectUsers(
  projectPath: string,
  users: ProjectUser[],
): Promise<void> {
  const cleaned = users
    .filter((u) => u.name.trim())
    .map(normalizeUser);

  const eng = await loadEngagementJson(projectPath);
  const stakeholders = Array.isArray(eng.stakeholders)
    ? (eng.stakeholders as Stakeholder[])
    : [];
  const synced = mergeStakeholdersIntoUsers(cleaned, stakeholders);

  await saveEngagementJson(projectPath, { ...eng, projectUsers: synced });
}

export function kindLabel(kind: ProjectUserKind): string {
  if (kind === "both") return "Team & stakeholder";
  if (kind === "stakeholder") return "Stakeholder";
  return "Team";
}
