const { logAndSend, buildActorFromRequest } = require("../../../services/auditService");
const positionsRepository = require("./repository");
const {
  validatePositionPayload,
  normalizeVisibilityFlag,
} = require("./validators");

async function getPositions({ search }) {
  return positionsRepository.listPositions({ search });
}

async function getPositionById(positionId) {
  const position = await positionsRepository.findPositionById(positionId);
  if (!position) {
    const error = new Error("Должность не найдена");
    error.status = 404;
    throw error;
  }

  const stats = await positionsRepository.getPositionStats(positionId);
  return {
    ...position,
    ...stats,
  };
}

async function createPosition(payload, req) {
  const data = validatePositionPayload(payload);

  const existing = await positionsRepository.findByName(data.name);
  if (existing) {
    const error = new Error("Должность с таким названием уже существует");
    error.status = 400;
    throw error;
  }

  const positionId = await positionsRepository.createPosition(data);

  await logAndSend({
    req,
    actor: buildActorFromRequest(req),
    action: "position.created",
    entity: "position",
    entityId: positionId,
    metadata: {
      name: data.name,
      isVisibleInMiniapp: data.isVisibleInMiniapp,
    },
  });

  return {
    positionId,
    message: "Должность создана успешно",
  };
}

async function updatePosition(positionId, payload, req) {
  const existing = await positionsRepository.findPositionById(positionId);
  if (!existing) {
    const error = new Error("Должность не найдена");
    error.status = 404;
    throw error;
  }

  const data = validatePositionPayload(payload);
  data.isVisibleInMiniapp = normalizeVisibilityFlag(
    payload?.isVisibleInMiniapp,
    existing.is_visible_in_miniapp === 1,
  );

  const duplicate = await positionsRepository.findByName(data.name, {
    excludeId: positionId,
  });

  if (duplicate) {
    const error = new Error("Должность с таким названием уже существует");
    error.status = 400;
    throw error;
  }

  await positionsRepository.updatePosition(positionId, data);

  await logAndSend({
    req,
    actor: buildActorFromRequest(req),
    action: "position.updated",
    entity: "position",
    entityId: positionId,
    metadata: {
      previousName: existing.name,
      name: data.name,
      previousVisibility: existing.is_visible_in_miniapp === 1,
      isVisibleInMiniapp: data.isVisibleInMiniapp,
    },
  });

  return {
    message: "Должность обновлена успешно",
  };
}

async function deletePosition(positionId, req) {
  const existing = await positionsRepository.findPositionById(positionId);
  if (!existing) {
    const error = new Error("Должность не найдена");
    error.status = 404;
    throw error;
  }

  const usersCount = await positionsRepository.countUsersByPosition(positionId);
  if (usersCount > 0) {
    const error = new Error(
      `Невозможно удалить должность. ${usersCount} сотрудников используют ее.`,
    );
    error.status = 400;
    throw error;
  }

  await positionsRepository.deletePosition(positionId);

  await logAndSend({
    req,
    actor: buildActorFromRequest(req),
    action: "position.deleted",
    entity: "position",
    entityId: positionId,
    metadata: {
      name: existing.name,
    },
  });
}

module.exports = {
  getPositions,
  getPositionById,
  createPosition,
  updatePosition,
  deletePosition,
};

