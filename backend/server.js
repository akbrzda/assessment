const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const { testConnection } = require("./config/database");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  'http://localhost:5173', // для локальной разработки
  'https://nchzn7t3-5173.euw.devtunnels.ms', // tunnel URL
  process.env.FRONTEND_URL, // из переменных окружения
  'https://web.telegram.org' // Telegram Web
].filter(Boolean); // убираем undefined значения

console.log('🔧 CORS разрешенные origins:', allowedOrigins);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data', 'X-Telegram-Web-App-Auth']
  })
);

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Логирование всех запросов с подробной информацией
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n🌐 [${timestamp}] ${req.method} ${req.originalUrl}`);
  console.log(`📍 IP: ${req.ip || req.connection.remoteAddress}`);
  console.log(`🔍 Headers:`, {
    "user-agent": req.get("User-Agent"),
    "content-type": req.get("Content-Type"),
    origin: req.get("Origin"),
    "x-telegram-init-data": req.get("X-Telegram-Init-Data") ? "[ПРИСУТСТВУЕТ]" : "[ОТСУТСТВУЕТ]",
  });

  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`📦 Body:`, req.body);
  }

  // Логирование ответа
  const originalSend = res.send;
  res.send = function (body) {
    console.log(`📤 [${timestamp}] Response ${res.statusCode}:`, body ? body.substring(0, 200) + "..." : "empty");
    originalSend.call(this, body);
  };

  next();
});

// Логирование запросов в development режиме
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Базовый маршрут для проверки работы сервера
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend сервер работает",
    timestamp: new Date().toISOString(),
  });
});

// Подключение маршрутов
app.use("/api/auth", authRoutes);

// Обработчик 404 ошибок
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Маршрут не найден",
  });
});

// Глобальный обработчик ошибок
app.use((error, req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`\n❌ [${timestamp}] Глобальная ошибка:`);
  console.error(`📍 URL: ${req.method} ${req.originalUrl}`);
  console.error(`🔍 Error Stack:`, error.stack);
  console.error(`📦 Request Body:`, req.body);
  console.error(`🔗 Headers:`, req.headers);

  res.status(500).json({
    success: false,
    error: "Внутренняя ошибка сервера",
    timestamp: timestamp,
    ...(process.env.NODE_ENV === "development" && { details: error.message }),
  });
});

// Обработчик 404
app.use("*", (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`\n⚠️  [${timestamp}] 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: "Endpoint не найден",
    timestamp: timestamp,
    path: req.originalUrl,
  });
});

// Запуск сервера
async function startServer() {
  try {
    // Проверяем подключение к базе данных
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error("❌ Не удалось подключиться к базе данных. Сервер не будет запущен.");
      process.exit(1);
    }

    // Запускаем сервер
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Backend сервер запущен на порту ${PORT}`);
      console.log(`📡 API доступно по адресу: http://localhost:${PORT}/api`);
      console.log(`🌐 Внешний API: ${process.env.BACKEND_URL || `http://localhost:${PORT}`}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("❌ Ошибка запуска сервера:", error);
    process.exit(1);
  }
}

// Обработка сигналов завершения
process.on("SIGTERM", () => {
  console.log("📴 Получен сигнал SIGTERM. Завершение работы сервера...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("📴 Получен сигнал SIGINT. Завершение работы сервера...");
  process.exit(0);
});

// Запуск сервера только если файл запущен напрямую
if (require.main === module) {
  startServer();
}

module.exports = app;
