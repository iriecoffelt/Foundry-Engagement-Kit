import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  THEME_PRESETS,
  applyThemeSettings,
  loadThemeSettings,
  normalizeHex,
  presetForHex,
  saveThemeSettings,
  type ColorMode,
  type ThemeSettings,
} from "../lib/theme";

interface ThemeContextValue {
  settings: ThemeSettings;
  setPreset: (presetId: string) => void;
  setAccentHex: (hex: string) => void;
  setColorMode: (mode: ColorMode) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DEFAULT_SETTINGS: ThemeSettings = {
  presetId: "foundry",
  accentHex: "#1a82f5",
  colorMode: "dark",
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(() => loadThemeSettings());

  useEffect(() => {
    applyThemeSettings(settings);
    saveThemeSettings(settings);
  }, [settings]);

  const setPreset = useCallback((presetId: string) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSettings((s) => ({ ...s, presetId, accentHex: preset.hex }));
  }, []);

  const setAccentHex = useCallback((hex: string) => {
    const accentHex = normalizeHex(hex);
    setSettings((s) => ({ ...s, presetId: presetForHex(accentHex), accentHex }));
  }, []);

  const setColorMode = useCallback((colorMode: ColorMode) => {
    setSettings((s) => ({ ...s, colorMode }));
  }, []);

  const resetTheme = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  const value = useMemo(
    () => ({ settings, setPreset, setAccentHex, setColorMode, resetTheme }),
    [settings, setPreset, setAccentHex, setColorMode, resetTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
