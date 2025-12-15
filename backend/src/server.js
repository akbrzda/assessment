require("./config/env");
const http = require("http");
const config = require("./config/env");
const logger = require("./utils/logger");
const { healthCheck } = require("./config/database");
const app = require("./app");
const { initWebSocket } = require("./services/websocketService");

async function bootstrap() {
  try {
    await healthCheck();

    // Создаём HTTP сервер для интеграции с Socket.IO
    const server = http.createServer(app);

    // Инициализация WebSocket
    initWebSocket(server);

    server.listen(config.port, () => {
      logger.info(`Server listening on port ${config.port}`);
    });
  } catch (error) {
    logger.error("Failed to start server: %s", error.message);
    process.exit(1);
  }
}

bootstrap();
