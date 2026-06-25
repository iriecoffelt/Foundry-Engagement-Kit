import type { CacheKey, ProjectCacheKey } from "./types";
import { projectCacheKey } from "./types";

const store = new Map<string, unknown>();

export function cacheGet<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function cacheSet<T>(key: string, value: T): void {
  store.set(key, value);
}

export function cacheDelete(key: string): void {
  store.delete(key);
}

export async function cachedRead<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const value = await loader();
  cacheSet(key, value);
  return value;
}

export function invalidateProject(projectPath: string, ...keys: ProjectCacheKey[]): void {
  if (keys.length === 0) {
    for (const key of store.keys()) {
      if (key.startsWith(`${projectPath}::`)) store.delete(key);
    }
    return;
  }
  for (const key of keys) {
    cacheDelete(projectCacheKey(projectPath, key));
  }
}

export function invalidateDashboard(): void {
  for (const key of store.keys()) {
    if (key.startsWith("dashboard::")) {
      store.delete(key);
    }
  }
}

export function invalidatePortfolio(): void {
  for (const key of store.keys()) {
    if (key.startsWith("portfolio::")) {
      store.delete(key);
    }
  }
}

export function invalidateAll(): void {
  store.clear();
}

export function invalidateKey(key: CacheKey | string): void {
  if (key === "dashboard") {
    invalidateDashboard();
    return;
  }
  if (key === "portfolio") {
    invalidatePortfolio();
    return;
  }
  cacheDelete(key);
}
