const Joi = require("joi");

const setItemSchema = Joi.object({
  key: Joi.string().trim().min(1).max(128).required(),
  value: Joi.string().allow("").required(),
});

function getTelegramId(req) {
  const telegramUser = req.telegramInitData?.user;
  if (!telegramUser?.id) {
    const error = new Error("Telegram user is required");
    error.status = 401;
    throw error;
  }

  return String(telegramUser.id);
}

function validateSetItemPayload(payload) {
  const { error, value } = setItemSchema.validate(payload, { abortEarly: false });
  if (error) {
    const validationError = new Error(error.details.map((detail) => detail.message).join(", "));
    validationError.status = 422;
    throw validationError;
  }

  return value;
}

function validateStorageKey(storageKey) {
  if (storageKey) {
    return storageKey;
  }

  const error = new Error("Storage key is required");
  error.status = 400;
  throw error;
}

module.exports = {
  getTelegramId,
  validateSetItemPayload,
  validateStorageKey,
};
