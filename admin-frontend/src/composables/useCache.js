import { ref, computed } from "vue";

/**
 * Простой сервис кеширования для Vue приложения
 */
class ClientCacheService {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
  }

  /**
   * Получить значение из кеша
   * @param {string} key - Ключ
   * @param {number} maxAge - Максимальный возраст в миллисекундах
   * @returns {*}
   */
  get(key, maxAge = 300000) {
    if (!this.cache.has(key)) {
      return undefined;
    }

    const timestamp = this.timestamps.get(key);
    if (timestamp && Date.now() - timestamp > maxAge) {
      this.delete(key);
      return undefined;
    }

    return this.cache.get(key);
  }

  /**
   * Сохранить значение в кеш
   * @param {string} key - Ключ
   * @param {*} value - Значение
   */
  set(key, value) {
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
  }

  /**
   * Проверить наличие ключа
   * @param {string} key - Ключ
   * @param {number} maxAge - Максимальный возраст в миллисекундах
   * @returns {boolean}
   */
  has(key, maxAge = 300000) {
    return this.get(key, maxAge) !== undefined;
  }

  /**
   * Удалить значение
   * @param {string} key - Ключ
   */
  delete(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }

  /**
   * Очистить весь кеш
   */
  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }

  /**
   * Инвалидировать кеш по паттерну
   * @param {string|RegExp} pattern - Паттерн
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
}

// Singleton экземпляр
const cacheService = new ClientCacheService();

/**
 * Композабл для кеширования API запросов
 * @param {string} cacheKey - Ключ кеша
 * @param {Function} fetcher - Функция для получения данных
 * @param {Object} options - Опции
 * @param {number} options.maxAge - Максимальный возраст кеша в миллисекундах (по умолчанию 5 минут)
 * @param {boolean} options.forceRefresh - Принудительное обновление
 */
export function useCachedFetch(cacheKey, fetcher, options = {}) {
  const {
    maxAge = 300000, // 5 минут
    forceRefresh = false,
  } = options;

  const data = ref(null);
  const error = ref(null);
  const loading = ref(false);

  const fetchData = async () => {
    loading.value = true;
    error.value = null;

    try {
      // Проверяем кеш, если не требуется принудительное обновление
      if (!forceRefresh) {
        const cached = cacheService.get(cacheKey, maxAge);
        if (cached !== undefined) {
          data.value = cached;
          loading.value = false;
          return cached;
        }
      }

      // Получаем свежие данные
      const result = await fetcher();
      data.value = result;

      // Сохраняем в кеш
      cacheService.set(cacheKey, result);

      return result;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const refresh = () => {
    cacheService.delete(cacheKey);
    return fetchData();
  };

  const invalidate = (pattern) => {
    if (pattern) {
      cacheService.invalidate(pattern);
    } else {
      cacheService.delete(cacheKey);
    }
  };

  // Автоматически загружаем данные
  fetchData();

  return {
    data,
    error,
    loading,
    refresh,
    invalidate,
  };
}

/**
 * Инвалидировать кеш
 * @param {string|RegExp} pattern - Паттерн
 */
export function invalidateCache(pattern) {
  return cacheService.invalidate(pattern);
}

/**
 * Очистить весь кеш
 */
export function clearCache() {
  cacheService.clear();
}

export default cacheService;
