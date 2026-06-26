import { Contact2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyTeamMember,
  kindLabel,
  loadProjectUsers,
  saveProjectUsers,
} from "../../lib/projectUsers";
import { useDebouncedPersist } from "../../hooks/useDebouncedPersist";
import { useConfirm } from "../../context/ConfirmContext";
import { useToast } from "../../context/ToastContext";
import { subscribeEngagementSaved } from "../../lib/engagementData";
import type { ProjectMeta, ProjectUser } from "../../types";
import { Field, PrimaryButton, TextInput } from "../forms/FormField";
import { OrganizationSelect } from "../OrganizationSelect";
import { RoleSelect } from "../RoleSelect";

interface ProjectUsersViewProps {
  project: ProjectMeta;
}

export function ProjectUsersView({ project }: ProjectUsersViewProps) {
  const confirm = useConfirm();
  const showToast = useToast();
  const [users, setUsers] = useState<ProjectUser[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const usersRef = useRef<ProjectUser[]>([]);
  usersRef.current = users;

  const load = useCallback(async () => {
    const list = await loadProjectUsers(project.path);
    usersRef.current = list;
    setUsers(list);
    setSelectedId((current) => current ?? list.find((u) => u.kind === "team")?.id ?? list[0]?.id ?? null);
  }, [project.path]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return subscribeEngagementSaved((projectPath) => {
      if (projectPath === project.path) load();
    });
  }, [load, project.path]);

  const { schedule: scheduleSave, flushNow: flushSave } = useDebouncedPersist<ProjectUser[]>({
    save: (next) => saveProjectUsers(project.path, next),
    onSavingChange: setSaving,
    onSaved: () => showToast("Users saved"),
  });

  const applyUsers = useCallback(
    (next: ProjectUser[], immediate = false) => {
      usersRef.current = next;
      setUsers(next);
      if (immediate) {
        void flushSave(next).then(() => showToast("Users saved"));
      } else {
        scheduleSave(next);
      }
    },
    [flushSave, scheduleSave],
  );

  const selected = users.find((u) => u.id === selectedId) ?? null;

  const updateSelected = (patch: Partial<ProjectUser>) => {
    if (!selected) return;
    if (selected.stakeholderId && patch.name !== undefined) return;
    applyUsers(
      usersRef.current.map((u) => (u.id === selected.id ? { ...u, ...patch } : u)),
    );
  };

  const addTeamMember = () => {
    const member = emptyTeamMember();
    applyUsers([...usersRef.current, member], true);
    setSelectedId(member.id);
  };

  const removeSelected = async () => {
    if (!selected) return;
    if (selected.stakeholderId && selected.kind !== "team") {
      const ok = await confirm({
        title: "Remove user",
        message:
          "Remove this stakeholder from the user list? They remain on the stakeholder map.",
        confirmLabel: "Remove",
        destructive: true,
      });
      if (!ok) return;
    }
    const next = usersRef.current.filter((u) => u.id !== selected.id);
    applyUsers(next, true);
    setSelectedId(next[0]?.id ?? null);
  };

  const teamUsers = users.filter((u) => u.kind === "team" || u.kind === "both");
  const stakeholderUsers = users.filter((u) => u.kind === "stakeholder" || u.kind === "both");

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Contact2 size={20} className="text-brand-500" />
              <h3 className="text-lg font-semibold text-fg-primary">Project users</h3>
            </div>
            <p className="mt-1 text-sm text-fg-secondary">
              People working on or involved in this engagement. Used for owners, assignees, and
              blockers across the project. Stakeholders from the map sync here automatically.
            </p>
          </div>
          <PrimaryButton onClick={addTeamMember} disabled={saving}>
            <span className="inline-flex items-center gap-2">
              <Plus size={16} /> Add team member
            </span>
          </PrimaryButton>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <UserSection
              title="Team"
              subtitle="FDE and delivery team"
              users={teamUsers}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <UserSection
              title="Stakeholders"
              subtitle="Synced from stakeholder map"
              users={stakeholderUsers}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>

          <div className="lg:col-span-3">
            {selected ? (
              <div className="card-kit p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                      {kindLabel(selected.kind)}
                    </p>
                    <h4 className="text-lg font-semibold text-fg-primary">
                      {selected.name || "Unnamed"}
                    </h4>
                  </div>
                  {selected.kind === "team" || selected.kind === "both" ? (
                    <button
                      type="button"
                      onClick={removeSelected}
                      className="inline-flex items-center gap-1 text-sm text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  ) : null}
                </div>

                <Field label="Name">
                {selected.stakeholderId && selected.kind === "stakeholder" ? (
                  <p className="rounded-lg border border-surface-border bg-surface-base/50 px-3 py-2 text-sm text-fg-body">
                    {selected.name}
                  </p>
                ) : (
                  <TextInput
                    value={selected.name}
                    onChange={(v) => updateSelected({ name: v })}
                    placeholder="Full name"
                  />
                )}
                </Field>
                {selected.stakeholderId && selected.kind === "stakeholder" && (
                  <p className="text-xs text-fg-muted">
                    Edit name and role on the Stakeholders tab — changes sync here.
                  </p>
                )}
                <Field label="Role">
                  {selected.kind === "stakeholder" ? (
                    <p className="rounded-lg border border-surface-border bg-surface-base/50 px-3 py-2 text-sm text-fg-body">
                      {selected.role || "—"}
                    </p>
                  ) : (
                    <RoleSelect
                      value={selected.role}
                      onChange={(v) => updateSelected({ role: v })}
                    />
                  )}
                </Field>
                <Field label="Email">
                  <TextInput
                    value={selected.email || ""}
                    onChange={(v) => updateSelected({ email: v })}
                    placeholder="name@company.com"
                  />
                </Field>
                <Field label="Organization">
                  <OrganizationSelect
                    value={selected.organization || "Internal"}
                    onChange={(v) => updateSelected({ organization: v })}
                  />
                </Field>
              </div>
            ) : (
              <div className="card-kit border-dashed p-10 text-center text-sm text-fg-muted">
                Add a team member or select someone from the list.
              </div>
            )}
          </div>
        </div>

        {saving && <p className="mt-2 text-sm text-fg-muted">Saving…</p>}
      </div>
    </div>
  );
}

function UserSection({
  title,
  subtitle,
  users,
  selectedId,
  onSelect,
}: {
  title: string;
  subtitle: string;
  users: ProjectUser[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="card-kit p-4">
      <p className="text-sm font-medium text-fg-primary">{title}</p>
      <p className="text-xs text-fg-muted">{subtitle}</p>
      {users.length === 0 ? (
        <p className="mt-3 text-sm text-fg-muted">None yet.</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {users.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => onSelect(u.id)}
                className={`w-full rounded-lg px-2 py-2 text-left text-sm transition ${
                  selectedId === u.id
                    ? "bg-brand-600/20 text-brand-300"
                    : "text-fg-body hover:bg-surface-elevated"
                }`}
              >
                <span className="font-medium">{u.name}</span>
                {u.role ? <span className="text-fg-muted"> · {u.role}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
