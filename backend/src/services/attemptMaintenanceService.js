const assessmentModel = require("../models/assessmentModel");
const logger = require("../utils/logger");

const ATTEMPT_MAINTENANCE_INTERVAL_MS = 60 * 1000;

function startAttemptMaintenance() {
  const run = async () => {
    try {
      const completedCount = await assessmentModel.completeExpiredAttempts();
      if (completedCount > 0) {
        logger.info("Автозавершение попыток: завершено %d записей", completedCount);
      }
    } catch (error) {
      // Временные сетевые ошибки — логируем и продолжаем
      if (
        error.code === "ETIMEDOUT" ||
        error.code === "ECONNRESET" ||
        error.code === "PROTOCOL_CONNECTION_LOST" ||
        error.code === "EADDRNOTAVAIL"
      ) {
        logger.warn(
          "Автозавершение попыток: временный сбой соединения (%s), следующая попытка через %ds",
          error.code,
          ATTEMPT_MAINTENANCE_INTERVAL_MS / 1000,
        );
      } else {
        logger.error("Ошибка автозавершения попыток: %s", error.message);
      }
    }
  };

  run();
  const timer = setInterval(run, ATTEMPT_MAINTENANCE_INTERVAL_MS);
  if (typeof timer.unref === "function") {
    timer.unref();
  }

  return timer;
}

module.exports = {
  startAttemptMaintenance,
};
