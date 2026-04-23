const logger = require("../utils/logger");
const { getRedisClient } = require("./redisService");

class CacheService {
  get redis() {
    return getRedisClient();
  }

  isRedisReady() {
    return Boolean(this.redis && this.redis.status === "ready");
  }

  async set(key, value, ttl = 300) {
    if (!this.isRedisReady()) {
      return false;
    }

    const payload = JSON.stringify(value);

    try {
      if (ttl > 0) {
        await this.redis.set(key, payload, "EX", ttl);
      } else {
        await this.redis.set(key, payload);
      }
      return true;
    } catch (error) {
      logger.warn("Ошибка Redis set(%s): %s", key, error.message);
      return false;
    }
  }

  async get(key) {
    if (!this.isRedisReady()) {
      return undefined;
    }

    try {
      const raw = await this.redis.get(key);
      if (raw == null) {
        return undefined;
      }
      return JSON.parse(raw);
    } catch (error) {
      logger.warn("Ошибка Redis get(%s): %s", key, error.message);
      return undefined;
    }
  }

  async delete(key) {
    if (!this.isRedisReady()) {
      return false;
    }

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.warn("Ошибка Redis del(%s): %s", key, error.message);
      return false;
    }
  }

  async clear() {
    if (!this.isRedisReady()) {
      return false;
    }

    try {
      await this.redis.flushdb();
      return true;
    } catch (error) {
      logger.warn("Ошибка Redis flushdb: %s", error.message);
      return false;
    }
  }

  async invalidate(pattern) {
    if (!this.isRedisReady()) {
      return 0;
    }

    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;

    try {
      const keys = await this.redis.keys("http:GET:*");
      const toDelete = keys.filter((key) => regex.test(key));
      if (toDelete.length === 0) {
        return 0;
      }

      await this.redis.del(...toDelete);
      return toDelete.length;
    } catch (error) {
      logger.warn("Ошибка Redis invalidate: %s", error.message);
      return 0;
    }
  }

  getStats() {
    return {
      redisReady: this.isRedisReady(),
    };
  }
}

module.exports = new CacheService();
