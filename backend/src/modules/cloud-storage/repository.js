const webAppStorageModel = require("../../models/webAppStorageModel");

async function setItem(payload) {
  return webAppStorageModel.setItem(payload);
}

async function getItem(payload) {
  return webAppStorageModel.getItem(payload);
}

module.exports = {
  setItem,
  getItem,
};
