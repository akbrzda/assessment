const handlers = require("./question-bank.handlers.js");

async function getCategories(req, res, next) {
  return handlers.getCategories(req, res, next);
}

async function createCategory(req, res, next) {
  return handlers.createCategory(req, res, next);
}

async function updateCategory(req, res, next) {
  return handlers.updateCategory(req, res, next);
}

async function deleteCategory(req, res, next) {
  return handlers.deleteCategory(req, res, next);
}

async function getQuestions(req, res, next) {
  return handlers.getQuestions(req, res, next);
}

async function getQuestionById(req, res, next) {
  return handlers.getQuestionById(req, res, next);
}

async function createQuestion(req, res, next) {
  return handlers.createQuestion(req, res, next);
}

async function updateQuestion(req, res, next) {
  return handlers.updateQuestion(req, res, next);
}

async function deleteQuestion(req, res, next) {
  return handlers.deleteQuestion(req, res, next);
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


