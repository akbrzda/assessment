const mysql = require('mysql2/promise');
const config = require('./env');

const DEFAULT_CONNECT_TIMEOUT_MS = 10000;
const connectTimeout = Number.isFinite(config.db.connectTimeoutMs) && config.db.connectTimeoutMs > 0
  ? config.db.connectTimeoutMs
  : DEFAULT_CONNECT_TIMEOUT_MS;

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
  keepAliveInitialDelay: 0,
  dateStrings: true,
  timezone: 'Z'
});

async function healthCheck() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  healthCheck
};
