const https = require("https");
const config = require("../../config/env");
const logger = require("../../utils/logger");
const notificationService = require("./notificationService");

const BOT_TOKEN = config.botToken;
const BOT_USERNAME = process.env.BOT_USERNAME || "theorica_bot";
const TELEGRAM_API_HOST = "api.telegram.org";

// Время между сообщениями при пакетной отправке (мс) — не более 30 msg/s
const THROTTLE_DELAY_MS = 35;

/**
 * Выполняет POST-запрос к Telegram Bot API.
 * Возвращает объект ответа или выбрасывает ошибку с кодом status.
 */
function callTelegramApi(method, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: TELEGRAM_API_HOST,
      path: `/bot${BOT_TOKEN}/${method}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => {
        raw += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(raw);
          if (res.statusCode === 200 && parsed.ok) {
            resolve(parsed.result);
          } else {
            const err = new Error(parsed.description || "Telegram API error");
            err.telegramCode = parsed.error_code;
            err.httpStatus = res.statusCode;
            err.retryAfter = parsed.parameters?.retry_after || null;
            reject(err);
          }
        } catch {
          reject(new Error(`Не удалось разобрать ответ Telegram API: ${raw}`));
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

/**
 * Проверяет, находится ли текущее время в тихих часах пользователя.
 * Тихие часы задаются в формате 'HH:MM'.
 * Если не задано — использует глобальный дефолт 22:00–09:00.
 */
function isQuietTime(quietStart, quietEnd, timezone) {
  try {
    const tz = timezone || "Europe/Moscow";
    const now = new Date();
    // Получаем локальное время в таймзоне пользователя
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);

    const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
    const currentMinutes = hour * 60 + minute;

    const [startH, startM] = (quietStart || "22:00").split(":").map(Number);
    const [endH, endM] = (quietEnd || "09:00").split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Диапазон тихих часов может переходить через полночь
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch {
    return false;
  }
}

/**
 * Строит текст и inline-кнопки для уведомления по его типу и payload.
 * Возвращает { text, reply_markup? }.
 */
function buildMessage(type, payload) {
  const name = payload.firstName || "Сотрудник";
  const courseTitle = payload.courseTitle || "курс";
  const courseId = payload.courseId;
  const score = payload.scorePercent != null ? payload.scorePercent : "";
  const passScore = payload.passScorePercent != null ? payload.passScorePercent : "";
  const remaining = payload.remainingAttempts;

  const appUrl = (url) => `https://t.me/${BOT_USERNAME}/app?startapp=${url}`;

  if (type === "new_course") {
    const text = `👋 <b>${name}</b>, для вас добавлен новый курс!\n\n📚 <b>${courseTitle}</b>\n\nОткройте приложение, чтобы начать обучение.`;
    const reply_markup = courseId ? { inline_keyboard: [[{ text: "Открыть курс", url: appUrl(`course_${courseId}`) }]] } : undefined;
    return { text, reply_markup };
  }

  if (type === "result_passed") {
    const text = `🎉 <b>${name}</b>, поздравляем!\n\nВы успешно прошли итоговую аттестацию курса <b>${courseTitle}</b>.\n\n✅ Результат: <b>${score}%</b> (порог: ${passScore}%)`;
    const buttons = [];
    if (courseId) {
      buttons.push({ text: "Получить сертификат", url: appUrl(`course_${courseId}`) });
      buttons.push({ text: "Открыть приложение", url: appUrl("home") });
    }
    const reply_markup = buttons.length ? { inline_keyboard: [buttons] } : undefined;
    return { text, reply_markup };
  }

  if (type === "result_failed") {
    let text = `😔 <b>${name}</b>, к сожалению, аттестация не пройдена.\n\nКурс: <b>${courseTitle}</b>\nРезультат: <b>${score}%</b> (порог: ${passScore}%)`;
    if (remaining !== null && remaining !== undefined) {
      text += `\n\nОсталось попыток: <b>${remaining}</b>`;
    }
    const buttons = [];
    if (remaining && courseId) {
      buttons.push({ text: "Пересдать", url: appUrl(`course_${courseId}`) });
      buttons.push({ text: "Изучить материалы", url: appUrl(`course_${courseId}`) });
    }
    const reply_markup = buttons.length ? { inline_keyboard: [buttons] } : undefined;
    return { text, reply_markup };
  }

  if (type === "course_reminder") {
    const deadline = payload.deadline ? `\n\n📅 Дедлайн: ${new Date(payload.deadline).toLocaleDateString("ru-RU")}` : "";
    const text = `📚 <b>${name}</b>, не забудьте продолжить курс!\n\n<b>${courseTitle}</b>${deadline}\n\nВернитесь к обучению — вы почти у цели!`;
    const reply_markup = courseId ? { inline_keyboard: [[{ text: "Продолжить курс", url: appUrl(`course_${courseId}`) }]] } : undefined;
    return { text, reply_markup };
  }

  if (type === "deadline_reminder") {
    const daysLeft = payload.daysLeft ?? "";
    const deadline = payload.deadline ? new Date(payload.deadline).toLocaleDateString("ru-RU") : "";
    const text = `⏰ <b>${name}</b>, до дедлайна курса осталось <b>${daysLeft} дн.</b>!\n\n📚 <b>${courseTitle}</b>\n📅 Дедлайн: ${deadline}\n\nНе откладывайте — завершите курс вовремя!`;
    const reply_markup = courseId ? { inline_keyboard: [[{ text: "Открыть курс", url: appUrl(`course_${courseId}`) }]] } : undefined;
    return { text, reply_markup };
  }

  if (type === "deadline_missed") {
    const deadline = payload.deadline ? new Date(payload.deadline).toLocaleDateString("ru-RU") : "";
    const text = `❌ <b>${name}</b>, дедлайн курса истёк.\n\n📚 <b>${courseTitle}</b>\n📅 Был: ${deadline}\n\nОбратитесь к своему руководителю за разъяснениями.`;
    return { text };
  }

  if (type === "certificate_ready") {
    const uuid = payload.uuid || "";
    const text = `🏆 <b>${name}</b>, ваш сертификат готов!\n\n📚 Курс: <b>${courseTitle}</b>\n\nСкачайте сертификат в приложении или через команду /certificate`;
    const reply_markup = { inline_keyboard: [[{ text: "Скачать сертификат", url: appUrl(`certificate_${uuid}`) }]] };
    return { text, reply_markup };
  }

  // Фоллбэк: использовать готовый текст из payload
  return { text: payload.text || "", reply_markup: payload.reply_markup };
}

/**
 * Отправляет одно уведомление пользователю.
 * Обновляет статус записи в bot_notifications.
 */
async function sendOne(notification) {
  const {
    id,
    type,
    telegram_id: chatId,
    notification_quiet_start: quietStart,
    notification_quiet_end: quietEnd,
    timezone,
    notifications_enabled: notificationsEnabled,
    payload: rawPayload,
  } = notification;

  // Пользователь отключил уведомления
  if (!notificationsEnabled) {
    await notificationService.skip(id);
    return;
  }

  // Тихие часы
  if (isQuietTime(quietStart, quietEnd, timezone)) {
    // Не помечаем skipped — попробуем снова при следующем запуске cron
    return;
  }

  const payload = typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload || {};

  const { text, reply_markup } = buildMessage(type, payload);

  const messageBody = {
    chat_id: chatId,
    text: text || "—",
    parse_mode: "HTML",
    ...(reply_markup ? { reply_markup } : {}),
  };

  try {
    await callTelegramApi("sendMessage", messageBody);
    await notificationService.updateStatus(id, "sent");
  } catch (err) {
    if (err.httpStatus === 403) {
      // Пользователь заблокировал бота
      logger.warn("Бот заблокирован пользователем telegram_id=%s, notificationId=%d", chatId, id);
      await notificationService.updateStatus(id, "blocked", { errorMessage: err.message });
    } else if (err.httpStatus === 429 && err.retryAfter) {
      // Rate limit: ждём указанное время, затем завершаем — следующий cron попробует снова
      logger.warn("Telegram rate limit: retry_after=%ds, notificationId=%d", err.retryAfter, id);
      await new Promise((r) => setTimeout(r, err.retryAfter * 1000));
    } else {
      logger.error("Ошибка отправки уведомления notificationId=%d: %s", id, err.message);
      await notificationService.updateStatus(id, "failed", { errorMessage: err.message });
    }
  }
}

/**
 * Обрабатывает список уведомлений с throttling между отправками.
 */
async function sendBatch(notifications) {
  for (let i = 0; i < notifications.length; i += 1) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, THROTTLE_DELAY_MS));
    }
    await sendOne(notifications[i]);
  }
}

module.exports = { sendOne, sendBatch };
