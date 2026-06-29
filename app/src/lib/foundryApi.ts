/**
 * Foundry API Client
 * FDE-safe APIs only - metadata, health status, project structure
 * No customer business data is exposed through these endpoints
 */

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
  FoundryApiError,
} from "./foundryTypes";

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
    const url = `${this.stackUrl}/api${path}`;
    const headers: HeadersInit = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

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
      `/v2/ontologies/${encodeURIComponent(ontologyRid)}/fullMetadata`,
    );
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

  async listActionTypes(
    ontologyRid: string,
  ): Promise<{ data: FoundryActionType[] }> {
    return this.request(
      "GET",
      `/v2/ontologies/${encodeURIComponent(ontologyRid)}/actionTypes`,
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
