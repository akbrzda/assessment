const logger = require("../utils/logger");
const config = require("../config/env");

const RESULT_EMOJI = {
  success: "✅",
  warning: "⚠️",
  error: "❌",
};

function formatValue(value) {
  if (value === null || value === undefined) {
    return "—";
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item)).join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, val]) => `<b>${key}</b>: ${formatValue(val)}`)
      .join("\n");
  }
  if (value === true) {
    return "Да";
  }
  if (value === false) {
    return "Нет";
  }
  return String(value);
}

function formatAuditEntry(entry) {
  const emoji = RESULT_EMOJI[entry.result] || "ℹ️";
  const title = `${emoji} <b>${entry.action}</b>`;

  const lines = [title];

  lines.push(
    `<b>Источник:</b> ${entry.scope || "—"}`,
    `<b>Инициатор:</b> ${
      entry.actor?.name
        ? `${entry.actor.name}${entry.actor.role ? ` (${entry.actor.role})` : ""}${
            entry.actor.id ? ` [ID: ${entry.actor.id}]` : ""
          }`
        : "Система"
    }`
  );

  if (entry.entity) {
    lines.push(`<b>Объект:</b> ${entry.entity}${entry.entityId ? ` (#${entry.entityId})` : ""}`);
  }

  const metadataEntries = Object.entries(entry.metadata || {});
  if (metadataEntries.length > 0) {
    const metadataLines = metadataEntries
      .map(([key, value]) => `• <b>${key}</b>: ${formatValue(value)}`)
      .join("\n");
    lines.push(`<b>Детали:</b>\n${metadataLines}`);
  }

  lines.push(`<b>Результат:</b> ${entry.result || "success"}`);
  lines.push(`<b>Время:</b> ${entry.timestamp}`);

  if (entry.initiatorIp) {
    lines.push(`<b>IP:</b> ${entry.initiatorIp}`);
  }

  return lines.join("\n");
}

async function sendTelegramLog(payload) {
  const logChatId = config.logChatId;

  if (!config.logBotToken || !logChatId) {
    logger.warn("Telegram log skipped: missing LOG_BOT_TOKEN or LOG_CHAT_ID");
    return;
  }

  const url = `https://api.telegram.org/bot${config.logBotToken}/sendMessage`;
  const isAuditEntry = payload && typeof payload === "object" && "action" in payload;
  const text = isAuditEntry ? formatAuditEntry(payload) : String(payload || "");
  const body = {
    chat_id: logChatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  if (config.logThreadId) {
    body.message_thread_id = config.logThreadId;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const responseBody = await response.text();
      logger.error("Telegram log failed: %s", responseBody);
    }
  } catch (error) {
    logger.error("Telegram log error: %s", error.message);
  }
}

module.exports = {
  sendTelegramLog,
  formatAuditEntry,
};
