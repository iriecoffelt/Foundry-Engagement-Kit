import { loadOrganizations } from "../lib/organizations";
import { ReferenceListSelect } from "./ReferenceListSelect";

interface OrganizationSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function OrganizationSelect({
  value,
  onChange,
  placeholder = "Select organization",
}: OrganizationSelectProps) {
  return (
    <ReferenceListSelect
      load={loadOrganizations}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
}
