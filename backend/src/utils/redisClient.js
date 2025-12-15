const logger = require("./logger");
const config = require("../config/env");

let redis;
let redisAvailable = false;

if (config.redisUrl) {
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const Redis = require("ioredis");
    redis = new Redis(config.redisUrl, { lazyConnect: true });
    redis.on("error", (error) => {
      logger.error("Redis connection error: %s", error.message);
    });
    redis.on("connect", () => {
      redisAvailable = true;
      logger.info("Redis connected for notification service");
    });
    redis.on("close", () => {
      redisAvailable = false;
      logger.warn("Redis connection closed, fallback to in-memory storage");
    });
    redis.connect().catch((error) => {
      logger.error("Redis initial connect failed: %s", error.message);
    });
  } catch (error) {
    logger.warn("Redis client not available (%s). Using in-memory storage.", error.message);
  }
}

const memoryStore = new Map();

async function setNx(key, value, ttlSeconds) {
  if (redisAvailable && redis) {
    const result = await redis.set(key, value, "EX", ttlSeconds, "NX");
    return result === "OK";
  }

  if (memoryStore.has(key)) {
    return false;
  }

  memoryStore.set(key, {
    value,
    expireAt: Date.now() + ttlSeconds * 1000,
  });

  return true;
}

async function get(key) {
  if (redisAvailable && redis) {
    return redis.get(key);
  }

  const record = memoryStore.get(key);
  if (!record) {
    return null;
  }

  if (record.expireAt && record.expireAt < Date.now()) {
    memoryStore.delete(key);
    return null;
  }

  return record.value;
}

async function set(key, value, ttlSeconds) {
  if (redisAvailable && redis) {
    if (ttlSeconds) {
      await redis.set(key, value, "EX", ttlSeconds);
    } else {
      await redis.set(key, value);
    }
    return;
  }

  memoryStore.set(key, {
    value,
    expireAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
}

async function remove(key) {
  if (redisAvailable && redis) {
    await redis.del(key);
    return;
  }
  memoryStore.delete(key);
}

module.exports = {
  setNx,
  get,
  set,
  remove,
  isRedisEnabled: () => redisAvailable,
  getClient: () => (redisAvailable ? redis : null),
};
