const logger = require("../utils/logger");
const { getRedisClient } = require("./redisService");

/**
 * Гибридный кеш: Redis (если доступен) + in-memory fallback
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttls = new Map();
  }

  get redis() {
    return getRedisClient();
  }

  async set(key, value, ttl = 300) {
    const payload = JSON.stringify(value);

    if (this.redis && this.redis.status === "ready") {
      try {
        if (ttl > 0) {
          await this.redis.set(key, payload, "EX", ttl);
        } else {
          await this.redis.set(key, payload);
        }
      } catch (error) {
        logger.warn("Ошибка Redis set(%s): %s", key, error.message);
      }
    }

    this.cache.set(key, value);
    if (ttl > 0) {
      this.ttls.set(key, Date.now() + ttl * 1000);
      setTimeout(() => this.delete(key), ttl * 1000);
    }
  }

  async get(key) {
    if (this.redis && this.redis.status === "ready") {
      try {
        const raw = await this.redis.get(key);
        if (raw != null) {
          return JSON.parse(raw);
        }
      } catch (error) {
        logger.warn("Ошибка Redis get(%s): %s", key, error.message);
      }
    }

    if (this.ttls.has(key) && Date.now() > this.ttls.get(key)) {
      this.delete(key);
      return undefined;
    }

    return this.cache.get(key);
  }

  async delete(key) {
    if (this.redis && this.redis.status === "ready") {
      try {
        await this.redis.del(key);
      } catch (error) {
        logger.warn("Ошибка Redis del(%s): %s", key, error.message);
      }
    }

    this.cache.delete(key);
    this.ttls.delete(key);
  }

  async clear() {
    if (this.redis && this.redis.status === "ready") {
      try {
        await this.redis.flushdb();
      } catch (error) {
        logger.warn("Ошибка Redis flushdb: %s", error.message);
      }
    }

    this.cache.clear();
    this.ttls.clear();
  }

  async invalidate(pattern) {
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;

    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        this.ttls.delete(key);
        deleted += 1;
      }
    }

    if (this.redis && this.redis.status === "ready") {
      try {
        const keys = await this.redis.keys("http:GET:*");
        const toDelete = keys.filter((key) => regex.test(key));
        if (toDelete.length > 0) {
          await this.redis.del(...toDelete);
          deleted += toDelete.length;
        }
      } catch (error) {
        logger.warn("Ошибка Redis invalidate: %s", error.message);
      }
    }

    return deleted;
  }

  getStats() {
    return {
      memorySize: this.cache.size,
      memoryKeys: Array.from(this.cache.keys()),
      redisReady: Boolean(this.redis && this.redis.status === "ready"),
    };
  }
}

module.exports = new CacheService();
