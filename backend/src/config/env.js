const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Загрузка корневого .env (общие переменные для всех модулей)
const rootEnvPath = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: rootEnvPath });

// Загрузка локального .env (если требуется переопределить переменные)
const localEnvPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
}

const requiredVars = ["PORT", "DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD", "BOT_TOKEN", "JWT_SECRET", "JWT_REFRESH_SECRET"];

for (const key of requiredVars) {
  if (!process.env[key]) {
    console.warn(`[env] Variable ${key} is not set. Check your environment configuration.`);
  }
}

function parseList(value) {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => item.replace(/\/$/, ""));
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3001),
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  botToken: process.env.BOT_TOKEN,
  logBotToken: process.env.LOG_BOT_TOKEN,
  logChatId: process.env.LOG_CHAT_ID,
  logThreadId: (() => {
    if (!process.env.LOG_THREAD_ID) {
      return null;
    }
    const parsed = Number(process.env.LOG_THREAD_ID);
    return Number.isFinite(parsed) ? parsed : null;
  })(),
  jwtSecret: process.env.JWT_SECRET || "your_secret_key_here",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "your_refresh_secret_key_here",
  inviteExpirationDays: Number(process.env.INVITE_EXPIRATION_DAYS || 7),
  allowedOrigins: parseList(process.env.ALLOWED_ORIGINS),
  superAdminIds: parseList(process.env.SUPERADMIN_IDS),
  redisUrl: process.env.REDIS_URL || null,
  notificationSla: (() => {
    try {
      return process.env.NOTIFICATION_SLA ? JSON.parse(process.env.NOTIFICATION_SLA) : null;
    } catch (error) {
      console.warn("[env] Failed to parse NOTIFICATION_SLA, using defaults 24/6/1h");
      return null;
    }
  })(),
  notificationCheckIntervalMinutes: Number(process.env.NOTIFICATION_CHECK_INTERVAL_MINUTES || 15),
};
