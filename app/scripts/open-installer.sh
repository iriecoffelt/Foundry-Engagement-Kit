#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DMG="$ROOT/src-tauri/target/release/bundle/dmg/Foundry Engagement Kit_0.1.0_aarch64.dmg"
VOL="/Volumes/Foundry Engagement Kit"

if [[ ! -f "$DMG" ]]; then
  echo "DMG not found. Run: npm run tauri build"
  echo "Expected: $DMG"
  exit 1
fi

# Stale mounts (from a prior open or interrupted bundle_dmg.sh) make Finder flash and close.
hdiutil detach "$VOL" -quiet 2>/dev/null || true
while read -r mount; do
  [[ -n "$mount" ]] && hdiutil detach "$mount" -quiet 2>/dev/null || true
done < <(hdiutil info 2>/dev/null | awk '/Foundry Engagement Kit/ && /\/Volumes\// {print $NF}')

sleep 0.5
open "$DMG"
echo "Opened installer: $DMG"
echo "If the window closes, run: open \"$DMG\""
