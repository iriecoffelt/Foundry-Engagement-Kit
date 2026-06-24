import { loadRoles } from "../lib/roles";
import { ReferenceListSelect } from "./ReferenceListSelect";

interface RoleSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RoleSelect({
  value,
  onChange,
  placeholder = "Select role",
}: RoleSelectProps) {
  return (
    <ReferenceListSelect
      load={loadRoles}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
}
