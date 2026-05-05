const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
const { Telegraf } = require("telegraf");
const dotenv = require("dotenv");

const envDir = path.resolve(__dirname, "..");
const currentMode = process.env.NODE_ENV || "development";
const envFiles = [".env", ".env.local", `.env.${currentMode}`, `.env.${currentMode}.local`];

for (const filename of envFiles) {
  const envPath = path.join(envDir, filename);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const { BOT_TOKEN, MINI_APP_URL, BACKEND_URL } = process.env;

if (!BOT_TOKEN) {
  console.error("[bot] BOT_TOKEN is not set. Check bot/.env.");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

const miniAppUrl = (MINI_APP_URL || "").trim();
const backendUrl = (BACKEND_URL || "").trim();

/**
 * Выполняет GET-запрос к backend API с авторизацией по BOT_TOKEN.
 */
function backendGet(urlPath) {
  return new Promise((resolve, reject) => {
    const fullUrl = `${backendUrl}${urlPath}`;
    const lib = fullUrl.startsWith("https") ? https : http;
    const url = new URL(fullUrl);

    const options = {
      hostname: url.hostname,
      port: url.port || (fullUrl.startsWith("https") ? 443 : 80),
      path: url.pathname + url.search,
      method: "GET",
      headers: {
        Authorization: `Bearer ${BOT_TOKEN}`,
      },
    };

    const req = lib.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => {
        raw += chunk;
      });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: null });
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

/**
 * Выполняет PATCH-запрос к backend API с авторизацией по BOT_TOKEN.
 */
function backendPatch(urlPath, payload) {
  return new Promise((resolve, reject) => {
    const fullUrl = `${backendUrl}${urlPath}`;
    const lib = fullUrl.startsWith("https") ? https : http;
    const url = new URL(fullUrl);
    const data = JSON.stringify(payload);

    const options = {
      hostname: url.hostname,
      port: url.port || (fullUrl.startsWith("https") ? 443 : 80),
      path: url.pathname + url.search,
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${BOT_TOKEN}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };

    const req = lib.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => {
        raw += chunk;
      });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: null });
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

/**
 * Скачивает файл по URL (http/https) и возвращает Buffer.
 */
function downloadFile(fileUrl) {
  return new Promise((resolve, reject) => {
    const lib = fileUrl.startsWith("https") ? https : http;
    lib
      .get(fileUrl, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

/**
 * Проверяет, завершил ли пользователь онбординг, по telegram_id.
 * Возвращает true/false/null (null = пользователь не найден в системе).
 */
async function checkOnboardingStatus(telegramId) {
  if (!backendUrl) return null;
  try {
    const { status, body } = await backendGet(`/api/bot/internal/user-status?telegramId=${telegramId}`);
    if (status === 200 && body) return body.onboardingCompleted;
    if (status === 404) return null;
    return null;
  } catch {
    return null;
  }
}

/**
 * Получает список issued сертификатов пользователя по telegramId.
 */
async function fetchCertificates(telegramId) {
  if (!backendUrl) return [];
  try {
    const { status, body } = await backendGet(`/api/bot/internal/certificates?telegramId=${telegramId}`);
    if (status === 200 && body) return body.certificates || [];
    return [];
  } catch {
    return [];
  }
}

/**
 * Обновляет флаг уведомлений пользователя по telegramId.
 */
async function setNotificationsEnabled(telegramId, enabled) {
  if (!backendUrl) return false;
  try {
    const { status } = await backendPatch(`/api/bot/internal/notifications/settings?telegramId=${telegramId}`, { notificationsEnabled: enabled });
    return status === 200;
  } catch {
    return false;
  }
}

function buildOnboardingMessage(firstName) {
  const name = firstName ? `, ${firstName}` : "";
  return [
    `👋 Привет${name}!`,
    "",
    "Я бот системы аттестации. Здесь ты будешь:",
    "📚 Проходить обучающие курсы",
    "✅ Сдавать тесты и аттестации",
    "🏆 Получать баллы и бейджи за прогресс",
    "📄 Получать сертификаты о прохождении",
    "",
    "Нажми кнопку ниже, чтобы открыть приложение и начать.",
  ].join("\n");
}

function buildMainMenuMessage(firstName) {
  const name = firstName ? `, ${firstName}` : "";
  return `Привет${name}! 👋\n\nЧто хочешь сделать?`;
}

function buildMainMenuKeyboard(webAppUrl) {
  const keyboard = [];
  if (webAppUrl) {
    keyboard.push([{ text: "📚 Открыть приложение", web_app: { url: webAppUrl } }]);
  }
  keyboard.push([{ text: "📄 Мои сертификаты" }]);
  keyboard.push([{ text: "🔔 Уведомления" }]);
  return { keyboard, resize_keyboard: true };
}

function buildOnboardingKeyboard(webAppUrl) {
  if (!webAppUrl) return undefined;
  return {
    inline_keyboard: [[{ text: "Открыть приложение", web_app: { url: webAppUrl } }]],
  };
}

bot.start(async (ctx) => {
  const userName = ctx.from?.first_name || "";
  const telegramId = String(ctx.from?.id || "");
  const startPayload = ctx.startPayload;

  const webAppUrl = miniAppUrl;

  if (startPayload && startPayload.startsWith("invite_")) {
    console.log("[bot] Приглашение обнаружено:", startPayload);
  }

  const onboardingCompleted = await checkOnboardingStatus(telegramId);

  if (onboardingCompleted === null || !onboardingCompleted) {
    await ctx.reply(buildOnboardingMessage(userName), {
      reply_markup: buildOnboardingKeyboard(webAppUrl),
      parse_mode: "HTML",
    });
    return;
  }

  await ctx.reply(buildMainMenuMessage(userName), {
    reply_markup: buildMainMenuKeyboard(webAppUrl),
    parse_mode: "HTML",
  });
});

// Команда /certificate — последний сертификат
bot.command("certificate", async (ctx) => {
  const telegramId = String(ctx.from?.id || "");
  const certs = await fetchCertificates(telegramId);

  if (!certs.length) {
    await ctx.reply("У вас пока нет выданных сертификатов. Пройдите курс и сдайте итоговую аттестацию! 📚");
    return;
  }

  const last = certs[0];
  try {
    const fileBuffer = await downloadFile(`${backendUrl}/uploads/certificates/${last.uuid}.pdf`);
    const dateStr = new Date(last.issued_at).toLocaleDateString("ru-RU");
    await ctx.replyWithDocument(
      { source: fileBuffer, filename: `certificate-${last.uuid}.pdf` },
      { caption: `🏆 Сертификат: ${last.course_title}\nДата: ${dateStr}`, parse_mode: "HTML" },
    );
  } catch (err) {
    console.error("[bot] Ошибка отправки сертификата:", err.message);
    await ctx.reply("Не удалось загрузить файл сертификата. Попробуйте позже.");
  }
});

// Команда /certificates — список всех сертификатов
bot.command("certificates", async (ctx) => {
  const telegramId = String(ctx.from?.id || "");
  const certs = await fetchCertificates(telegramId);

  if (!certs.length) {
    await ctx.reply("У вас пока нет выданных сертификатов. Пройдите курс и сдайте итоговую аттестацию! 📚");
    return;
  }

  // Отправляем каждый как отдельный файл с inline-кнопкой «Скачать»
  for (const cert of certs) {
    const dateStr = new Date(cert.issued_at).toLocaleDateString("ru-RU");
    try {
      const fileBuffer = await downloadFile(`${backendUrl}/uploads/certificates/${cert.uuid}.pdf`);
      await ctx.replyWithDocument(
        { source: fileBuffer, filename: `certificate-${cert.uuid}.pdf` },
        { caption: `🏆 <b>${cert.course_title}</b>\nДата: ${dateStr}`, parse_mode: "HTML" },
      );
    } catch (err) {
      console.error("[bot] Ошибка отправки сертификата uuid=%s: %s", cert.uuid, err.message);
      await ctx.reply(`📄 ${cert.course_title} (${dateStr}) — файл временно недоступен`);
    }
  }
});

// Кнопка меню «Мои сертификаты»
bot.hears("📄 Мои сертификаты", async (ctx) => {
  const telegramId = String(ctx.from?.id || "");
  const certs = await fetchCertificates(telegramId);

  if (!certs.length) {
    await ctx.reply("У вас пока нет выданных сертификатов. Пройдите курс и сдайте итоговую аттестацию! 📚");
    return;
  }

  for (const cert of certs) {
    const dateStr = new Date(cert.issued_at).toLocaleDateString("ru-RU");
    try {
      const fileBuffer = await downloadFile(`${backendUrl}/uploads/certificates/${cert.uuid}.pdf`);
      await ctx.replyWithDocument(
        { source: fileBuffer, filename: `certificate-${cert.uuid}.pdf` },
        { caption: `🏆 <b>${cert.course_title}</b>\nДата: ${dateStr}`, parse_mode: "HTML" },
      );
    } catch (err) {
      console.error("[bot] Ошибка отправки сертификата uuid=%s: %s", cert.uuid, err.message);
      await ctx.reply(`📄 ${cert.course_title} (${dateStr}) — файл временно недоступен`);
    }
  }
});

// Кнопка меню «Уведомления» — показываем статус и кнопки вкл/выкл
bot.hears("🔔 Уведомления", async (ctx) => {
  const telegramId = String(ctx.from?.id || "");

  // Получаем текущий статус через user-status (notifications_enabled не возвращается там)
  // Используем отдельный запрос через backendGet
  let enabled = true;
  try {
    const { status, body } = await backendGet(`/api/bot/internal/user-status?telegramId=${telegramId}`);
    if (status === 200 && body) {
      enabled = body.notificationsEnabled !== false;
    }
  } catch {
    // игнорируем
  }

  const statusText = enabled ? "✅ Включены" : "❌ Выключены";
  const toggleLabel = enabled ? "🔕 Выключить уведомления" : "🔔 Включить уведомления";
  const toggleData = enabled ? "notifications:disable" : "notifications:enable";

  await ctx.reply(`🔔 <b>Уведомления</b>\n\nТекущий статус: ${statusText}`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: toggleLabel, callback_data: toggleData }]],
    },
  });
});

// Обработчик callback-кнопок вкл/выкл уведомлений
bot.action(/^notifications:(enable|disable)$/, async (ctx) => {
  const telegramId = String(ctx.from?.id || "");
  const enable = ctx.match[1] === "enable";

  const ok = await setNotificationsEnabled(telegramId, enable);

  if (!ok) {
    await ctx.answerCbQuery("Ошибка. Попробуйте позже.", { show_alert: true });
    return;
  }

  const statusText = enable ? "✅ Уведомления включены" : "❌ Уведомления выключены";
  await ctx.answerCbQuery(statusText);
  await ctx.editMessageText(`🔔 <b>Уведомления</b>\n\nТекущий статус: ${enable ? "✅ Включены" : "❌ Выключены"}`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: enable ? "🔕 Выключить уведомления" : "🔔 Включить уведомления",
            callback_data: enable ? "notifications:disable" : "notifications:enable",
          },
        ],
      ],
    },
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
