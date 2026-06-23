const KEY = "fek-recent";
const MAX = 8;

export interface RecentItem {
  path: string;
  title: string;
  section: string;
  openedAt: string;
}

export function getRecent(): RecentItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as RecentItem[];
  } catch {
    return [];
  }
}

export function trackRecent(path: string, title: string, section: string) {
  const items = getRecent().filter((i) => i.path !== path);
  items.unshift({ path, title, section, openedAt: new Date().toISOString() });
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
}

export function clearRecent() {
  localStorage.removeItem(KEY);
}
