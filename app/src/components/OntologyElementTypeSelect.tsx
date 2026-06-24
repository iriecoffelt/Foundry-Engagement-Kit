import { useEffect, useState } from "react";
import { loadOntologyElementTypes, ontologyElementTypeSelectOptions } from "../lib/ontologyTypes";
import { SelectInput } from "./forms/FormField";

interface OntologyElementTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function OntologyElementTypeSelect({ value, onChange }: OntologyElementTypeSelectProps) {
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadOntologyElementTypes().then((types) => {
      setOptions(ontologyElementTypeSelectOptions(types, value));
      setLoaded(true);
    });
  }, [value]);

  if (!loaded) {
    return (
      <SelectInput
        value={value}
        onChange={onChange}
        options={[{ value: value || "objectType", label: value || "Object type" }]}
      />
    );
  }

  return <SelectInput value={value} onChange={onChange} options={options} />;
}
