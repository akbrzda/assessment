/**
 * Проверяет синхронизацию ENV-переменных между config/env.js и .env.example.
 * Запускать из корня монорепозитория: node scripts/check-env-sync.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Пакеты монорепозитория с их .env.example
const packages = [
  {
    name: "backend",
    envExample: path.join(root, "backend", ".env.example"),
  },
  {
    name: "admin-frontend",
    envExample: path.join(root, "admin-frontend", ".env.example"),
  },
  {
    name: "bot",
    envExample: path.join(root, "bot", ".env.example"),
  },
];

let hasErrors = false;

function parseEnvExample(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, "utf8");
  return new Set(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split("=")[0].trim())
      .filter(Boolean),
  );
}

// Проверяем каждый пакет
for (const pkg of packages) {
  const vars = parseEnvExample(pkg.envExample);

  if (vars === null) {
    console.error(`[${pkg.name}] .env.example не найден: ${pkg.envExample}`);
    hasErrors = true;
    continue;
  }

  if (vars.size === 0) {
    console.warn(`[${pkg.name}] .env.example пуст — нет ни одной переменной.`);
    continue;
  }

  console.log(`[${pkg.name}] .env.example: ${vars.size} переменных. OK`);
}

// Дополнительно: проверяем, что backend env.js не читает process.env напрямую вне config
const backendSrc = path.join(root, "backend", "src");
if (fs.existsSync(backendSrc)) {
  const violations = [];

  function walkDir(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Пропускаем config — там разрешено
        if (entry.name === "config" && path.dirname(fullPath) === backendSrc) {
          continue;
        }
        walkDir(fullPath);
        continue;
      }
      if (!entry.name.endsWith(".js") && !entry.name.endsWith(".mjs")) {
        continue;
      }
      const content = fs.readFileSync(fullPath, "utf8");
      // Ищем прямое обращение к process.env.KEY (не через env.)
      const matches = content.match(/process\.env\.[A-Z_][A-Z0-9_]*/g);
      if (matches) {
        const relative = path.relative(root, fullPath);
        violations.push({ file: relative, vars: matches });
      }
    }
  }

  walkDir(backendSrc);

  if (violations.length > 0) {
    console.warn(
      "\n[backend] Найдены прямые обращения к process.env вне config/env.js:",
    );
    for (const v of violations) {
      console.warn(`  ${v.file}: ${v.vars.join(", ")}`);
    }
    console.warn("  -> Рекомендуется использовать backend/src/config/env.js");
  }
}

if (hasErrors) {
  console.error("\nПроверка env-синхронизации завершена с ошибками.");
  process.exit(1);
}

console.log("\nПроверка env-синхронизации завершена успешно.");
