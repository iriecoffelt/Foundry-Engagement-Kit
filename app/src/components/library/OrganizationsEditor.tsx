import {
  loadOrganizations,
  ORGANIZATIONS_PATH,
  saveOrganizations,
} from "../../lib/organizations";
import { ReferenceListEditor } from "./ReferenceListEditor";

interface OrganizationsEditorProps {
  onStatus?: (message: string) => void;
}

export function OrganizationsEditor({ onStatus }: OrganizationsEditorProps) {
  return (
    <ReferenceListEditor
      title="Organizations"
      description="Organization labels for users on an engagement."
      pathLabel={ORGANIZATIONS_PATH}
      itemPlaceholder="New organization label"
      load={loadOrganizations}
      save={saveOrganizations}
      onStatus={onStatus}
    />
  );
}
