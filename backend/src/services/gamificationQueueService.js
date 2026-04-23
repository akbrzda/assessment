const { Queue, Worker } = require("bullmq");
const logger = require("../utils/logger");
const { getRedisConnectionOptionsForBull } = require("./redisService");

const QUEUE_NAME = "gamification-answer-events";

let queue = null;
let worker = null;

function ensureQueue() {
  if (queue) {
    return queue;
  }

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

  return queue;
}

function startGamificationWorker() {
  if (worker) {
    return worker;
  }

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

  return worker;
}

async function enqueueAnswerEvent(payload) {
  const activeQueue = ensureQueue();
  await activeQueue.add("answer_event", payload);
}

async function getQueueDepth() {
  const activeQueue = ensureQueue();
  const counts = await activeQueue.getJobCounts("wait", "active", "delayed", "failed");
  return (counts.wait || 0) + (counts.active || 0) + (counts.delayed || 0);
}

function isQueueEnabled() {
  return Boolean(queue && worker);
}

module.exports = {
  startGamificationWorker,
  enqueueAnswerEvent,
  getQueueDepth,
  isQueueEnabled,
};
