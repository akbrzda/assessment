const { Queue, Worker } = require("bullmq");
const logger = require("../utils/logger");
const { getRedisConnectionOptionsForBull } = require("./redisService");

const QUEUE_NAME = "gamification-answer-events";

let queue = null;
let worker = null;
let queueEnabled = false;

function ensureQueue() {
  if (queue) {
    return queue;
  }

  try {
    queue = new Queue(QUEUE_NAME, {
      connection: getRedisConnectionOptionsForBull(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 300,
        },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    });
    queueEnabled = true;
  } catch (error) {
    queueEnabled = false;
    logger.warn("Очередь геймификации недоступна, fallback на setImmediate: %s", error.message);
  }

  return queue;
}

function startGamificationWorker() {
  if (worker) {
    return worker;
  }

  try {
    worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        const gamificationService = require("./gamificationService");
        await gamificationService.processAnswerEvent(job.data);
      },
      {
        connection: getRedisConnectionOptionsForBull(),
        concurrency: 10,
      }
    );

    worker.on("failed", (job, error) => {
      logger.error("Ошибка обработки job очереди геймификации jobId=%s: %s", job?.id, error.message);
    });

    worker.on("ready", () => {
      logger.info("Worker очереди геймификации запущен");
    });

    queueEnabled = true;
  } catch (error) {
    queueEnabled = false;
    logger.warn("Не удалось запустить worker очереди геймификации: %s", error.message);
  }

  return worker;
}

async function enqueueAnswerEvent(payload) {
  const activeQueue = ensureQueue();

  if (queueEnabled && activeQueue) {
    try {
      await activeQueue.add("answer_event", payload);
      return;
    } catch (error) {
      logger.warn("Не удалось добавить событие в очередь, fallback на setImmediate: %s", error.message);
      queueEnabled = false;
    }
  }

  setImmediate(() => {
    const gamificationService = require("./gamificationService");
    gamificationService.processAnswerEvent(payload).catch((gerr) => {
      logger.error("Gamification answer fallback failed for attempt %s: %s", payload.attemptId, gerr.message);
    });
  });
}

async function getQueueDepth() {
  const activeQueue = ensureQueue();
  if (!queueEnabled || !activeQueue) {
    return null;
  }

  try {
    const counts = await activeQueue.getJobCounts("wait", "active", "delayed", "failed");
    return (counts.wait || 0) + (counts.active || 0) + (counts.delayed || 0);
  } catch {
    return null;
  }
}

function isQueueEnabled() {
  return queueEnabled;
}

module.exports = {
  startGamificationWorker,
  enqueueAnswerEvent,
  getQueueDepth,
  isQueueEnabled,
};
