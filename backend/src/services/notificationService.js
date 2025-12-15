const logger = require("../utils/logger");
const domainEventBus = require("../events/domainEventBus");
const userModel = require("../models/userModel");
const notificationModel = require("../models/notificationModel");
const { renderTemplate } = require("./notificationTemplates");
const { sendUserNotification } = require("./telegramNotifier");
const { setNx, getClient, isRedisEnabled } = require("../utils/redisClient");
const { logAuditEvent, buildAuditEntry } = require("./auditService");
const { emitNotification } = require("./websocketService");

const MAX_RETRY = 3;
const RETRY_DELAYS = [30_000, 120_000, 300_000]; // 30s, 2m, 5m
const DEDUPE_TTL_SECONDS = 24 * 60 * 60;
const JOB_STATE_TTL_SECONDS = 7 * 24 * 60 * 60;

const QUEUE_KEY = "notifications:pending";
const JOB_KEY_PREFIX = "notifications:jobs";

const memoryQueue = [];
const activeNotifications = new Set();
let workerRunning = false;
let redisWorkerRunning = false;
let recoveryInterval = null;

function redisAvailable() {
  return Boolean(isRedisEnabled() && getClient());
}

function getJobKey(notificationId) {
  return `${JOB_KEY_PREFIX}:${notificationId}`;
}

async function setJobState(notificationId, state, extra = {}) {
  if (!redisAvailable()) {
    return;
  }
  const redis = getClient();
  if (!redis) {
    return;
  }
  const jobKey = getJobKey(notificationId);
  const payload = {
    status: state,
    updated_at: new Date().toISOString(),
    ...Object.fromEntries(
      Object.entries(extra)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, typeof value === "object" ? JSON.stringify(value) : String(value)])
    ),
  };
  await redis.hset(jobKey, payload);
  if (JOB_STATE_TTL_SECONDS) {
    await redis.expire(jobKey, JOB_STATE_TTL_SECONDS);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveMessage({ templateKey, locale = "ru", message, variables = {} }) {
  if (message) {
    return message;
  }
  if (!templateKey) {
    return null;
  }
  return renderTemplate(templateKey, locale, variables);
}

async function ensureUnique(eventId) {
  if (!eventId) {
    return true;
  }
  const key = `notification:${eventId}`;
  const isNew = await setNx(key, "1", DEDUPE_TTL_SECONDS);
  return isNew;
}

async function enqueue(job) {
  await notificationModel.markQueued(job.notificationId);

  if (redisAvailable()) {
    await enqueueRedis(job);
    startRedisWorker();
    return;
  }
  enqueueMemory(job);
}

function enqueueMemory(job) {
  if (activeNotifications.has(job.notificationId)) {
    return;
  }
  activeNotifications.add(job.notificationId);
  memoryQueue.push(job);
  startWorker();
}

async function enqueueRedis(job) {
  const redis = getClient();
  if (!redis) {
    enqueueMemory(job);
    return;
  }

  const serialized = JSON.stringify({
    ...job,
    enqueuedAt: new Date().toISOString(),
  });

  await setJobState(job.notificationId, "queued", {
    payload: serialized,
    retry_count: job.retryCount || 0,
  });

  await redis.rpush(QUEUE_KEY, serialized);
}

async function processJob(job) {
  const { notificationId, user, chatId, templateKey, locale, message, variables, eventId, metadata, retryCount } = job;

  const usingRedisQueue = redisAvailable();

  if (usingRedisQueue) {
    await setJobState(notificationId, "processing", {
      retry_count: retryCount,
      processing_at: new Date().toISOString(),
    });
  }

  const text = resolveMessage({ templateKey, locale, message, variables });

  if (!text) {
    logger.warn("Notification %s skipped: empty message", notificationId);
    await notificationModel.markFailed(notificationId, "empty message", true);
    if (usingRedisQueue) {
      await setJobState(notificationId, "failed", {
        last_error: "empty message",
        retry_count: retryCount,
      });
    }
    activeNotifications.delete(notificationId);
    return;
  }

  try {
    const sent = await sendUserNotification({
      chatId,
      text,
      templateKey,
      locale,
      variables,
    });

    if (sent) {
      await notificationModel.markDelivered(notificationId);

      if (usingRedisQueue) {
        await setJobState(notificationId, "sent", {
          delivered_at: new Date().toISOString(),
          retry_count: retryCount,
        });
      }

      const auditEntry = buildAuditEntry({
        action: "notification.user.sent",
        scope: "system",
        entity: "user",
        entityId: user?.id || null,
        actor: { id: null, role: "system", name: "NotificationService" },
        metadata: {
          templateKey,
          eventId,
          channel: "telegram",
          chatId,
          delivery: "sent",
        },
      });
      await logAuditEvent(auditEntry, { skipTelegram: false, skipDatabase: false });
      activeNotifications.delete(notificationId);
      return;
    }

    throw new Error("Telegram API responded with failure");
  } catch (error) {
    const permanent = retryCount + 1 >= MAX_RETRY;
    await notificationModel.markFailed(notificationId, error.message, permanent);

    logger.error("Notification %s delivery failed (retry %s/%s): %s", notificationId, retryCount + 1, MAX_RETRY, error.message);

    if (usingRedisQueue) {
      await setJobState(notificationId, permanent ? "failed" : "retrying", {
        last_error: error.message,
        retry_count: retryCount + 1,
      });
    }

    if (!permanent) {
      const delay = RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)];
      activeNotifications.delete(notificationId);
      setTimeout(() => {
        enqueue({
          ...job,
          retryCount: retryCount + 1,
        }).catch((requeueError) => {
          logger.error("Failed to requeue notification %s: %s", notificationId, requeueError.message);
        });
      }, delay);
    } else {
      const auditEntry = buildAuditEntry({
        action: "notification.user.failed",
        scope: "system",
        entity: "user",
        entityId: user?.id || null,
        actor: { id: null, role: "system", name: "NotificationService" },
        metadata: {
          templateKey,
          eventId,
          channel: "telegram",
          chatId,
          delivery: "failed",
          error: error.message,
        },
        result: "error",
      });
      await logAuditEvent(auditEntry, { skipTelegram: false, skipDatabase: false });
      activeNotifications.delete(notificationId);
    }
  }
}

async function workerLoop() {
  if (workerRunning) {
    return;
  }
  workerRunning = true;

  while (memoryQueue.length > 0) {
    const job = memoryQueue.shift();
    // eslint-disable-next-line no-await-in-loop
    await processJob(job);
  }

  workerRunning = false;
}

function startWorker() {
  if (!workerRunning) {
    setImmediate(workerLoop);
  }
}

function startRedisWorker() {
  if (redisWorkerRunning || !redisAvailable()) {
    return;
  }
  redisWorkerLoop().catch((error) => {
    redisWorkerRunning = false;
    logger.error("Redis worker crashed: %s", error.message);
  });
}

async function redisWorkerLoop() {
  if (redisWorkerRunning) {
    return;
  }
  const redis = getClient();
  if (!redis) {
    return;
  }

  redisWorkerRunning = true;

  while (redisAvailable()) {
    try {
      const result = await redis.blpop(QUEUE_KEY, 5);
      if (!result || result.length < 2) {
        continue;
      }
      const [, payload] = result;

      let job;
      try {
        job = JSON.parse(payload);
      } catch (parseError) {
        logger.error("Failed to parse notification job payload: %s", parseError.message);
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      await processJob(job);
    } catch (error) {
      logger.error("Redis queue processing error: %s", error.message);
      // eslint-disable-next-line no-await-in-loop
      await sleep(2000);
    }
  }

  redisWorkerRunning = false;
}

async function queueUserNotification({ user, templateKey, locale = "ru", variables = {}, message = null, eventId = null, metadata = {} }) {
  if (!user) {
    return;
  }

  const chatId = user.telegramId;

  if (!chatId) {
    const auditEntry = buildAuditEntry({
      action: "notification.user.skipped",
      scope: "system",
      entity: "user",
      entityId: user.id,
      actor: { id: null, role: "system", name: "NotificationService" },
      metadata: {
        templateKey,
        reason: "missing telegramId",
        eventId,
      },
      result: "warning",
    });
    await logAuditEvent(auditEntry, { skipTelegram: false, skipDatabase: false });
    return;
  }

  const isUnique = await ensureUnique(eventId);
  if (!isUnique) {
    logger.info("Notification deduplicated by eventId %s", eventId);
    return;
  }

  const text = resolveMessage({ templateKey, locale, message, variables });

  const notificationId = await notificationModel.createNotification({
    userId: user.id,
    chatId,
    templateKey,
    locale,
    message: text || "",
    status: "queued",
    eventId,
    metadata,
  });

  // Отправляем уведомление через WebSocket
  try {
    emitNotification(user.id, {
      id: notificationId,
      templateKey,
      message: text,
      status: "queued",
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to emit notification via WebSocket: %s", error.message);
  }

  await enqueue({
    notificationId,
    user,
    chatId,
    templateKey,
    locale,
    message: text,
    variables,
    eventId,
    metadata,
    retryCount: 0,
  });
}

async function handleAssessmentOpened(event) {
  const { assessment, userIds = [], locale = "ru" } = event;

  if (!assessment || userIds.length === 0) {
    return;
  }

  const users = await userModel.findByIds(userIds);

  await Promise.all(
    users.map((user) =>
      queueUserNotification({
        user,
        templateKey: "assessment.opened",
        locale,
        variables: {
          assessmentTitle: assessment.title,
          deadline: new Date(assessment.closeAt).toLocaleString("ru-RU"),
          timeLimit: assessment.timeLimitMinutes,
        },
        eventId: `assessment_opened_${assessment.id}_${user.id}`,
        metadata: {
          assessmentId: assessment.id,
          trigger: "opened",
        },
      })
    )
  );

  const auditEntry = buildAuditEntry({
    action: "notification.batch.sent",
    scope: "system",
    entity: "assessment",
    entityId: assessment.id,
    actor: { id: null, role: "system", name: "NotificationScheduler" },
    metadata: {
      count: users.length,
      templateKey: "assessment.opened",
    },
  });
  await logAuditEvent(auditEntry, { skipTelegram: false, skipDatabase: false });
}

async function handleAssessmentDeadline(event) {
  const { assessment, userIds = [], locale = "ru", window } = event;

  if (!assessment || userIds.length === 0 || !window) {
    return;
  }

  const users = await userModel.findByIds(userIds);

  await Promise.all(
    users.map((user) =>
      queueUserNotification({
        user,
        templateKey: "assessment.deadline",
        locale,
        variables: {
          assessmentTitle: assessment.title,
          deadline: new Date(assessment.closeAt).toLocaleString("ru-RU"),
          timeRemaining: window.label,
        },
        eventId: `assessment_deadline_${assessment.id}_${user.id}_${window.slug}`,
        metadata: {
          assessmentId: assessment.id,
          trigger: "deadline",
          window: {
            label: window.label,
            minutes: window.minutes,
          },
        },
      })
    )
  );

  const auditEntry = buildAuditEntry({
    action: "notification.batch.sent",
    scope: "system",
    entity: "assessment",
    entityId: assessment.id,
    actor: { id: null, role: "system", name: "NotificationScheduler" },
    metadata: {
      count: users.length,
      templateKey: "assessment.deadline",
      window: {
        label: window.label,
        minutes: window.minutes,
      },
    },
  });
  await logAuditEvent(auditEntry, { skipTelegram: false, skipDatabase: false });
}

async function handleAssessmentCreated(event) {
  const { assessment, userIds = [], locale = "ru" } = event;

  if (!assessment || userIds.length === 0) {
    return;
  }

  const users = await userModel.findByIds(userIds);

  await Promise.all(
    users.map((user) =>
      queueUserNotification({
        user,
        templateKey: "assessment.created",
        locale,
        variables: {
          assessmentTitle: assessment.title,
          openAt: new Date(assessment.openAt).toLocaleString("ru-RU"),
          closeAt: new Date(assessment.closeAt).toLocaleString("ru-RU"),
          timeLimit: assessment.timeLimitMinutes,
        },
        eventId: `assessment_created_${assessment.id}_${user.id}`,
        metadata: {
          assessmentId: assessment.id,
          trigger: "created",
        },
      })
    )
  );

  const auditEntry = buildAuditEntry({
    action: "notification.batch.sent",
    scope: "system",
    entity: "assessment",
    entityId: assessment.id,
    actor: { id: null, role: "system", name: "NotificationService" },
    metadata: {
      count: users.length,
      templateKey: "assessment.created",
    },
  });
  await logAuditEvent(auditEntry, { skipTelegram: false, skipDatabase: false });
}

async function handleAssessmentCompleted(event) {
  const { creator, performer, assessment, scorePercent, passed, attemptId, locale = "ru" } = event;

  if (!creator || !creator.telegramId) {
    return;
  }

  const performerName = performer ? `${performer.firstName || ""} ${performer.lastName || ""}`.trim() : "Сотрудник";
  const resultLabel = passed ? "успешно" : "неуспешно";

  await queueUserNotification({
    user: {
      id: creator.id,
      telegramId: creator.telegramId,
    },
    templateKey: "assessment.completed",
    locale,
    variables: {
      assessmentTitle: assessment?.title || "",
      performerName,
      scorePercent,
      resultLabel,
    },
    eventId: `assessment_completed_${attemptId || `${assessment?.id || "unknown"}_${performer?.id || "user"}`}`,
    metadata: {
      assessmentId: assessment?.id || null,
      performerId: performer?.id || null,
      attemptId: attemptId || null,
      scorePercent,
      passed,
    },
  });
}

async function handleDirectUserNotification(event) {
  const {
    userId,
    user: userPayload = null,
    chatId: explicitChatId = null,
    templateKey,
    locale = "ru",
    variables = {},
    message = null,
    eventId = null,
    metadata = {},
  } = event;

  const user = userPayload || (userId ? await userModel.findById(userId) : null);

  if (!user && !explicitChatId) {
    return;
  }

  await queueUserNotification({
    user: user || (explicitChatId ? { id: userId || null, telegramId: explicitChatId } : null),
    templateKey,
    locale,
    variables,
    message,
    eventId,
    metadata,
  });
}

async function recoverPendingNotifications() {
  try {
    const queued = await notificationModel.listQueued(100);
    for (const row of queued) {
      if (redisAvailable()) {
        const redis = getClient();
        if (redis) {
          // eslint-disable-next-line no-await-in-loop
          const status = await redis.hget(getJobKey(row.id), "status");
          if (status && ["queued", "processing", "retrying"].includes(status)) {
            continue;
          }
        }
      }
      // eslint-disable-next-line no-await-in-loop
      await enqueue({
        notificationId: row.id,
        user: {
          id: row.user_id || null,
          telegramId: row.chat_id,
        },
        chatId: row.chat_id,
        templateKey: row.template_key,
        locale: row.locale || "ru",
        message: row.message,
        variables: {},
        eventId: row.event_id,
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        retryCount: row.retry_count || 0,
      });
    }
  } catch (error) {
    logger.error("Failed to recover queued notifications: %s", error.message);
  }
}

function initNotificationService() {
  domainEventBus.subscribe("notification.assessment.opened", handleAssessmentOpened);
  domainEventBus.subscribe("notification.assessment.deadline", handleAssessmentDeadline);
  domainEventBus.subscribe("notification.assessment.created", handleAssessmentCreated);
  domainEventBus.subscribe("notification.assessment.completed", handleAssessmentCompleted);
  domainEventBus.subscribe("notification.user.direct", handleDirectUserNotification);

  recoverPendingNotifications();

  if (!recoveryInterval) {
    recoveryInterval = setInterval(recoverPendingNotifications, 5 * 60 * 1000);
  }

  const redis = getClient();
  if (redis && isRedisEnabled()) {
    redis.on("error", (error) => {
      logger.error("Redis error in notification service: %s", error.message);
    });
  }

  startRedisWorker();

  logger.info("Notification service initialized (Redis: %s)", isRedisEnabled() ? "enabled" : "disabled");
}

async function retryNotification(notificationId, { regenerateEventId = false } = {}) {
  const record = await notificationModel.findById(notificationId);
  if (!record) {
    const error = new Error("Notification not found");
    error.status = 404;
    throw error;
  }

  if (!record.chat_id) {
    const error = new Error("Notification does not have a Telegram chat_id");
    error.status = 400;
    throw error;
  }

  const metadata = record.metadata
    ? (() => {
        try {
          return JSON.parse(record.metadata);
        } catch (err) {
          return {};
        }
      })()
    : {};
  const nextRetryCount = (record.retry_count || 0) + 1;

  await notificationModel.requeueNotification(notificationId);

  if (redisAvailable()) {
    await setJobState(notificationId, "queued", {
      retry_count: nextRetryCount,
      last_error: null,
    });
  }

  await enqueue({
    notificationId,
    user: {
      id: record.user_id || null,
      telegramId: record.chat_id,
    },
    chatId: record.chat_id,
    templateKey: record.template_key,
    locale: record.locale || "ru",
    message: record.message,
    variables: {},
    eventId: regenerateEventId || !record.event_id ? `${record.event_id || "manual"}_${Date.now()}` : record.event_id,
    metadata,
    retryCount: nextRetryCount,
  });
}

module.exports = {
  initNotificationService,
  queueUserNotification,
  retryNotification,
};
