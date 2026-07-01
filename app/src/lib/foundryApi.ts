/**
 * Foundry API Client
 * FDE-safe APIs only - metadata, health status, project structure
 * No customer business data is exposed through these endpoints
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  FoundryConnection,
  FoundryFullMetadata,
  FoundryObjectType,
  FoundryLinkType,
  FoundryActionType,
  FoundryHealthCheckReport,
  FoundryDatasetMetadata,
  FoundryResource,
  FoundryOntologyMetadata,
  FoundryInterfaceType,
  FoundryQueryType,
  FoundryApiError,
} from "./foundryTypes";

function isTauriApp(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

interface FoundryProxyResponse {
  status: number;
  body: unknown;
}

function parseFoundryError(body: unknown, status: number): string {
  if (body && typeof body === "object" && "errorName" in body) {
    const errorName = (body as FoundryApiError).errorName;
    if (errorName) return errorName;
  }
  return `HTTP ${status}`;
}

function wrapNetworkError(e: unknown): Error {
  if (e instanceof TypeError && e.message === "Load failed") {
    return new Error(
      "Could not reach your Foundry stack from the browser. Restart with npm run tauri dev so requests go through the desktop app.",
    );
  }
  return e instanceof Error ? e : new Error("Connection failed");
}

export class FoundryApiClient {
  private stackUrl: string;
  private token: string;

  constructor(connection: FoundryConnection) {
    this.stackUrl = connection.stackUrl.replace(/\/$/, "");
    this.token = connection.token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (isTauriApp()) {
      const result = await invoke<FoundryProxyResponse>("foundry_api_request", {
        stackUrl: this.stackUrl,
        token: this.token,
        method,
        path,
        body: body ?? null,
      });

      if (result.status < 200 || result.status >= 300) {
        throw new Error(`Foundry API error: ${parseFoundryError(result.body, result.status)}`);
      }

      return result.body as T;
    }

    const url = `${this.stackUrl}/api${path}`;
    const headers: HeadersInit = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw wrapNetworkError(e);
    }

    if (!response.ok) {
      let errorData: FoundryApiError | undefined;
      try {
        errorData = await response.json();
      } catch {
        // ignore parse errors
      }
      const errorMsg = errorData?.errorName || `HTTP ${response.status}`;
      throw new Error(`Foundry API error: ${errorMsg}`);
    }

    return response.json();
  }

  // ============================================
  // Ontology Schema APIs (metadata only)
  // ============================================

  async listOntologies(): Promise<{ data: FoundryOntologyMetadata[] }> {
    return this.request("GET", "/v2/ontologies");
  }

  async getOntology(ontologyRid: string): Promise<FoundryOntologyMetadata> {
    return this.request("GET", `/v2/ontologies/${encodeURIComponent(ontologyRid)}`);
  }

  async getFullMetadata(ontologyRid: string): Promise<FoundryFullMetadata> {
    return this.request(
      "GET",
      `/v2/ontologies/${encodeURIComponent(ontologyRid)}/fullMetadata?preview=true`,
    );
  }

  /** Stable list endpoints — used when fullMetadata is empty or unavailable. */
  async loadOntologySchema(ontologyRid: string): Promise<FoundryFullMetadata> {
    const [objectTypes, linkTypes, actionTypes, interfaceTypes, queryTypes] =
      await Promise.all([
        this.listObjectTypes(ontologyRid),
        this.listLinkTypes(ontologyRid),
        this.listActionTypes(ontologyRid),
        this.listInterfaceTypes(ontologyRid).catch(() => ({ data: [] as FoundryInterfaceType[] })),
        this.listQueryTypes(ontologyRid).catch(() => ({ data: [] as FoundryQueryType[] })),
      ]);

    return {
      ontology: { apiName: "", displayName: "", rid: ontologyRid },
      objectTypes: Object.fromEntries(objectTypes.data.map((o) => [o.apiName, o])),
      linkTypes: Object.fromEntries(linkTypes.data.map((l) => [l.apiName, l])),
      actionTypes: Object.fromEntries(actionTypes.data.map((a) => [a.apiName, a])),
      interfaceTypes: Object.fromEntries(interfaceTypes.data.map((i) => [i.apiName, i])),
      queryTypes: Object.fromEntries(queryTypes.data.map((q) => [q.apiName, q])),
    };
  }

  async listObjectTypes(
    ontologyRid: string,
  ): Promise<{ data: FoundryObjectType[] }> {
    return this.request(
      "GET",
      `/v2/ontologies/${encodeURIComponent(ontologyRid)}/objectTypes`,
    );
  }

  async getObjectType(
    ontologyRid: string,
    objectTypeApiName: string,
  ): Promise<FoundryObjectType> {
    return this.request(
      "GET",
      `/v2/ontologies/${encodeURIComponent(ontologyRid)}/objectTypes/${encodeURIComponent(objectTypeApiName)}`,
    );
  }

  async listLinkTypes(
    ontologyRid: string,
  ): Promise<{ data: FoundryLinkType[] }> {
    return this.request(
      "GET",
      `/v2/ontologies/${encodeURIComponent(ontologyRid)}/linkTypes`,
    );
  }

  /** Batch fetch outgoing link sides for many object types (one request per chunk). */
  async getOutgoingLinkTypesByRidBatch(
    ontologyRid: string,
    objectTypeRids: string[],
  ): Promise<{ data: Record<string, unknown[]> }> {
    if (objectTypeRids.length === 0) return { data: {} };

    return this.request(
      "POST",
      `/v2/ontologies/${encodeURIComponent(ontologyRid)}/outgoingLinkTypes/getByRidBatch?preview=true`,
      {
        requests: objectTypeRids.map((objectTypeRid) => ({ objectTypeRid })),
        filterLinkTypeRids: [],
      },
    );
  }

  async listOutgoingLinkTypes(
    ontologyRid: string,
    objectTypeApiName: string,
  ): Promise<{ data: unknown[]; nextPageToken?: string }> {
    return this.request(
      "GET",
      `/v2/ontologies/${encodeURIComponent(ontologyRid)}/objectTypes/${encodeURIComponent(objectTypeApiName)}/outgoingLinkTypes`,
    );
  }

  async listAllOutgoingLinkTypes(
    ontologyRid: string,
    objectTypeApiName: string,
  ): Promise<unknown[]> {
    const all: unknown[] = [];
    let pageToken: string | undefined;

    do {
      const path = pageToken
        ? `/v2/ontologies/${encodeURIComponent(ontologyRid)}/objectTypes/${encodeURIComponent(objectTypeApiName)}/outgoingLinkTypes?pageToken=${encodeURIComponent(pageToken)}`
        : `/v2/ontologies/${encodeURIComponent(ontologyRid)}/objectTypes/${encodeURIComponent(objectTypeApiName)}/outgoingLinkTypes`;
      const page = await this.request<{ data: unknown[]; nextPageToken?: string }>(
        "GET",
        path,
      );
      all.push(...(page.data || []));
      pageToken = page.nextPageToken;
    } while (pageToken);

    return all;
  }

  async listActionTypes(
    ontologyRid: string,
  ): Promise<{ data: FoundryActionType[] }> {
    return this.request(
      "GET",
      `/v2/ontologies/${encodeURIComponent(ontologyRid)}/actionTypes`,
    );
  }

  async listInterfaceTypes(
    ontologyRid: string,
  ): Promise<{ data: FoundryInterfaceType[] }> {
    return this.request(
      "GET",
      `/v2/ontologies/${encodeURIComponent(ontologyRid)}/interfaceTypes`,
    );
  }

  async listQueryTypes(
    ontologyRid: string,
  ): Promise<{ data: FoundryQueryType[] }> {
    return this.request(
      "GET",
      `/v2/ontologies/${encodeURIComponent(ontologyRid)}/queryTypes`,
    );
  }

  // ============================================
  // Dataset Metadata APIs (schema only, no data)
  // ============================================

  async getDataset(datasetRid: string): Promise<FoundryDatasetMetadata> {
    return this.request(
      "GET",
      `/v2/datasets/${encodeURIComponent(datasetRid)}`,
    );
  }

  async getDatasetSchema(
    datasetRid: string,
  ): Promise<{ schema: { fields: Array<{ name: string; type: string }> } }> {
    return this.request(
      "GET",
      `/v2/datasets/${encodeURIComponent(datasetRid)}/schema`,
    );
  }

  // ============================================
  // Health Check APIs (pass/fail status only)
  // ============================================

  async getDatasetHealthReports(
    datasetRid: string,
  ): Promise<{ data: FoundryHealthCheckReport[] }> {
    return this.request(
      "GET",
      `/v2/datasets/${encodeURIComponent(datasetRid)}/getHealthCheckReports?preview=true`,
    );
  }

  async getHealthCheckStatus(
    checkRid: string,
  ): Promise<FoundryHealthCheckReport> {
    return this.request(
      "GET",
      `/v2/dataHealth/checks/${encodeURIComponent(checkRid)}/checkReports/getLatest?preview=true`,
    );
  }

  // ============================================
  // Filesystem APIs (project structure only)
  // ============================================

  async getResource(resourceRid: string): Promise<FoundryResource> {
    return this.request(
      "GET",
      `/v2/filesystem/resources/${encodeURIComponent(resourceRid)}`,
    );
  }

  async listFolderChildren(
    folderRid: string,
  ): Promise<{ data: FoundryResource[] }> {
    return this.request(
      "GET",
      `/v2/filesystem/folders/${encodeURIComponent(folderRid)}/children`,
    );
  }

  // ============================================
  // Connection test
  // ============================================

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.listOntologies();
      return {
        success: true,
        message: `Connected! Found ${result.data.length} ontology(ies).`,
      };
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? e.message : "Connection failed",
      };
    }
  }
}

// ============================================
// Helper functions
// ============================================

export function createFoundryClient(
  connection: FoundryConnection,
): FoundryApiClient {
  return new FoundryApiClient(connection);
}

export function isValidFoundryConnection(
  connection: Partial<FoundryConnection>,
): connection is FoundryConnection {
  return Boolean(
    connection.stackUrl?.trim() &&
      connection.token?.trim() &&
      connection.stackUrl.startsWith("http"),
  );
}
