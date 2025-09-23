const Joi = require('joi');
const webAppStorageModel = require('../models/webAppStorageModel');

const setSchema = Joi.object({
  key: Joi.string().trim().min(1).max(128).required(),
  value: Joi.string().allow('').required()
});

function getTelegramId(req) {
  const telegramUser = req.telegramInitData?.user;
  if (!telegramUser?.id) {
    const error = new Error('Telegram user is required');
    error.status = 401;
    throw error;
  }
  return String(telegramUser.id);
}

async function setItem(req, res, next) {
  try {
    const telegramId = getTelegramId(req);
    const { error, value } = setSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(', ') });
    }

    await webAppStorageModel.setItem({ telegramId, key: value.key, value: value.value });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function getItem(req, res, next) {
  try {
    const telegramId = getTelegramId(req);
    const storageKey = req.params.key;
    if (!storageKey) {
      return res.status(400).json({ error: 'Storage key is required' });
    }

    const value = await webAppStorageModel.getItem({ telegramId, key: storageKey });
    if (value == null) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({ value });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  setItem,
  getItem
};
