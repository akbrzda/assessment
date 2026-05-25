const config = require("../config/env");

function normalizeBotUsername(value) {
  return String(value || "").trim().replace(/^@/, "");
}

function buildMiniAppLinks(payload) {
  const safePayload = String(payload || "").trim();
  if (!safePayload) {
    return {
      telegramUrl: "",
      maxUrl: "",
    };
  }

  const telegramBot = normalizeBotUsername(config.botUsername);
  const maxBot = normalizeBotUsername(config.maxBotName);

  return {
    telegramUrl: telegramBot ? `https://t.me/${telegramBot}/app?startapp=${safePayload}` : "",
    maxUrl: maxBot ? `https://max.ru/${maxBot}?startapp=${safePayload}` : "",
  };
}

function buildMiniAppButtons({ payload, telegramText = "Открыть в Telegram", maxText = "Открыть в MAX" }) {
  const { telegramUrl, maxUrl } = buildMiniAppLinks(payload);
  const buttons = [];

  if (telegramUrl) {
    buttons.push({ text: telegramText, url: telegramUrl });
  }

  if (maxUrl) {
    buttons.push({ text: maxText, url: maxUrl });
  }

  return buttons;
}

module.exports = {
  buildMiniAppLinks,
  buildMiniAppButtons,
};
