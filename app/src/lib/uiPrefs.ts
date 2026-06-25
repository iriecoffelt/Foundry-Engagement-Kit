const REGISTER_SHOW_RESOLVED_KEY = "fek-register-show-resolved";

function readBoolMap(key: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeBoolMap(key: string, map: Record<string, boolean>): void {
  localStorage.setItem(key, JSON.stringify(map));
}

export function getRegisterShowResolved(projectPath: string): boolean {
  return readBoolMap(REGISTER_SHOW_RESOLVED_KEY)[projectPath] ?? false;
}

export function setRegisterShowResolved(projectPath: string, value: boolean): void {
  const map = readBoolMap(REGISTER_SHOW_RESOLVED_KEY);
  if (value) {
    map[projectPath] = true;
  } else {
    delete map[projectPath];
  }
  writeBoolMap(REGISTER_SHOW_RESOLVED_KEY, map);
}
