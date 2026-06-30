import { createContext, useContext } from "react";
import type { ResolvedArchNodeType } from "../../lib/architectureNodeTypes";
import type { DeliveryCard } from "../../types";

export interface ArchEditorContextValue {
  stackUrl: string;
  typeById: Map<string, ResolvedArchNodeType>;
  deliveryByNodeId: Map<string, DeliveryCard>;
  onOpenDelivery?: (cardId: string) => void;
}

export const ArchEditorContext = createContext<ArchEditorContextValue>({
  stackUrl: "",
  typeById: new Map(),
  deliveryByNodeId: new Map(),
});

export function useArchEditorContext(): ArchEditorContextValue {
  return useContext(ArchEditorContext);
}
