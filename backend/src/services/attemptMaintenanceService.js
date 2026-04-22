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
      logger.error("Ошибка автозавершения попыток: %s", error.message);
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
