import { useEffect, useState } from "react";
import { deliveryTypeSelectOptions, loadDeliveryTypes } from "../lib/deliveryTypes";
import { SelectInput } from "./forms/FormField";

interface DeliveryTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DeliveryTypeSelect({
  value,
  onChange,
  placeholder = "Select type",
}: DeliveryTypeSelectProps) {
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadDeliveryTypes().then((types) => {
      setOptions(deliveryTypeSelectOptions(types, value));
      setLoaded(true);
    });
  }, [value]);

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
    <SelectInput value={value} onChange={onChange} options={options} />
  );
}
