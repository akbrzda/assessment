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

const { BOT_TOKEN, MINI_APP_URL, BACKEND_URL, INTERNAL_API_SECRET, BOT_WEBHOOK_DOMAIN, BOT_WEBHOOK_PATH, BOT_WEBHOOK_PORT } = process.env;
const botUsername = (process.env.BOT_USERNAME || "").trim();
const internalApiSecret = String(INTERNAL_API_SECRET || "").trim();

if (!BOT_TOKEN) {
  console.error("[bot] BOT_TOKEN is not set. Check bot/.env.");
  process.exit(1);
}

if (!internalApiSecret) {
  console.error("[bot] INTERNAL_API_SECRET is not set. Check bot/.env.");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

const miniAppUrl = (MINI_APP_URL || "").trim();
const backendUrl = (BACKEND_URL || "").trim();

/**
 * Выполняет GET-запрос к backend API с авторизацией по INTERNAL_API_SECRET.
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
        Authorization: `Bearer ${internalApiSecret}`,
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
 * Выполняет PATCH-запрос к backend API с авторизацией по INTERNAL_API_SECRET.
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
        Authorization: `Bearer ${internalApiSecret}`,
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
 * Получает статус пользователя из системы по telegram_id.
 * Возвращает расширенный объект статуса для корректного роутинга /start.
 */
async function getUserStatus(telegramId) {
  if (!backendUrl) {
    return { found: false, notFound: false, unavailable: true };
  }

  try {
    const { status, body } = await backendGet(`/api/v1/bot/internal/user-status?telegramId=${telegramId}`);
    if (status === 200 && body) {
      return {
        found: true,
        notFound: false,
        unavailable: false,
        onboardingCompleted: Boolean(body.onboardingCompleted),
        firstName: String(body.firstName || "").trim(),
      };
    }

    if (status === 404) {
      return { found: false, notFound: true, unavailable: false };
    }

    return { found: false, notFound: false, unavailable: true };
  } catch {
    return { found: false, notFound: false, unavailable: true };
  }
}

async function getOnboardingConfig() {
  if (!backendUrl) {
    return null;
  }
  try {
    const { status, body } = await backendGet("/api/v1/bot/internal/onboarding-config");
    if (status === 200 && body) {
      return body;
    }
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
    const { status, body } = await backendGet(`/api/v1/bot/internal/certificates?telegramId=${telegramId}`);
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
    const { status } = await backendPatch(`/api/v1/bot/internal/notifications/settings?telegramId=${telegramId}`, { notificationsEnabled: enabled });
    return status === 200;
  } catch {
    return false;
  }
}

function applyNameTemplate(template, firstName) {
  const normalizedName = firstName ? `, ${firstName}` : "";
  return String(template || "").replaceAll("{{name}}", normalizedName);
}

function buildOnboardingMessage(firstName, config) {
  const title = applyNameTemplate(config?.onboardingTitle || "👋 Привет{{name}}!", firstName);
  const body = String(config?.onboardingBody || "").replaceAll("\\n", "\n");
  return [title, "", body].join("\n").trim();
}

function buildOnboardingStep2Message(config) {
  return String(config?.onboardingStep2 || "")
    .replaceAll("\\n", "\n")
    .trim();
}

function buildOnboardingStep3Message(config) {
  const body = String(config?.onboardingStep3 || "").replaceAll("\\n", "\n");
  return [body, "", "Готовы начать? Нажмите кнопку ниже."].join("\n").trim();
}

function buildGuestNoInviteMessage(firstName, config) {
  const intro = firstName ? `👋 Привет, ${firstName}!` : "👋 Привет!";
  const body = String(config?.guestNoInviteText || "").replaceAll("\\n", "\n");
  const inviteHint = botUsername
    ? `Для доступа к системе нужна персональная ссылка-приглашение. Попросите руководителя отправить её в Telegram или MAX.`
    : "";
  return `${intro}\n\n${body}${inviteHint}`;
}

function buildInviteWelcomeMessage(firstName, config) {
  const intro = firstName ? `👋 Привет, ${firstName}!` : "👋 Привет!";
  const body = String(
    config?.inviteWelcomeText || "Вас пригласили в систему.\n\nНажмите кнопку ниже, чтобы активировать приглашение и войти.",
  ).replaceAll("\\n", "\n");
  return `${intro}\n\n${body}`;
}

function buildInviteKeyboard(webAppUrl, config) {
  if (!webAppUrl) return { inline_keyboard: [] };
  return {
    inline_keyboard: [[{ text: String(config?.inviteCtaText || "🚀 Активировать приглашение"), web_app: { url: webAppUrl } }]],
  };
}

function buildMainMenuMessage(firstName, config) {
  return applyNameTemplate(config?.mainMenuText || "Привет{{name}}! 👋\n\nЧто хотите сделать?", firstName).replaceAll("\\n", "\n");
}

function buildHelpMessage(config) {
  return String(config?.helpText || "Доступные команды:\n/start\n/certificate\n/certificates\n/help").replaceAll("\\n", "\n");
}

function buildMainMenuKeyboard(webAppUrl, config) {
  const keyboard = [];
  if (webAppUrl) {
    keyboard.push([{ text: `📚 ${String(config?.onboardingCtaText || "Открыть приложение")}`, web_app: { url: webAppUrl } }]);
  }
  keyboard.push([{ text: "📄 Мои сертификаты" }]);
  keyboard.push([{ text: "🔔 Уведомления" }, { text: "ℹ️ Помощь" }]);
  return { keyboard, resize_keyboard: true };
}

function buildOnboardingKeyboard(webAppUrl, config) {
  if (!webAppUrl) {
    return {
      inline_keyboard: [[{ text: "Дальше ➜", callback_data: "onboarding:step2" }]],
    };
  }

  return {
    inline_keyboard: [
      [{ text: "Дальше ➜", callback_data: "onboarding:step2" }],
      [{ text: String(config?.onboardingCtaText || "Открыть приложение"), web_app: { url: webAppUrl } }],
    ],
  };
}

function buildOnboardingStep2Keyboard(webAppUrl, config) {
  if (!webAppUrl) {
    return {
      inline_keyboard: [
        [
          { text: "⬅ Назад", callback_data: "onboarding:step1" },
          { text: "Дальше ➜", callback_data: "onboarding:step3" },
        ],
      ],
    };
  }

  return {
    inline_keyboard: [
      [
        { text: "⬅ Назад", callback_data: "onboarding:step1" },
        { text: "Дальше ➜", callback_data: "onboarding:step3" },
      ],
      [{ text: String(config?.onboardingCtaText || "Открыть приложение"), web_app: { url: webAppUrl } }],
    ],
  };
}

function buildOnboardingStep3Keyboard(webAppUrl, config) {
  if (!webAppUrl) {
    return {
      inline_keyboard: [[{ text: "⬅ Назад", callback_data: "onboarding:step2" }]],
    };
  }

  return {
    inline_keyboard: [
      [{ text: "⬅ Назад", callback_data: "onboarding:step2" }],
      [{ text: String(config?.onboardingCtaText || "Открыть приложение"), web_app: { url: webAppUrl } }],
    ],
  };
}

const ONBOARDING_FSM = {
  step1: {
    next: "step2",
    prev: null,
  },
  step2: {
    next: "step3",
    prev: "step1",
  },
  step3: {
    next: null,
    prev: "step2",
  },
};

function resolveOnboardingState(rawState) {
  if (rawState && ONBOARDING_FSM[rawState]) {
    return rawState;
  }

  return "step1";
}

bot.start(async (ctx) => {
  const telegramFirstName = ctx.from?.first_name || "";
  const telegramId = String(ctx.from?.id || "");
  const startPayload = ctx.startPayload;

  const webAppUrl = miniAppUrl;
  const onboardingConfig = await getOnboardingConfig();
  const hasInvitePayload = Boolean(startPayload && startPayload.startsWith("invite_"));

  if (startPayload && startPayload.startsWith("invite_")) {
    console.log("[bot] Приглашение обнаружено:", startPayload);
  }

  console.log("[bot /start] telegramId=%s, hasInvite=%s", telegramId, hasInvitePayload);
  const userStatus = await getUserStatus(telegramId);
  console.log("[bot /start] userStatus=%O", userStatus);
  const userName = userStatus?.found ? userStatus.firstName || telegramFirstName : telegramFirstName;
  const onboardingCompleted = userStatus?.found ? Boolean(userStatus.onboardingCompleted) : false;

  console.log(
    "[bot /start] found=%s, notFound=%s, unavailable=%s, onboardingCompleted=%s",
    userStatus?.found,
    userStatus?.notFound,
    userStatus?.unavailable,
    onboardingCompleted,
  );

  // Показываем сообщение про приглашение только если точно знаем, что пользователя нет в системе.
  if (userStatus?.notFound && hasInvitePayload) {
    // Новый пользователь пришёл по ссылке-приглашению — направляем в мини-приложение.
    // Telegram передаёт startPayload как start_param в initDataUnsafe, поэтому
    // мини-приложение автоматически получит код инвайта при открытии через web_app кнопку.
    console.log("[bot /start] BRANCH: notFound с invite — отправляем кнопку активации");
    await ctx.reply(buildInviteWelcomeMessage(userName, onboardingConfig), {
      reply_markup: buildInviteKeyboard(webAppUrl, onboardingConfig),
      parse_mode: "HTML",
    });
    return;
  }

  if (userStatus?.notFound && !hasInvitePayload) {
    console.log("[bot /start] BRANCH: notFound без invite — отправляем сообщение про приглашение");
    await ctx.reply(buildGuestNoInviteMessage(userName, onboardingConfig), {
      parse_mode: "HTML",
    });
    return;
  }

  if (!onboardingCompleted) {
    await ctx.reply(buildOnboardingMessage(userName, onboardingConfig), {
      reply_markup: buildOnboardingKeyboard(webAppUrl, onboardingConfig),
      parse_mode: "HTML",
    });
    return;
  }

  await ctx.reply(buildMainMenuMessage(userName, onboardingConfig), {
    reply_markup: buildMainMenuKeyboard(webAppUrl, onboardingConfig),
    parse_mode: "HTML",
  });
});

bot.command("help", async (ctx) => {
  const onboardingConfig = await getOnboardingConfig();
  await ctx.reply(buildHelpMessage(onboardingConfig), { parse_mode: "HTML" });
});

bot.action(/^onboarding:(step1|step2|step3)$/, async (ctx) => {
  const state = resolveOnboardingState(ctx.match[1]);
  const telegramFirstName = ctx.from?.first_name || "";
  const telegramId = String(ctx.from?.id || "");
  const onboardingConfig = await getOnboardingConfig();
  const userStatus = await getUserStatus(telegramId);
  const userName = userStatus?.found ? userStatus.firstName || telegramFirstName : telegramFirstName;

  const screens = {
    step1: {
      text: buildOnboardingMessage(userName, onboardingConfig),
      keyboard: buildOnboardingKeyboard(miniAppUrl, onboardingConfig),
    },
    step2: {
      text: buildOnboardingStep2Message(onboardingConfig),
      keyboard: buildOnboardingStep2Keyboard(miniAppUrl, onboardingConfig),
    },
    step3: {
      text: buildOnboardingStep3Message(onboardingConfig),
      keyboard: buildOnboardingStep3Keyboard(miniAppUrl, onboardingConfig),
    },
  };

  const screen = screens[state] || screens.step1;

  try {
    await ctx.editMessageText(screen.text, {
      parse_mode: "HTML",
      reply_markup: screen.keyboard,
    });
  } catch (error) {
    await ctx.reply(screen.text, {
      parse_mode: "HTML",
      reply_markup: screen.keyboard,
    });
  }

  await ctx.answerCbQuery();
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

  // Получаем текущий статус через user-status
  let enabled = true;
  try {
    const { status, body } = await backendGet(`/api/v1/bot/internal/user-status?telegramId=${telegramId}`);
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

bot.hears("ℹ️ Помощь", async (ctx) => {
  const onboardingConfig = await getOnboardingConfig();
  await ctx.reply(buildHelpMessage(onboardingConfig), { parse_mode: "HTML" });
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
    const webhookDomain = String(BOT_WEBHOOK_DOMAIN || "").trim();
    const webhookPath = String(BOT_WEBHOOK_PATH || "/telegram/webhook").trim();
    const webhookPort = Number(BOT_WEBHOOK_PORT || 3001);

    if (!webhookDomain) {
      console.error("[bot] BOT_WEBHOOK_DOMAIN is not set. Webhook mode is required.");
      process.exit(1);
    }

    await bot.launch({
      webhook: {
        domain: webhookDomain,
        path: webhookPath,
        port: webhookPort,
      },
    });
    console.log("[bot] started in webhook mode: %s%s", webhookDomain, webhookPath);
  } catch (error) {
    console.error("[bot] Launch failed:", error.message);
    process.exit(1);
  }
}

launchBot();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
