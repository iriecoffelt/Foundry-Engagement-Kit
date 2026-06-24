/**
 * Stage workspace seed files into src-tauri/resources before every Tauri build.
 * Ensures identical bundle contents on macOS (.dmg/.app), Windows (.msi/.exe),
 * and Linux (.deb/.AppImage/.rpm).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, "..");
const repoRoot = path.join(appRoot, "..");
const destRoot = path.join(appRoot, "src-tauri", "resources", "workspace-seed");

function rmrf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function copyFile(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function copyDir(src, dst) {
  if (!fs.existsSync(src)) {
    throw new Error(`Missing seed source: ${src}`);
  }
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
  }
}

function stage() {
  const referenceSrc = path.join(repoRoot, "reference");
  const templateSrc = path.join(repoRoot, "project", "_template");
  const standupSrc = path.join(repoRoot, "daily", "standup.md");
  const weeklyReviewSrc = path.join(repoRoot, "weekly", "weekly-review.md");
  const customerSyncSrc = path.join(repoRoot, "weekly", "customer-sync.md");

  for (const required of [referenceSrc, templateSrc, standupSrc, weeklyReviewSrc, customerSyncSrc]) {
    if (!fs.existsSync(required)) {
      throw new Error(`Workspace seed source not found: ${required}`);
    }
  }

  rmrf(destRoot);
  fs.mkdirSync(destRoot, { recursive: true });

  copyDir(referenceSrc, path.join(destRoot, "reference"));
  copyDir(templateSrc, path.join(destRoot, "project", "_template"));
  copyFile(standupSrc, path.join(destRoot, "daily", "standup.md"));
  copyFile(weeklyReviewSrc, path.join(destRoot, "weekly", "weekly-review.md"));
  copyFile(customerSyncSrc, path.join(destRoot, "weekly", "customer-sync.md"));

  console.log(`Staged workspace seed → ${destRoot}`);
}

stage();
