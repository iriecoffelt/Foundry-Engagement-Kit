import { loadFoundryAreas, FOUNDRY_AREAS_PATH, saveFoundryAreas } from "../../lib/foundryAreas";
import { ReferenceListEditor } from "./ReferenceListEditor";

interface FoundryAreasEditorProps {
  onStatus?: (message: string) => void;
}

export function FoundryAreasEditor({ onStatus }: FoundryAreasEditorProps) {
  return (
    <ReferenceListEditor
      title="Foundry areas"
      description="Work surfaces for standups and daily focus tracking."
      pathLabel={FOUNDRY_AREAS_PATH}
      itemPlaceholder="New area label"
      load={loadFoundryAreas}
      save={saveFoundryAreas}
      onStatus={onStatus}
    />
  );
}
