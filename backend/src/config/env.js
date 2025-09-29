const path = require("path");
const dotenv = require("dotenv");

const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

const requiredVars = ["PORT", "DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD", "BOT_TOKEN"];

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
  inviteExpirationDays: Number(process.env.INVITE_EXPIRATION_DAYS || 7),
  allowedOrigins: parseList(process.env.ALLOWED_ORIGINS),
  superAdminIds: parseList(process.env.SUPERADMIN_IDS),
};
