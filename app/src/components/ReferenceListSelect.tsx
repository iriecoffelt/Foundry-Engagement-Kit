import { useEffect, useState } from "react";
import { listSelectOptions } from "../lib/referenceList";
import { SelectInput } from "./forms/FormField";

interface ReferenceListSelectProps {
  load: () => Promise<string[]>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ReferenceListSelect({
  load,
  value,
  onChange,
  placeholder = "Select…",
}: ReferenceListSelectProps) {
  const [items, setItems] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    load().then((list) => {
      setItems(list);
      setLoaded(true);
    });
  }, [load]);

  if (!loaded) {
    return (
      <SelectInput
        value={value}
        onChange={onChange}
        options={[{ value: value || "", label: value || placeholder }]}
      />
    );
  }

  return (
    <SelectInput
      value={value}
      onChange={onChange}
      options={listSelectOptions(items, value, placeholder)}
    />
  );
}
