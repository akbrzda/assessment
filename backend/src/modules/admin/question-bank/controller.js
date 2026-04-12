const questionBankService = require("./service");

async function getCategories(req, res, next) {
  try {
    return await questionBankService.getCategories(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    return await questionBankService.createCategory(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    return await questionBankService.updateCategory(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function deleteCategory(req, res, next) {
  try {
    return await questionBankService.deleteCategory(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getQuestions(req, res, next) {
  try {
    return await questionBankService.getQuestions(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getQuestionById(req, res, next) {
  try {
    return await questionBankService.getQuestionById(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function createQuestion(req, res, next) {
  try {
    return await questionBankService.createQuestion(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function updateQuestion(req, res, next) {
  try {
    return await questionBankService.updateQuestion(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function deleteQuestion(req, res, next) {
  try {
    return await questionBankService.deleteQuestion(req, res, next);
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




