/**
 * Foundry Connection Management
 * Stores connection settings per-project in engagement.json
 */

import { api } from "./api";
import type { FoundryConnection } from "./foundryTypes";

interface EngagementJson {
  foundry?: {
    stackUrl?: string;
    ontologyRid?: string;
    /** Ontology RID last used for a successful import (elements + graph). */
    importedOntologyRid?: string;
  };
  foundryStackUrl?: string;
  [key: string]: unknown;
}

const TOKEN_STORAGE_KEY = "foundry-tokens";

/**
 * Get stored tokens from localStorage (never stored in engagement.json for security)
 */
function getStoredTokens(): Record<string, string> {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setStoredToken(stackUrl: string, token: string): void {
  const tokens = getStoredTokens();
  tokens[stackUrl] = token;
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

function getStoredToken(stackUrl: string): string | undefined {
  return getStoredTokens()[stackUrl];
}

function removeStoredToken(stackUrl: string): void {
  const tokens = getStoredTokens();
  delete tokens[stackUrl];
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

/**
 * Load Foundry connection for a project
 */
export async function loadFoundryConnection(
  projectPath: string,
): Promise<FoundryConnection | null> {
  try {
    const eng = await api.readJson<EngagementJson>(`${projectPath}/engagement.json`);
    const stackUrl =
      eng.foundry?.stackUrl || eng.foundryStackUrl || "";

    if (!stackUrl) return null;

    const token = getStoredToken(stackUrl) || "";
    const ontologyRid = eng.foundry?.ontologyRid || "";

    return { stackUrl, token, ontologyRid };
  } catch {
    return null;
  }
}

/**
 * Save Foundry connection for a project
 * Note: Token is stored in localStorage, not in engagement.json
 */
export async function saveFoundryConnection(
  projectPath: string,
  connection: FoundryConnection,
): Promise<void> {
  const stackUrl = connection.stackUrl.replace(/\/$/, "");

  // Store token securely in localStorage (not in git-tracked files)
  if (connection.token) {
    setStoredToken(stackUrl, connection.token);
  }

  // Update engagement.json with non-sensitive data only
  try {
    const eng = await api.readJson<EngagementJson>(`${projectPath}/engagement.json`);
    await api.writeJson(`${projectPath}/engagement.json`, {
      ...eng,
      foundryStackUrl: stackUrl,
      foundry: {
        ...(eng.foundry || {}),
        stackUrl,
        ontologyRid: connection.ontologyRid || undefined,
      },
    });
  } catch {
    await api.writeJson(`${projectPath}/engagement.json`, {
      foundryStackUrl: stackUrl,
      foundry: {
        stackUrl,
        ontologyRid: connection.ontologyRid || undefined,
      },
    });
  }
}

/**
 * Clear Foundry connection for a project
 */
export async function clearFoundryConnection(
  projectPath: string,
): Promise<void> {
  try {
    const conn = await loadFoundryConnection(projectPath);
    if (conn?.stackUrl) {
      removeStoredToken(conn.stackUrl);
    }

    const eng = await api.readJson<EngagementJson>(`${projectPath}/engagement.json`);
    const { foundry, foundryStackUrl, ...rest } = eng;
    await api.writeJson(`${projectPath}/engagement.json`, rest);
  } catch {
    // Ignore if engagement.json doesn't exist
  }
}

/**
 * Check if a project has a valid Foundry connection configured
 */
export async function hasFoundryConnection(
  projectPath: string,
): Promise<boolean> {
  const conn = await loadFoundryConnection(projectPath);
  return Boolean(conn?.stackUrl && conn?.token);
}

/** RID of the ontology whose elements/graph were last imported. */
export async function loadImportedOntologyRid(
  projectPath: string,
): Promise<string | undefined> {
  try {
    const eng = await api.readJson<EngagementJson>(`${projectPath}/engagement.json`);
    return eng.foundry?.importedOntologyRid || undefined;
  } catch {
    return undefined;
  }
}

export async function saveImportedOntologyRid(
  projectPath: string,
  ontologyRid: string,
): Promise<void> {
  try {
    const eng = await api.readJson<EngagementJson>(`${projectPath}/engagement.json`);
    await api.writeJson(`${projectPath}/engagement.json`, {
      ...eng,
      foundry: {
        ...(eng.foundry || {}),
        importedOntologyRid: ontologyRid,
      },
    });
  } catch {
    await api.writeJson(`${projectPath}/engagement.json`, {
      foundry: { importedOntologyRid: ontologyRid },
    });
  }
}

/** True when the selected ontology differs from the last imported one. */
export async function isOntologyImportStale(projectPath: string): Promise<boolean> {
  const conn = await loadFoundryConnection(projectPath);
  if (!conn?.ontologyRid) return false;
  const imported = await loadImportedOntologyRid(projectPath);
  if (!imported) return true;
  return conn.ontologyRid !== imported;
}
