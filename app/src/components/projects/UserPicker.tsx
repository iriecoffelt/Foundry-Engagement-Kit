import { useEffect, useState } from "react";
import { loadProjectUsers, userPickerOptions } from "../../lib/projectUsers";
import { SelectInput, TextInput } from "../forms/FormField";

const CUSTOM_VALUE = "__custom__";

interface UserPickerProps {
  projectPath: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function UserPicker({
  projectPath,
  value,
  onChange,
  placeholder = "Unassigned",
}: UserPickerProps) {
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadProjectUsers(projectPath).then((users) => {
      setOptions(userPickerOptions(users));
      setLoaded(true);
    });
  }, [projectPath]);

  const inList = options.some((o) => o.value === value);
  const showCustom = Boolean(value && !inList);
  const selectValue = inList ? value : showCustom ? CUSTOM_VALUE : "";

  if (!loaded) {
    return <TextInput value={value} onChange={onChange} placeholder={placeholder} />;
  }

  return (
    <div className="space-y-2">
      <SelectInput
        value={selectValue}
        onChange={(v) => {
          if (v === CUSTOM_VALUE) {
            if (inList) onChange("");
            return;
          }
          onChange(v);
        }}
        options={[
          { value: "", label: placeholder },
          ...options,
          { value: CUSTOM_VALUE, label: "Other…" },
        ]}
      />
      {(showCustom || selectValue === CUSTOM_VALUE) && (
        <TextInput value={value} onChange={onChange} placeholder="Enter name" />
      )}
    </div>
  );
}
