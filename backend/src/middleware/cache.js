const cacheService = require("../services/cacheService");

/**
 * Middleware для кеширования GET запросов
 * @param {Object} options - Опции кеширования
 * @param {number} options.ttl - Время жизни кеша в секундах (по умолчанию 300)
 * @param {Function} options.keyGenerator - Функция для генерации ключа кеша
 * @param {Function} options.shouldCache - Функция для определения, нужно ли кешировать
 */
const cacheMiddleware = (options = {}) => {
  const {
    ttl = 300,
    keyGenerator = (req) => `http:${req.method}:${req.originalUrl}`,
    shouldCache = (req, res) => req.method === "GET" && res.statusCode === 200,
  } = options;

  return async (req, res, next) => {
    // Пропускаем не-GET запросы
    if (req.method !== "GET") {
      return next();
    }

    const cacheKey = keyGenerator(req);

    // Проверяем наличие в кеше
    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Перехватываем оригинальный метод json
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      // Кешируем только если нужно
      if (shouldCache(req, res)) {
        cacheService.set(cacheKey, data, ttl);
      }
      return originalJson(data);
    };

    next();
  };
};

/**
 * Middleware для инвалидации кеша при изменении данных
 * @param {string|RegExp|Function} pattern - Паттерн для инвалидации
 */
const invalidateCacheMiddleware = (pattern) => {
  return (req, res, next) => {
    // Сохраняем оригинальный метод json
    const originalJson = res.json.bind(res);

    res.json = (data) => {
      // Инвалидируем кеш после успешного ответа
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (typeof pattern === "function") {
          const computedPattern = pattern(req);
          if (computedPattern) {
            cacheService.invalidate(computedPattern);
          }
        } else {
          cacheService.invalidate(pattern);
        }
      }

      return originalJson(data);
    };

    next();
  };
};

module.exports = {
  cacheMiddleware,
  invalidateCacheMiddleware,
};
