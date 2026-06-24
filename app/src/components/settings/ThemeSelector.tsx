import { Check, Moon, Palette, RotateCcw, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "../../context/ThemeProvider";
import { THEME_PRESETS, normalizeHex, type ColorMode } from "../../lib/theme";
import { SecondaryButton } from "../forms/FormField";

function ColorModeOption({
  mode,
  label,
  icon: Icon,
  active,
  onSelect,
}: {
  mode: ColorMode;
  label: string;
  icon: typeof Sun;
  active: boolean;
  onSelect: (mode: ColorMode) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
        active ? "theme-preset-active" : "theme-preset-inactive"
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

export function ThemeSelector() {
  const { settings, setPreset, setAccentHex, setColorMode, resetTheme } = useTheme();
  const [hexInput, setHexInput] = useState(settings.accentHex);

  useEffect(() => {
    setHexInput(settings.accentHex);
  }, [settings.accentHex]);

  const applyHexInput = () => {
    const normalized = normalizeHex(hexInput);
    setHexInput(normalized);
    setAccentHex(normalized);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-fg-body">Color mode</p>
        <p className="mt-0.5 text-xs text-fg-muted">
          Switch between dark and light surfaces across the entire app.
        </p>
        <div className="mt-3 flex gap-2">
          <ColorModeOption
            mode="dark"
            label="Dark"
            icon={Moon}
            active={settings.colorMode === "dark"}
            onSelect={setColorMode}
          />
          <ColorModeOption
            mode="light"
            label="Light"
            icon={Sun}
            active={settings.colorMode === "light"}
            onSelect={setColorMode}
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-fg-body">Accent color</p>
        <p className="mt-0.5 text-xs text-fg-muted">
          Presets or pick a custom color with the system color wheel.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {THEME_PRESETS.map((preset) => {
            const active = settings.presetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setPreset(preset.id);
                  setHexInput(preset.hex);
                }}
                className={`group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                  active ? "theme-preset-active" : "theme-preset-inactive"
                }`}
              >
                <span
                  className="h-8 w-8 shrink-0 rounded-lg shadow-inner ring-1 ring-[rgb(var(--ring-subtle)/0.1)]"
                  style={{ backgroundColor: preset.hex }}
                />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-fg-body">
                    {preset.name}
                  </span>
                  <span className="block font-mono text-[10px] text-fg-faint">{preset.hex}</span>
                </span>
                {active && (
                  <Check size={14} className="absolute right-2 top-2 text-brand-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="theme-surface-panel">
        <div className="flex items-center gap-2 text-sm font-medium text-fg-body">
          <Palette size={16} className="text-brand-500" />
          Custom accent
        </div>
        <p className="mt-1 text-xs text-fg-muted">
          Click the swatch to open the color picker, or enter a hex value.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="relative cursor-pointer">
            <span
              className="block h-14 w-14 overflow-hidden rounded-xl ring-2 ring-[rgb(var(--ring-subtle)/0.12)] transition hover:ring-brand-500/40"
              style={{ backgroundColor: settings.accentHex }}
              title="Open color picker"
            />
            <input
              type="color"
              value={settings.accentHex}
              onChange={(e) => {
                setHexInput(e.target.value);
                setAccentHex(e.target.value);
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Accent color picker"
            />
          </label>

          <div className="min-w-[10rem] flex-1">
            <label className="text-xs text-fg-muted">Hex value</label>
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onBlur={applyHexInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyHexInput();
              }}
              spellCheck={false}
              className="mt-1 w-full rounded-lg border border-surface-border-strong bg-surface-input px-3 py-2 font-mono text-sm text-fg-primary outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30"
              placeholder="#1a82f5"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-fg-muted">Preview</span>
          <button
            type="button"
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-fg-on-accent"
          >
            Primary button
          </button>
          <span className="text-sm text-brand-600">Accent link</span>
          <span className="rounded-full bg-brand-600/15 px-2 py-0.5 text-xs text-brand-700 ring-1 ring-brand-500/25">
            Badge
          </span>
          <div className="ml-2 rounded-lg border border-surface-border bg-surface-raised px-2 py-1 text-xs text-fg-secondary">
            Card surface
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SecondaryButton
          onClick={() => {
            resetTheme();
            setHexInput("#1a82f5");
          }}
        >
          <span className="inline-flex items-center gap-2">
            <RotateCcw size={14} />
            Reset to default
          </span>
        </SecondaryButton>
      </div>
    </div>
  );
}
