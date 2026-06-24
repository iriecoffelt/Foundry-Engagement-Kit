import { api } from "./api";

export function listSelectOptions(
  items: string[],
  currentValue?: string,
  emptyLabel = "Select…",
): { value: string; label: string }[] {
  const merged = [...items];
  const value = currentValue?.trim();
  if (value && !merged.includes(value)) merged.unshift(value);

  return [
    { value: "", label: emptyLabel },
    ...merged.map((item) => ({ value: item, label: item })),
  ];
}

export async function loadStringListFile(
  path: string,
  key: string,
  defaults: string[],
): Promise<string[]> {
  try {
    const data = await api.readJson<Record<string, string[]>>(path);
    const items = (data[key] ?? []).map((item) => item.trim()).filter(Boolean);
    return items.length ? items : [...defaults];
  } catch {
    try {
      await api.writeJson(path, { [key]: defaults });
    } catch {
      /* workspace not ready */
    }
    return [...defaults];
  }
}

export async function saveStringListFile(
  path: string,
  key: string,
  items: string[],
): Promise<void> {
  const cleaned = [...new Set(items.map((item) => item.trim()).filter(Boolean))];
  await api.writeJson(path, { [key]: cleaned });
}
