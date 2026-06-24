#!/usr/bin/env node
import { platform } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const bundle = join(root, "src-tauri/target/release/bundle");

console.log("\nBuild complete. Installers are under:\n  " + bundle + "\n");

if (platform() === "darwin") {
  console.log("macOS: open the .dmg in bundle/dmg/ or run npm run tauri:install\n");
} else if (platform() === "win32") {
  console.log("Windows: run the .msi or -setup.exe in bundle/msi/ or bundle/nsis/\n");
} else {
  console.log("Linux: use the .deb, .AppImage, or .rpm in bundle/\n");
}
