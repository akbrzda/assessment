const questionBankService = require("./question-bank.service");
const { sendLegacyResult } = require("../shared/legacy-handler-adapter");

async function getCategories(req, res, next) {
  try {
    const result = await questionBankService.getCategories(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const result = await questionBankService.createCategory(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    const result = await questionBankService.updateCategory(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const result = await questionBankService.deleteCategory(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getQuestions(req, res, next) {
  try {
    const result = await questionBankService.getQuestions(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getQuestionById(req, res, next) {
  try {
    const result = await questionBankService.getQuestionById(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function createQuestion(req, res, next) {
  try {
    const result = await questionBankService.createQuestion(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function updateQuestion(req, res, next) {
  try {
    const result = await questionBankService.updateQuestion(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function deleteQuestion(req, res, next) {
  try {
    const result = await questionBankService.deleteQuestion(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
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
