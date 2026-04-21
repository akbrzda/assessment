require("./config/env");
const http = require("http");
const config = require("./config/env");
const logger = require("./utils/logger");
const { healthCheck } = require("./config/database");
const app = require("./app");
const { initWebSocket } = require("./services/websocketService");
const { startAttemptMaintenance } = require("./services/attemptMaintenanceService");

async function bootstrap() {
  try {
    await healthCheck();

    const server = http.createServer(app);
    initWebSocket(server);
    startAttemptMaintenance();

    server.listen(config.port, () => {
      logger.info(`Server listening on port ${config.port}`);
    });
  } catch (error) {
    logger.error("Failed to start server", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      errno: error.errno,
    });
    console.error("❌ Startup Error:", error);
    process.exit(1);
  }
}

bootstrap();
