/**
 * Проверяет формат и язык commit message.
 * Используется как git hook: .git/hooks/commit-msg
 *
 * Установка: node scripts/install-hooks.mjs
 * Ручная проверка: node scripts/check-commit-msg.mjs <путь_к_файлу_сообщения>
 */

import fs from "node:fs";

const commitMsgFile = process.argv[2];

if (!commitMsgFile) {
  console.error(
    "Использование: node scripts/check-commit-msg.mjs <путь_к_файлу>",
  );
  process.exit(1);
}

if (!fs.existsSync(commitMsgFile)) {
  console.error(`Файл не найден: ${commitMsgFile}`);
  process.exit(1);
}

const message = fs.readFileSync(commitMsgFile, "utf8").trim();

// Пропускаем merge-коммиты и автоматические коммиты
if (message.startsWith("Merge ") || message.startsWith("Revert ")) {
  process.exit(0);
}

// Ожидаемый формат: type(scope): описание на русском
const formatPattern = /^[a-z]+(\([a-z0-9А-Яа-я\-_]+\))?!?: .+/;

if (!formatPattern.test(message)) {
  console.error(
    "Некорректный формат commit message.\n" +
      "Ожидается: type(scope): описание на русском\n" +
      "Примеры:\n" +
      "  fix(auth): исправлена проверка refresh-токена\n" +
      "  feat(ui): добавлен компонент пустого состояния\n" +
      `Получено: ${message}`,
  );
  process.exit(1);
}

// Проверяем, что описание содержит русские символы
const subject = message.replace(/^[^:]+:\s*/, "").trim();

if (subject.length === 0) {
  console.error("Описание commit message не может быть пустым.");
  process.exit(1);
}

if (!/[А-Яа-яЁё]/.test(subject)) {
  console.error(
    "Описание коммита должно быть на русском языке.\n" + `Получено: ${subject}`,
  );
  process.exit(1);
}

console.log("Commit message корректный.");
