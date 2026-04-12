function parseBranchId(value) {
  const branchId = Number(value);
  if (!Number.isInteger(branchId) || branchId <= 0) {
    const error = new Error("Некорректный идентификатор филиала");
    error.status = 400;
    throw error;
  }
  return branchId;
}

function parseUserId(value) {
  const userId = Number(value);
  if (!Number.isInteger(userId) || userId <= 0) {
    const error = new Error("ID пользователя обязателен");
    error.status = 400;
    throw error;
  }
  return userId;
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

function normalizeBranchPayload(payload, options = {}) {
  const rawName = payload?.name;
  if (!rawName || String(rawName).trim().length === 0) {
    const error = new Error("Название филиала обязательно");
    error.status = 400;
    throw error;
  }

  return {
    name: String(rawName).trim(),
    city: payload?.city ? String(payload.city).trim() : null,
    isVisibleInMiniapp: normalizeVisibilityFlag(
      payload?.isVisibleInMiniapp,
      options.defaultVisibility ?? true,
    ),
  };
}

function normalizeSearch(value) {
  if (value == null) {
    return "";
  }
  return String(value).trim();
}

function normalizeBranchIds(value) {
  if (!Array.isArray(value) || value.length === 0) {
    const error = new Error("ID пользователя и список филиалов обязательны");
    error.status = 400;
    throw error;
  }

  const normalized = value.map((item) => Number(item));
  const invalid = normalized.some((item) => !Number.isInteger(item) || item <= 0);
  if (invalid) {
    const error = new Error("Список филиалов содержит некорректные значения");
    error.status = 400;
    throw error;
  }

  return [...new Set(normalized)];
}

module.exports = {
  parseBranchId,
  parseUserId,
  normalizeBranchPayload,
  normalizeSearch,
  normalizeBranchIds,
};
