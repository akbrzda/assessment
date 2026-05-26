const { Queue, Worker } = require("bullmq");
const logger = require("../../utils/logger");
const { getRedisConnectionOptionsForBull } = require("../redisService");
const scheduler = require("./notificationScheduler");

const QUEUE_NAME = "notifications-jobs";
const REPEATABLE_JOBS = [
  { name: "process_pending", everyMs: 5 * 60 * 1000 },
  { name: "retry_failed", everyMs: 30 * 60 * 1000 },
  { name: "schedule_reminders", everyMs: 4 * 60 * 60 * 1000 },
  { name: "deadline_reminders", cron: "0 9 * * *" },
  { name: "retry_certificates", everyMs: 15 * 60 * 1000 },
];

const STATE_KEY = "__assessmentNotificationQueueState";
const state = global[STATE_KEY] || { queue: null, worker: null, started: false };
global[STATE_KEY] = state;

function ensureQueue() {
  if (state.queue) {
    return state.queue;
  }
  state.queue = new Queue(QUEUE_NAME, {
    connection: getRedisConnectionOptionsForBull(),
    defaultJobOptions: {
      removeOnComplete: 1000,
      removeOnFail: 1000,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    },
  });
  return state.queue;
}

async function processJob(name) {
  if (name === "process_pending") return scheduler.processPendingNotifications();
  if (name === "retry_failed") return scheduler.retryFailedNotifications();
  if (name === "schedule_reminders") return scheduler.scheduleReminders();
  if (name === "deadline_reminders") return scheduler.deadlineReminders();
  if (name === "retry_certificates") return scheduler.retryCertificates();
}

async function registerRepeatableJobs(queue) {
  for (const job of REPEATABLE_JOBS) {
    const jobId = `repeatable:${job.name}`;
    if (job.cron) {
      await queue.add(job.name, {}, { jobId, repeat: { pattern: job.cron } });
    } else {
      await queue.add(job.name, {}, { jobId, repeat: { every: job.everyMs } });
    }
  }
}

async function startNotificationQueue() {
  if (state.started) {
    logger.warn("Очередь уведомлений уже запущена, повторный запуск пропущен");
    return true;
  }

  try {
    const queue = ensureQueue();
    state.worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        await processJob(job.name);
      },
      {
        connection: getRedisConnectionOptionsForBull(),
        concurrency: 1,
      },
    );

    state.worker.on("failed", (job, error) => {
      logger.error("Очередь уведомлений: ошибка job=%s id=%s: %s", job?.name, job?.id, error.message);
    });
    state.worker.on("ready", () => {
      logger.info("Очередь уведомлений: worker запущен");
    });

    await registerRepeatableJobs(queue);
    await queue.add("process_pending", {}, { jobId: `boot:process_pending:${Date.now()}` });

    state.started = true;
    logger.info("Очередь уведомлений: repeatable jobs зарегистрированы");
    return true;
  } catch (error) {
    logger.warn("Очередь уведомлений не запущена: %s", error.message);
    return false;
  }
}

module.exports = {
  startNotificationQueue,
};
