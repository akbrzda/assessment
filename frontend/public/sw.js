// Service Worker — кэширование GET-запросов и retry queue для POST
const CACHE_NAME = "api-cache-v1";
const RETRY_QUEUE_KEY = "sw-retry-queue";

// GET-маршруты, которые кэшируем с network-first стратегией
const CACHEABLE_PATTERNS = [
  /\/api\/courses(\?.*)?$/,
  /\/api\/courses\/\d+$/,
  /\/api\/courses\/\d+\/progress$/,
  /\/api\/courses\/\d+\/sections\/\d+$/,
  /\/api\/auth\/profile$/,
  /\/api\/auth\/references$/,
];

// POST-маршруты, которые ставим в retry queue при отсутствии сети
const RETRYABLE_POST_PATTERNS = [
  /\/api\/courses\/\d+\/start$/,
  /\/api\/courses\/\d+\/topics\/\d+\/start$/,
  /\/api\/courses\/\d+\/topics\/\d+\/complete$/,
  /\/api\/courses\/topics\/\d+\/view-material$/,
  /\/api\/courses\/sections\/\d+\/attempts\/\d+\/complete$/,
];

// ─── Утилиты ───────────────────────────────────────────────
function matchesAny(url, patterns) {
  return patterns.some((pattern) => pattern.test(url));
}

async function getRetryQueue() {
  const db = await openRetryDb();
  return db;
}

// Простое хранилище retry queue в IndexedDB
function openRetryDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("sw-retry-db", 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore("queue", { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function enqueueRequest(db, entry) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readwrite");
    tx.objectStore("queue").add(entry);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllQueued(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readonly");
    const req = tx.objectStore("queue").getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteQueued(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readwrite");
    tx.objectStore("queue").delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Обработчики событий ───────────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = request.url;

  // Обрабатываем только API-запросы
  if (!url.includes("/api/")) {
    return;
  }

  if (request.method === "GET" && matchesAny(url, CACHEABLE_PATTERNS)) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  if (request.method === "POST" && matchesAny(url, RETRYABLE_POST_PATTERNS)) {
    event.respondWith(postWithRetryQueue(request));
    return;
  }
});

// Network-first с fallback на кэш
async function networkFirstWithCache(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return new Response(JSON.stringify({ error: "Нет соединения", offline: true }), {
      status: 503,
      headers: { "Content-Type": "application/json", "X-Served-By": "service-worker" },
    });
  }
}

// POST: отправляем; если нет сети — кладём в retry queue
async function postWithRetryQueue(request) {
  try {
    const response = await fetch(request.clone());
    return response;
  } catch {
    // Сеть недоступна — сохраняем запрос в очередь
    try {
      const body = await request.clone().text();
      const db = await openRetryDb();
      await enqueueRequest(db, {
        url: request.url,
        method: request.method,
        body,
        headers: [...request.headers.entries()].reduce((acc, [k, v]) => {
          // Не сохраняем чувствительные заголовки
          if (!["cookie", "authorization"].includes(k.toLowerCase())) {
            acc[k] = v;
          }
          return acc;
        }, {}),
        enqueuedAt: Date.now(),
      });
    } catch {
      // Не удалось сохранить в очередь — возвращаем offline-ответ
    }
    return new Response(JSON.stringify({ error: "Нет соединения", queued: true }), {
      status: 503,
      headers: { "Content-Type": "application/json", "X-Served-By": "service-worker" },
    });
  }
}

// При восстановлении сети — отправляем накопленные запросы
self.addEventListener("sync", (event) => {
  if (event.tag === "retry-queue") {
    event.waitUntil(flushRetryQueue());
  }
});

// Fallback: также слушаем сообщение от клиента при online-событии
self.addEventListener("message", (event) => {
  if (event.data?.type === "FLUSH_RETRY_QUEUE") {
    flushRetryQueue();
  }
});

async function flushRetryQueue() {
  let db;
  try {
    db = await openRetryDb();
    const items = await getAllQueued(db);
    for (const item of items) {
      try {
        await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
          credentials: "include",
        });
        await deleteQueued(db, item.id);
      } catch {
        // Запрос всё ещё не прошёл — оставляем в очереди
      }
    }
  } catch {
    // IndexedDB недоступна
  }
}
