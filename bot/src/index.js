const path = require("path");
const fs = require("fs");
const { Telegraf } = require("telegraf");
const dotenv = require("dotenv");

// Загрузка корневого .env (общие переменные для всех модулей)
const rootEnvPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: rootEnvPath });

// Загрузка локального .env (специфичные переменные bot)
const localEnvPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
}

const { BOT_TOKEN, MINI_APP_URL, LOG_CHAT_ID, LOG_THREAD_ID } = process.env;

if (!BOT_TOKEN) {
  console.error("[bot] BOT_TOKEN is not set. Check the root .env file.");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

const miniAppUrl = (MINI_APP_URL || "").trim();

function buildWelcomeMessage(firstName) {
  const name = firstName ? `, ${firstName}` : "";
  return [`Привет${name}!`, "Это официальный бот системы аттестаций сотрудников.", "Чтобы продолжить, открой MiniApp по кнопке ниже."].join("\n");
}

bot.start(async (ctx) => {
  const userName = ctx.from?.first_name || "";

  // Получаем start параметр из команды (для ссылок-приглашений)
  const startPayload = ctx.startPayload; // это то, что идет после /start

  let webAppUrl = miniAppUrl;

  // Если есть параметр приглашения, добавляем его к URL
  if (startPayload && startPayload.startsWith("invite_")) {
    webAppUrl = miniAppUrl; // URL уже содержит start параметр через Telegram API
    console.log("[bot] Приглашение обнаружено:", startPayload);
  }

  const replyMarkup = webAppUrl
    ? {
        inline_keyboard: [
          [
            {
              text: "Открыть MiniApp",
              web_app: { url: webAppUrl },
            },
          ],
        ],
      }
    : undefined;

  await ctx.reply(buildWelcomeMessage(userName), {
    reply_markup: replyMarkup,
    parse_mode: "HTML",
  });
});

bot.catch((err, ctx) => {
  console.error("[bot] Error for update %j: %s", ctx.update, err);
});

async function launchBot() {
  try {
    await bot.launch();
    console.log("[bot] started");
  } catch (error) {
    console.error("[bot] Launch failed:", error.message);
    process.exit(1);
  }
}

launchBot();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
