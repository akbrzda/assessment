/**
 * Простой in-memory кеш с поддержкой TTL и инвалидации
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttls = new Map();
  }

  /**
   * Сохранить значение в кеш
   * @param {string} key - Ключ
   * @param {*} value - Значение
   * @param {number} ttl - Время жизни в секундах (по умолчанию 5 минут)
   */
  set(key, value, ttl = 300) {
    this.cache.set(key, value);

    if (ttl > 0) {
      const expiresAt = Date.now() + ttl * 1000;
      this.ttls.set(key, expiresAt);

      // Автоматическое удаление после истечения TTL
      setTimeout(() => {
        this.delete(key);
      }, ttl * 1000);
    }
  }

  /**
   * Получить значение из кеша
   * @param {string} key - Ключ
   * @returns {*} - Значение или undefined
   */
  get(key) {
    // Проверяем, не истек ли TTL
    if (this.ttls.has(key)) {
      const expiresAt = this.ttls.get(key);
      if (Date.now() > expiresAt) {
        this.delete(key);
        return undefined;
      }
    }

    return this.cache.get(key);
  }

  /**
   * Проверить наличие ключа в кеше
   * @param {string} key - Ключ
   * @returns {boolean}
   */
  has(key) {
    if (this.ttls.has(key)) {
      const expiresAt = this.ttls.get(key);
      if (Date.now() > expiresAt) {
        this.delete(key);
        return false;
      }
    }

    return this.cache.has(key);
  }

  /**
   * Удалить значение из кеша
   * @param {string} key - Ключ
   */
  delete(key) {
    this.cache.delete(key);
    this.ttls.delete(key);
  }

  /**
   * Очистить весь кеш
   */
  clear() {
    this.cache.clear();
    this.ttls.clear();
  }

  /**
   * Инвалидировать кеш по паттерну
   * @param {string|RegExp} pattern - Паттерн для поиска ключей
   */
  invalidate(pattern) {
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;

    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.delete(key));
    return keysToDelete.length;
  }

  /**
   * Получить или установить значение
   * @param {string} key - Ключ
   * @param {Function} factory - Функция для получения значения
   * @param {number} ttl - Время жизни в секундах
   * @returns {Promise<*>}
   */
  async getOrSet(key, factory, ttl = 300) {
    if (this.has(key)) {
      return this.get(key);
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Получить статистику кеша
   * @returns {Object}
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Экспортируем singleton
module.exports = new CacheService();
