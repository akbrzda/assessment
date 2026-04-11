function parsePositionId(value) {
  const positionId = Number(value);
  if (!Number.isInteger(positionId) || positionId <= 0) {
    const error = new Error("Некорректный идентификатор должности");
    error.status = 400;
    throw error;
  }
  return positionId;
}

function parseSearch(value) {
  if (value == null) {
    return "";
  }
  return String(value).trim();
}

function normalizeVisibilityFlag(value, defaultValue = true) {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value === 1;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }
  return Boolean(value);
}

function validatePositionPayload(payload) {
  const rawName = payload?.name;
  if (!rawName || String(rawName).trim().length === 0) {
    const error = new Error("Название должности обязательно");
    error.status = 400;
    throw error;
  }

  return {
    name: String(rawName).trim(),
    isVisibleInMiniapp: normalizeVisibilityFlag(payload?.isVisibleInMiniapp),
  };
}

module.exports = {
  parsePositionId,
  parseSearch,
  normalizeVisibilityFlag,
  validatePositionPayload,
};
