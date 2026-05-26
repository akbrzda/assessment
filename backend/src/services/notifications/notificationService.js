const repository = require("./repository");

/**
 * Создаёт запись уведомления в очереди.
 * Возвращает id созданной записи или null при дублировании.
 */
async function create({ userId, type, entityType = null, entityId = null, payload = null }) {
  const existing = await repository.findDuplicateActive({ userId, type, entityType, entityId });
  if (existing) {
    return null;
  }

  const payloadJson = payload ? JSON.stringify(payload) : null;
  return repository.insertNotification({ userId, type, entityType, entityId, payloadJson });
}

/**
 * Выбирает pending уведомления для отправки.
 * Включает данные пользователя для проверки тихих часов.
 */
async function findPending(limit = 100) {
  return repository.findPending(limit);
}

/**
 * Выбирает failed уведомления для повторной попытки (attempt_count < 3).
 */
async function findFailed(limit = 50) {
  return repository.findFailed(limit);
}

/**
 * Обновляет статус уведомления.
 * При blocked — также отключает уведомления пользователю.
 */
async function updateStatus(id, status, { errorMessage = null } = {}) {
  await repository.updateStatus(id, status, { errorMessage });

  if (status === "blocked") {
    const userId = await repository.findUserIdByNotificationId(id);
    if (userId) {
      await repository.disableUserNotificationsById(userId);
    }
  }
}

/**
 * Помечает уведомление как skipped (тихие часы, уже неактуально).
 */
async function skip(id) {
  await repository.skip(id);
}

/**
 * Считает количество уведомлений типа new_course, отправленных пользователю сегодня.
 * Используется для ограничения: не более 3 уведомлений о новых курсах в день.
 */
async function countNewCourseTodayForUser(userId) {
  return repository.countNewCourseTodayForUser(userId);
}

module.exports = { create, findPending, findFailed, updateStatus, skip, countNewCourseTodayForUser };
