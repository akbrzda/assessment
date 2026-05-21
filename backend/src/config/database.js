const mysql = require("mysql2/promise");
const config = require("./env");

const DEFAULT_CONNECT_TIMEOUT_MS = 10000;
const connectTimeout =
  Number.isFinite(config.db.connectTimeoutMs) && config.db.connectTimeoutMs > 0 ? config.db.connectTimeoutMs : DEFAULT_CONNECT_TIMEOUT_MS;

const poolConfig = {
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
};

const pool = mysql.createPool(poolConfig);

// Read-replica pool: если DB_REPLICA_HOST не задан — используем primary как fallback
let replicaPool;
if (config.dbReplica) {
  replicaPool = mysql.createPool({
    ...poolConfig,
    host: config.dbReplica.host,
    port: config.dbReplica.port,
    user: config.dbReplica.user,
    password: config.dbReplica.password,
    connectionLimit: 10,
    connectTimeout: config.dbReplica.connectTimeoutMs,
  });
} else {
  replicaPool = pool;
}

/**
 * Возвращает replica pool для аналитических (read-only) запросов.
 * При недоступности реплики автоматически падает обратно на primary.
 */
async function getReadPool() {
  if (replicaPool === pool) {
    return pool;
  }
  try {
    const conn = await replicaPool.getConnection();
    conn.release();
    return replicaPool;
  } catch {
    return pool;
  }
}

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
  replicaPool,
  getReadPool,
  healthCheck,
};
