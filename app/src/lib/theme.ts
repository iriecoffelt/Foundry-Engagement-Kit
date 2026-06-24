const STORAGE_KEY = "fek-theme";

export type ColorMode = "dark" | "light";

export interface ThemePreset {
  id: string;
  name: string;
  hex: string;
}

export interface ThemeSettings {
  presetId: string;
  accentHex: string;
  colorMode: ColorMode;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: "foundry", name: "Foundry Blue", hex: "#1a82f5" },
  { id: "emerald", name: "Emerald", hex: "#10b981" },
  { id: "violet", name: "Violet", hex: "#8b5cf6" },
  { id: "amber", name: "Amber", hex: "#f59e0b" },
  { id: "rose", name: "Rose", hex: "#f43f5e" },
  { id: "teal", name: "Teal", hex: "#14b8a6" },
  { id: "indigo", name: "Indigo", hex: "#6366f1" },
  { id: "orange", name: "Orange", hex: "#f97316" },
];

const DEFAULT_SETTINGS: ThemeSettings = {
  presetId: "foundry",
  accentHex: "#1a82f5",
  colorMode: "dark",
};

const BRAND_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

const SHADE_STOPS: Record<number, { l: number; sMul: number } | "exact"> = {
  50: { l: 97, sMul: 0.22 },
  100: { l: 93, sMul: 0.35 },
  200: { l: 86, sMul: 0.5 },
  300: { l: 76, sMul: 0.68 },
  400: { l: 66, sMul: 0.82 },
  500: { l: 56, sMul: 0.92 },
  600: "exact",
  700: { l: 42, sMul: 1 },
  800: { l: 34, sMul: 0.96 },
  900: { l: 28, sMul: 0.9 },
  950: { l: 17, sMul: 0.85 },
};

export function normalizeHex(hex: string): string {
  let h = hex.trim().toLowerCase();
  if (!h.startsWith("#")) h = `#${h}`;
  if (h.length === 4) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  if (!/^#[0-9a-f]{6}$/.test(h)) return DEFAULT_SETTINGS.accentHex;
  return h;
}

function parseHex(hex: string): [number, number, number] {
  const h = normalizeHex(hex).slice(1);
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }

  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (h < 60) {
    rp = c;
    gp = x;
  } else if (h < 120) {
    rp = x;
    gp = c;
  } else if (h < 180) {
    gp = c;
    bp = x;
  } else if (h < 240) {
    gp = x;
    bp = c;
  } else if (h < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }

  return [Math.round((rp + m) * 255), Math.round((gp + m) * 255), Math.round((bp + m) * 255)];
}

function rgbTriplet(r: number, g: number, b: number): string {
  return `${r} ${g} ${b}`;
}

export function generatePalette(accentHex: string): Record<number, string> {
  const hex = normalizeHex(accentHex);
  const [r, g, b] = parseHex(hex);
  const [h, s] = rgbToHsl(r, g, b);
  const palette: Record<number, string> = {};

  for (const shade of BRAND_SHADES) {
    const stop = SHADE_STOPS[shade];
    if (stop === "exact") {
      palette[shade] = rgbTriplet(r, g, b);
    } else {
      const [rr, gg, bb] = hslToRgb(h, s * stop.sMul, stop.l);
      palette[shade] = rgbTriplet(rr, gg, bb);
    }
  }

  return palette;
}

export function applyAccentTheme(accentHex: string): void {
  const hex = normalizeHex(accentHex);
  const palette = generatePalette(hex);
  const root = document.documentElement;

  for (const shade of BRAND_SHADES) {
    root.style.setProperty(`--brand-${shade}`, palette[shade]);
  }
  root.style.setProperty("--theme-accent-hex", hex);
  root.dataset.accent = hex;
}

export function applyColorMode(mode: ColorMode): void {
  const root = document.documentElement;
  root.dataset.colorMode = mode;
  root.style.colorScheme = mode;
}

export function applyThemeSettings(settings: ThemeSettings): void {
  applyAccentTheme(settings.accentHex);
  applyColorMode(settings.colorMode);
}

export function loadThemeSettings(): ThemeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<ThemeSettings>;
    const accentHex = normalizeHex(parsed.accentHex || DEFAULT_SETTINGS.accentHex);
    const colorMode = parsed.colorMode === "light" ? "light" : "dark";
    const preset = THEME_PRESETS.find((p) => p.id === parsed.presetId);
    return {
      presetId: preset ? parsed.presetId! : "custom",
      accentHex,
      colorMode,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveThemeSettings(settings: ThemeSettings): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      presetId: settings.presetId,
      accentHex: normalizeHex(settings.accentHex),
      colorMode: settings.colorMode,
    }),
  );
}

export function initTheme(): ThemeSettings {
  const settings = loadThemeSettings();
  applyThemeSettings(settings);
  return settings;
}

export function presetForHex(hex: string): string {
  const normalized = normalizeHex(hex);
  const match = THEME_PRESETS.find((p) => p.hex.toLowerCase() === normalized);
  return match?.id ?? "custom";
}
