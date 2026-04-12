const assessmentsRepository = require("./repository");

async function getAssessments(filters) {
  return assessmentsRepository.listAssessments(filters);
}

async function getAssessmentById(assessmentId) {
  const assessment = await assessmentsRepository.findAssessmentById(assessmentId);
  if (!assessment) {
    const error = new Error("Аттестация не найдена");
    error.status = 404;
    throw error;
  }

  const questions = await assessmentsRepository.listAssessmentQuestions(assessmentId);
  for (const question of questions) {
    // Для сохранения текущего API-контракта options остаются вложенными внутри вопроса.
    question.options = await assessmentsRepository.listQuestionOptions(question.id);
  }

  const [assignedUsers, attempts] = await Promise.all([
    assessmentsRepository.listAssignedUsers(assessmentId),
    assessmentsRepository.listAssessmentAttempts(assessmentId),
  ]);

  return {
    assessment: {
      ...assessment,
      questions,
      assignedUsers,
      attempts,
    },
  };
}

module.exports = {
  getAssessments,
  getAssessmentById,
};
