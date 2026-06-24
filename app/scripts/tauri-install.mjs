#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { platform } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

if (platform() === "darwin") {
  const result = spawnSync("npm", ["run", "tauri:install:mac"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  process.exit(result.status ?? 1);
}

console.log("\ntauri:install opens the DMG on macOS only.\n");
console.log("Build an installer for your platform, then run it from bundle/:");
console.log("  npm run tauri:build\n");
process.exit(1);
