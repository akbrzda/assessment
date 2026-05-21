const { Queue, Worker } = require("bullmq");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");
const { getRedisConnectionOptionsForBull } = require("./redisService");

const QUEUE_NAME = "gamification-answer-events";

let queue = null;
let worker = null;
let fallbackDrainTimer = null;

const FALLBACK_QUEUE_FILE_PATH = path.resolve(process.cwd(), "logs", "gamification-fallback-queue.jsonl");

function ensureFallbackFileDirectory() {
  const dirPath = path.dirname(FALLBACK_QUEUE_FILE_PATH);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function appendToPersistentFallback(payload, reason) {
  try {
    ensureFallbackFileDirectory();
    const record = JSON.stringify({
      payload,
      enqueuedAt: new Date().toISOString(),
      reason: String(reason || "unknown"),
    });
    fs.appendFileSync(FALLBACK_QUEUE_FILE_PATH, `${record}\n`, { encoding: "utf8" });
    logger.warn("Событие геймификации сохранено в persistent fallback: %s", FALLBACK_QUEUE_FILE_PATH);
  } catch (error) {
    logger.error("Не удалось записать persistent fallback очереди геймификации: %s", error.message);
  }
}

function readPersistentFallbackRecords() {
  if (!fs.existsSync(FALLBACK_QUEUE_FILE_PATH)) {
    return [];
  }

  const content = fs.readFileSync(FALLBACK_QUEUE_FILE_PATH, { encoding: "utf8" });
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const records = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && parsed.payload && typeof parsed.payload === "object") {
        records.push(parsed);
      }
    } catch (error) {
      logger.warn("Пропущена поврежденная запись fallback очереди: %s", error.message);
    }
  }

  return records;
}

function truncatePersistentFallback() {
  if (!fs.existsSync(FALLBACK_QUEUE_FILE_PATH)) {
    return;
  }

  fs.writeFileSync(FALLBACK_QUEUE_FILE_PATH, "", { encoding: "utf8" });
}

async function drainPersistentFallback() {
  const records = readPersistentFallbackRecords();
  if (!records.length) {
    return;
  }

  const activeQueue = ensureQueue();
  for (const record of records) {
    await activeQueue.add("answer_event", record.payload);
  }

  truncatePersistentFallback();
  logger.info("Восстановлено %d событий из persistent fallback очереди геймификации", records.length);
}

function startFallbackDrain() {
  if (fallbackDrainTimer) {
    return;
  }

  fallbackDrainTimer = setInterval(() => {
    drainPersistentFallback().catch((error) => {
      logger.warn("Не удалось обработать fallback очередь геймификации: %s", error.message);
    });
  }, 10000);
}

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
    startFallbackDrain();
  });

  return worker;
}

async function enqueueAnswerEvent(payload) {
  try {
    const activeQueue = ensureQueue();
    await activeQueue.add("answer_event", payload);
  } catch (error) {
    await appendToPersistentFallback(payload, error.message);
  }
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
