/**
 * Устанавливает git hooks из scripts/ в .git/hooks/.
 * Запускать один раз после клонирования: node scripts/install-hooks.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const hooksDir = path.join(root, ".git", "hooks");

if (!fs.existsSync(hooksDir)) {
  console.error(
    ".git/hooks не найден. Убедись, что находишься в корне репозитория.",
  );
  process.exit(1);
}

// Содержимое commit-msg hook
const commitMsgHook = `#!/bin/sh
node "$(git rev-parse --show-toplevel)/scripts/check-commit-msg.mjs" "$1"
`;

const hookPath = path.join(hooksDir, "commit-msg");
fs.writeFileSync(hookPath, commitMsgHook, { mode: 0o755 });
console.log(`Установлен hook: ${hookPath}`);
console.log("Git hooks успешно установлены.");
