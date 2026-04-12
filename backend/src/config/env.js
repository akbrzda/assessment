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

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  return String(value).toLowerCase() === "true";
}

function parseIdList(value) {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => /^\d+$/.test(item))
    .map((item) => Number(item));
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
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  inviteExpirationDays: Number(process.env.INVITE_EXPIRATION_DAYS || 7),
  allowedOrigins: parseList(process.env.ALLOWED_ORIGINS),
  superAdminIds: parseList(process.env.SUPERADMIN_IDS),
  courses: {
    enabled: parseBoolean(process.env.COURSES_ENABLED, false),
    enabledConfigured: process.env.COURSES_ENABLED !== undefined,
    branchIds: parseIdList(process.env.COURSES_ENABLED_BRANCH_IDS),
    positionIds: parseIdList(process.env.COURSES_ENABLED_POSITION_IDS),
  },
};
