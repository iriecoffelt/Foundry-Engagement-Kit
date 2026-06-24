import { loadFoundryAreas } from "../lib/foundryAreas";
import { ReferenceListSelect } from "./ReferenceListSelect";

interface FoundryAreaSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function FoundryAreaSelect({
  value,
  onChange,
  placeholder = "Select area",
}: FoundryAreaSelectProps) {
  return (
    <ReferenceListSelect
      load={loadFoundryAreas}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
}
