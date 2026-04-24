const mysql = require("mysql2/promise");
const config = require("./env");

const DEFAULT_CONNECT_TIMEOUT_MS = 10000;
const connectTimeout =
  Number.isFinite(config.db.connectTimeoutMs) && config.db.connectTimeoutMs > 0 ? config.db.connectTimeoutMs : DEFAULT_CONNECT_TIMEOUT_MS;

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  queueLimit: 0,
  connectionLimit: 10,
  connectTimeout,
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
  dateStrings: true,
  timezone: "Z",
});

// Коды временных сетевых ошибок, при которых стоит повторить попытку
const TRANSIENT_DB_CODES = new Set([
  "ETIMEDOUT",
  "EADDRNOTAVAIL",
  "ECONNRESET",
  "ECONNREFUSED",
  "PROTOCOL_CONNECTION_LOST",
  "ER_NET_READ_INTERRUPTED",
]);

async function healthCheck({ retries = 5, delayMs = 2000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const connection = await pool.getConnection();
      try {
        await connection.ping();
      } finally {
        connection.release();
      }
      return; // успех
    } catch (error) {
      lastError = error;
      if (TRANSIENT_DB_CODES.has(error.code) && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

module.exports = {
  pool,
  healthCheck,
};
