const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

const envDir = path.resolve(__dirname, "../../");
const currentMode = process.env.NODE_ENV || "development";
const envFiles = [".env", ".env.local", `.env.${currentMode}`, `.env.${currentMode}.local`];

for (const filename of envFiles) {
  const envPath = path.join(envDir, filename);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const requiredVars = ["PORT", "DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD", "BOT_TOKEN", "JWT_SECRET", "JWT_REFRESH_SECRET"];

const missingVars = requiredVars.filter((key) => !process.env[key]);

if (missingVars.length) {
  console.warn(`[env] Missing variables: ${missingVars.join(", ")}. Check your environment configuration.`);
}

const missingSecurityVars = ["JWT_SECRET", "JWT_REFRESH_SECRET"].filter((key) => !process.env[key]);
if (missingSecurityVars.length) {
  throw new Error(`[env] Security variables are required: ${missingSecurityVars.join(", ")}`);
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
  telegramInitDataBypass:
    (process.env.TELEGRAM_INITDATA_BYPASS || "").toLowerCase() === "true" && (process.env.NODE_ENV || "development") !== "production",
  telegramBypassUser: {
    id: String(process.env.TELEGRAM_BYPASS_USER_ID || "999000001"),
    firstName: process.env.TELEGRAM_BYPASS_FIRST_NAME || "Dev",
    lastName: process.env.TELEGRAM_BYPASS_LAST_NAME || "Tester",
    username: process.env.TELEGRAM_BYPASS_USERNAME || "dev_tester",
  },
  port: Number(process.env.PORT || 3001),
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectTimeoutMs: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
  },
  botToken: process.env.BOT_TOKEN,
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  allowedOrigins: parseList(process.env.ALLOWED_ORIGINS),
  superAdminIds: parseList(process.env.SUPERADMIN_IDS),
  redis: {
    url: process.env.REDIS_URL || "",
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
    username: process.env.REDIS_USERNAME || "",
    password: process.env.REDIS_PASSWORD || "",
    db: Number(process.env.REDIS_DB || 0),
  },
};

if (module.exports.nodeEnv === "production" && module.exports.allowedOrigins.length === 0) {
  throw new Error("[env] В production переменная ALLOWED_ORIGINS обязательна и не может быть пустой");
}
