const IORedis = require("ioredis");
const config = require("../config/env");
const logger = require("../utils/logger");

let redis = null;
let status = "disabled";

function buildRedisOptions() {
  if (config.redis.url) {
    return config.redis.url;
  }

  return {
    host: config.redis.host,
    port: config.redis.port,
    username: config.redis.username || undefined,
    password: config.redis.password || undefined,
    db: config.redis.db,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
  };
}

async function connectRedis() {
  if (redis) {
    return redis;
  }

  const options = buildRedisOptions();
  redis = new IORedis(options);

  redis.on("ready", () => {
    status = "ready";
    logger.info("Redis подключен");
  });

  redis.on("error", (error) => {
    status = "error";
    logger.warn("Ошибка Redis: %s", error.message);
  });

  try {
    await redis.connect();
    status = "ready";
  } catch (error) {
    status = "error";
    logger.warn("Redis недоступен: %s", error.message);
  }

  return redis;
}

function getRedisClient() {
  return redis;
}

function getRedisStatus() {
  return status;
}

function getRedisConnectionOptionsForBull() {
  if (config.redis.url) {
    return { url: config.redis.url };
  }

  return {
    host: config.redis.host,
    port: config.redis.port,
    username: config.redis.username || undefined,
    password: config.redis.password || undefined,
    db: config.redis.db,
    maxRetriesPerRequest: null,
  };
}

module.exports = {
  connectRedis,
  getRedisClient,
  getRedisStatus,
  getRedisConnectionOptionsForBull,
};
