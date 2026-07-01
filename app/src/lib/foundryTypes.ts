/**
 * Foundry API Types
 * FDE-safe metadata types only - no customer business data
 */

export interface FoundryConnection {
  stackUrl: string;
  token: string;
  ontologyRid?: string;
}

export interface FoundryObjectTypeProperty {
  apiName: string;
  displayName?: string;
  description?: string;
  dataType: {
    type: string;
  };
}

export interface FoundryObjectType {
  apiName: string;
  displayName: string;
  description?: string;
  primaryKey: string | string[];
  status: "ACTIVE" | "DEPRECATED" | "EXPERIMENTAL";
  properties: Record<string, FoundryObjectTypeProperty>;
  rid: string;
}

export interface FoundryLinkType {
  apiName: string;
  displayName?: string;
  description?: string;
  cardinality: "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_MANY";
  objectTypeApiNameA: string;
  objectTypeApiNameB: string;
  rid: string;
}

export interface FoundryActionTypeParameter {
  apiName: string;
  displayName?: string;
  description?: string;
  dataType: {
    type: string;
  };
  required: boolean;
}

export interface FoundryActionType {
  apiName: string;
  displayName: string;
  description?: string;
  parameters: Record<string, FoundryActionTypeParameter>;
  status: "ACTIVE" | "DEPRECATED" | "EXPERIMENTAL";
  rid: string;
}

export interface FoundryInterfaceType {
  apiName: string;
  displayName?: string;
  description?: string;
  properties: Record<string, FoundryObjectTypeProperty>;
  rid: string;
}

export interface FoundryQueryType {
  apiName: string;
  displayName?: string;
  description?: string;
  version: string;
  rid: string;
}

export interface FoundryOntologyMetadata {
  apiName: string;
  displayName: string;
  description?: string;
  rid: string;
}

export interface FoundryFullMetadata {
  ontology: FoundryOntologyMetadata;
  objectTypes: Record<string, FoundryObjectType>;
  linkTypes: Record<string, FoundryLinkType>;
  actionTypes: Record<string, FoundryActionType>;
  interfaceTypes: Record<string, FoundryInterfaceType>;
  queryTypes: Record<string, FoundryQueryType>;
}

export interface FoundryHealthCheckReport {
  checkRid: string;
  status: "PASSING" | "FAILING" | "UNKNOWN";
  lastCheckedAt?: string;
  message?: string;
}

export interface FoundryDatasetMetadata {
  rid: string;
  name: string;
  description?: string;
  path?: string;
}

export interface FoundryResource {
  rid: string;
  name: string;
  type: string;
  path?: string;
}

export interface FoundryApiError {
  errorCode: string;
  errorName: string;
  errorInstanceId: string;
  parameters: Record<string, string>;
}
