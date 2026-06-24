import { loadStringListFile, listSelectOptions, saveStringListFile } from "./referenceList";

export const FOUNDRY_AREAS_PATH = "reference/foundry-areas.json";

export const DEFAULT_FOUNDRY_AREAS: string[] = [
  "Ontology",
  "Pipeline",
  "Workshop",
  "Customer sync",
  "Other",
];

export async function loadFoundryAreas(): Promise<string[]> {
  return loadStringListFile(FOUNDRY_AREAS_PATH, "areas", DEFAULT_FOUNDRY_AREAS);
}

export async function saveFoundryAreas(areas: string[]): Promise<void> {
  return saveStringListFile(FOUNDRY_AREAS_PATH, "areas", areas);
}

export function foundryAreaSelectOptions(
  areas: string[],
  currentValue?: string,
  emptyLabel = "Select area",
) {
  return listSelectOptions(areas, currentValue, emptyLabel);
}
