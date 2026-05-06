const { logAndSend } = require("./auditService");

// Адаптер для устаревшей сигнатуры createLog(userId, action, description, entityType, entityId, req).
// Делегирует в auditService.logAndSend.
async function createLog(userId, action, description, entityType, entityId, req) {
  await logAndSend({
    req: req || null,
    actor: { id: userId ?? null },
    scope: "admin_panel",
    action: [entityType, String(action || "action").toLowerCase()].filter(Boolean).join("."),
    entity: entityType || null,
    entityId: entityId || null,
    metadata: description ? { description } : {},
  });
}

module.exports = {
  createLog,
};
