const cloudStorageRepository = require("./repository");

async function setItem({ telegramId, key, value }) {
  await cloudStorageRepository.setItem({ telegramId, key, value });
}

async function getItem({ telegramId, key }) {
  return cloudStorageRepository.getItem({ telegramId, key });
}

module.exports = {
  setItem,
  getItem,
};
