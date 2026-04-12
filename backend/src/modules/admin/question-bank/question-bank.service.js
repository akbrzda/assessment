const handlers = require("./question-bank.handlers.js");
const { runLegacyHandler } = require("../shared/legacy-handler-adapter");

async function getCategories(req) {
  return runLegacyHandler(handlers.getCategories, req);
}

async function createCategory(req) {
  return runLegacyHandler(handlers.createCategory, req);
}

async function updateCategory(req) {
  return runLegacyHandler(handlers.updateCategory, req);
}

async function deleteCategory(req) {
  return runLegacyHandler(handlers.deleteCategory, req);
}

async function getQuestions(req) {
  return runLegacyHandler(handlers.getQuestions, req);
}

async function getQuestionById(req) {
  return runLegacyHandler(handlers.getQuestionById, req);
}

async function createQuestion(req) {
  return runLegacyHandler(handlers.createQuestion, req);
}

async function updateQuestion(req) {
  return runLegacyHandler(handlers.updateQuestion, req);
}

async function deleteQuestion(req) {
  return runLegacyHandler(handlers.deleteQuestion, req);
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
};
