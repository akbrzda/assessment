const cloudStorageService = require("./service");
const {
  getTelegramId,
  validateSetItemPayload,
  validateStorageKey,
} = require("./validators");

function handleKnownError(error, res) {
  if (!error.status) {
    return false;
  }

  res.status(error.status).json({ error: error.message });
  return true;
}

async function setItem(req, res, next) {
  try {
    const telegramId = getTelegramId(req);
    const payload = validateSetItemPayload(req.body);

    await cloudStorageService.setItem({
      telegramId,
      key: payload.key,
      value: payload.value,
    });

    res.status(204).send();
  } catch (error) {
    if (!handleKnownError(error, res)) {
      next(error);
    }
  }
}

async function getItem(req, res, next) {
  try {
    const telegramId = getTelegramId(req);
    const storageKey = validateStorageKey(req.params.key);
    const value = await cloudStorageService.getItem({ telegramId, key: storageKey });

    if (value == null) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json({ value });
  } catch (error) {
    if (!handleKnownError(error, res)) {
      next(error);
    }
  }
}

module.exports = {
  setItem,
  getItem,
};
