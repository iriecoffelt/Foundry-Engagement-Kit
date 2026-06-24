import { loadRoles, ROLES_PATH, saveRoles } from "../../lib/roles";
import { ReferenceListEditor } from "./ReferenceListEditor";

interface RolesEditorProps {
  onStatus?: (message: string) => void;
}

export function RolesEditor({ onStatus }: RolesEditorProps) {
  return (
    <ReferenceListEditor
      title="Engagement roles"
      description="Shared role labels for project users, stakeholders, and owners."
      pathLabel={ROLES_PATH}
      itemPlaceholder="New role label"
      load={loadRoles}
      save={saveRoles}
      onStatus={onStatus}
    />
  );
}
