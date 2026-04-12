const adminQuestionBankController = require("../../../controllers/adminQuestionBankController");

module.exports = {
  getCategories: adminQuestionBankController.getCategories,
  createCategory: adminQuestionBankController.createCategory,
  updateCategory: adminQuestionBankController.updateCategory,
  deleteCategory: adminQuestionBankController.deleteCategory,
  getQuestions: adminQuestionBankController.getQuestions,
  getQuestionById: adminQuestionBankController.getQuestionById,
  createQuestion: adminQuestionBankController.createQuestion,
  updateQuestion: adminQuestionBankController.updateQuestion,
  deleteQuestion: adminQuestionBankController.deleteQuestion,
};
