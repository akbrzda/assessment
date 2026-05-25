/**
 * Проверяет отсутствие временных и debug-файлов в репозитории.
 * Запускать из корня монорепозитория: node scripts/check-no-temp-files.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const forbiddenPatterns = [
  /^tmp[.\-_]/i,
  /^temp[.\-_]/i,
  /^debug[.\-_]/i,
  /^scratch[.\-_]/i,
  /\.tmp$/i,
  /\.bak$/i,
  /\.orig$/i,
  /\.rej$/i,
];

const ignoredDirs = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  "coverage",
  "logs",
]);

const violations = [];

function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(root, fullPath);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (forbiddenPatterns.some((pattern) => pattern.test(entry.name))) {
      violations.push(relativePath);
    }
  }
}

walk(root);

if (violations.length > 0) {
  console.error("Найдены временные или debug-файлы:");
  for (const file of violations) {
    console.error(`  - ${file}`);
  }
  console.error("\nУдали эти файлы перед коммитом.");
  process.exit(1);
}

console.log("Временные и debug-файлы не найдены. OK");
