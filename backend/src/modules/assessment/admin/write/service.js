const { pool } = require("../../../../config/database");
const repository = require("./repository");
const assessmentModel = require("../../../../models/assessmentModel");
const logger = require("../../../../utils/logger");

// ─── Private helpers ─────────────────────────────────────────────────────────

function createError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function toMySqlDateTime(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Парсит selected_option_ids из JSON-строки с учётом типа вопроса.
 */
function parseSelectedOptions(questionType, selectedOptionIds) {
  if (!selectedOptionIds) {
    return { selectedOptionIds: [], selectedMatchPairs: null };
  }
  try {
    const parsed = JSON.parse(selectedOptionIds);
    if (questionType === "matching") {
      const matchPairs = {};
      if (
        Array.isArray(parsed) &&
        parsed.length &&
        typeof parsed[0] === "object"
      ) {
        parsed.forEach((pair) => {
          const leftId = Number(pair?.leftOptionId);
          const rightId = Number(pair?.rightOptionId);
          if (leftId && rightId) matchPairs[leftId] = rightId;
        });
      } else if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        Object.entries(parsed).forEach(([left, right]) => {
          const leftId = Number(left);
          const rightId = Number(right);
          if (leftId && rightId) matchPairs[leftId] = rightId;
        });
      } else if (Array.isArray(parsed)) {
        return {
          selectedOptionIds: parsed
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0),
          selectedMatchPairs: null,
        };
      }
      return {
        selectedOptionIds: [],
        selectedMatchPairs: Object.keys(matchPairs).length ? matchPairs : null,
      };
    }
    if (Array.isArray(parsed)) {
      return {
        selectedOptionIds: parsed
          .map(Number)
          .filter((id) => Number.isInteger(id) && id > 0),
        selectedMatchPairs: null,
      };
    }
  } catch (error) {
    logger.warn("Failed to parse selected_option_ids", error);
  }
  return { selectedOptionIds: [], selectedMatchPairs: null };
}

/**
 * Валидирует структуру вопроса и бросает ошибку при несоответствии.
 */
function validateQuestion(question) {
  const questionType = question.questionType || "single";
  if (!["single", "multiple", "text", "matching"].includes(questionType)) {
    throw createError("Недопустимый тип вопроса");
  }
  if (questionType === "text") {
    if (!question.correctTextAnswer) {
      throw createError(
        "Для текстового вопроса необходимо указать эталонный ответ",
      );
    }
    return;
  }
  if (
    !question.options ||
    question.options.length < 2 ||
    question.options.length > 6
  ) {
    throw createError("Необходимо указать от 2 до 6 вариантов ответов");
  }
  if (questionType === "matching") {
    const allPairsFilled = question.options.every(
      (opt) => opt.text && opt.matchText && opt.matchText.trim().length > 0,
    );
    if (!allPairsFilled) {
      throw createError("Для сопоставления необходимо заполнить все пары");
    }
    return;
  }
  const correctCount = question.options.filter((opt) => opt.isCorrect).length;
  if (questionType === "single" && correctCount !== 1) {
    throw createError(
      "Для типа 'один вариант' должен быть ровно один правильный ответ",
    );
  }
  if (questionType === "multiple" && correctCount < 2) {
    throw createError(
      "Для типа 'множественный выбор' должно быть минимум 2 правильных ответа",
    );
  }
}

/**
 * Формирует финальные списки назначений с учётом роли пользователя.
 */
async function resolveAssignments(
  conn,
  actor,
  branchIds,
  positionIds,
  userIds,
) {
  let finalBranchIds = Array.isArray(branchIds) ? branchIds : [];
  let finalPositionIds = Array.isArray(positionIds) ? positionIds : [];
  let finalUserIds = Array.isArray(userIds) ? userIds : [];

  if (actor.role === "manager") {
    if (!actor.branch_id) {
      throw createError("У менеджера не указан филиал");
    }
    finalBranchIds = [actor.branch_id];

    if (positionIds && positionIds.length > 0) {
      const validIds = await repository.validatePositionsInBranch(
        conn,
        positionIds,
        actor.branch_id,
      );
      const invalid = positionIds.filter((id) => !validIds.includes(id));
      if (invalid.length > 0) {
        throw createError("Выбраны должности, которых нет в вашем филиале");
      }
      finalPositionIds = positionIds;
    }

    if (userIds && userIds.length > 0) {
      const validIds = await repository.validateUsersInBranch(
        conn,
        userIds,
        actor.branch_id,
      );
      const invalid = userIds.filter((id) => !validIds.includes(id));
      if (invalid.length > 0) {
        throw createError(
          "Выбраны пользователи, которые не относятся к вашему филиалу",
        );
      }
      finalUserIds = userIds;
    }
  }

  return { finalBranchIds, finalPositionIds, finalUserIds };
}

/**
 * Вычисляет список пользователей на основе назначений (филиалы + должности).
 */
async function resolveAutoUsers(conn, finalBranchIds, finalPositionIds) {
  const hasBranches = finalBranchIds.length > 0;
  const hasPositions = finalPositionIds.length > 0;

  if (hasBranches && hasPositions) {
    return repository.getUsersByBranchAndPosition(
      conn,
      finalBranchIds,
      finalPositionIds,
    );
  }
  if (hasBranches) {
    return repository.getUsersByBranches(conn, finalBranchIds);
  }
  if (hasPositions) {
    return repository.getUsersByPositions(conn, finalPositionIds);
  }
  return [];
}

/**
 * Вставляет вопросы аттестации вместе с вариантами ответов в рамках транзакции.
 */
async function insertQuestionsWithOptions(conn, assessmentId, questions) {
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    validateQuestion(question);
    const questionType = question.questionType || "single";
    const questionId = await repository.insertQuestion(
      conn,
      assessmentId,
      question,
      i,
    );
    if (questionType !== "text" && question.options) {
      for (let j = 0; j < question.options.length; j++) {
        await repository.insertQuestionOption(
          conn,
          questionId,
          question.options[j],
          j,
          questionType,
        );
      }
    }
  }
}

// ─── Write operations ─────────────────────────────────────────────────────────

async function createAssessment(payload, actor) {
  const {
    title,
    description,
    openAt,
    closeAt,
    timeLimitMinutes,
    passScorePercent,
    maxAttempts,
    userIds,
    positionIds,
    branchIds,
    questions,
  } = payload;

  if (new Date(closeAt) <= new Date(openAt)) {
    throw createError("Дата закрытия должна быть позже даты открытия");
  }

  const openAtDb = toMySqlDateTime(openAt);
  const closeAtDb = toMySqlDateTime(closeAt);
  if (!openAtDb || !closeAtDb) {
    throw createError("Некорректный формат даты открытия или закрытия");
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const currentUser = await repository.findUserWithRole(connection, actor.id);
    if (!currentUser) {
      throw createError("Пользователь не найден", 403);
    }

    const { finalBranchIds, finalPositionIds, finalUserIds } =
      await resolveAssignments(
        connection,
        {
          ...actor,
          branch_id: currentUser.branch_id,
          role: currentUser.role_name,
        },
        branchIds,
        positionIds,
        userIds,
      );

    const assessmentId = await repository.insertAssessment(connection, {
      title,
      description: description || "",
      openAt: openAtDb,
      closeAt: closeAtDb,
      timeLimitMinutes,
      passScorePercent,
      maxAttempts,
      createdBy: actor.id,
    });

    await insertQuestionsWithOptions(connection, assessmentId, questions);

    await repository.insertBranchAssignments(
      connection,
      assessmentId,
      finalBranchIds,
    );
    await repository.insertPositionAssignments(
      connection,
      assessmentId,
      finalPositionIds,
    );

    const autoUserIds = [
      ...new Set(
        await resolveAutoUsers(connection, finalBranchIds, finalPositionIds),
      ),
    ];
    const directUserIds = [...new Set(finalUserIds)];

    if (autoUserIds.length === 0 && directUserIds.length === 0) {
      logger.warn("No users assigned to assessment", { assessmentId });
    }

    await repository.insertUserAssignments(
      connection,
      assessmentId,
      autoUserIds,
      directUserIds,
    );
    await connection.commit();

    await repository.createAdminLog(
      actor.id,
      "CREATE",
      `Создана аттестация: ${title} (ID: ${assessmentId}, вопросов: ${questions.length})`,
      "assessment",
      assessmentId,
    );

    return { assessmentId, message: "Аттестация создана успешно" };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateAssessment(assessmentId, payload, actor) {
  const {
    title,
    description,
    openAt,
    closeAt,
    timeLimitMinutes,
    passScorePercent,
    maxAttempts,
    questions,
    branchIds,
    positionIds,
    userIds,
  } = payload;

  const openAtDb = toMySqlDateTime(openAt);
  const closeAtDb = toMySqlDateTime(closeAt);
  if (!openAtDb || !closeAtDb) {
    throw createError("Некорректный формат даты открытия или закрытия");
  }

  const connection = await pool.getConnection();
  try {
    // Проверяем аттестацию до старта транзакции
    const assessment = await repository.findAssessmentWithStatus(
      connection,
      assessmentId,
    );
    if (!assessment) {
      throw createError("Аттестация не найдена", 404);
    }

    if (actor.role === "manager" && assessment.created_by !== actor.id) {
      throw createError("Нет доступа к редактированию этой аттестации", 403);
    }

    await connection.beginTransaction();

    const inProgressCount = await repository.countInProgressAttempts(
      connection,
      assessmentId,
    );
    const hasInProgressAttempts = inProgressCount > 0;
    const canEditParameters = !hasInProgressAttempts;

    const updateFields = [
      "title = ?",
      "description = ?",
      "open_at = ?",
      "close_at = ?",
    ];
    const updateValues = [title, description || "", openAtDb, closeAtDb];

    if (canEditParameters) {
      updateFields.push(
        "time_limit_minutes = ?",
        "pass_score_percent = ?",
        "max_attempts = ?",
      );
      updateValues.push(timeLimitMinutes, passScorePercent, maxAttempts);
    } else {
      const hasParameterChanges =
        Number(timeLimitMinutes) !== Number(assessment.time_limit_minutes) ||
        Number(passScorePercent) !== Number(assessment.pass_score_percent) ||
        Number(maxAttempts) !== Number(assessment.max_attempts);
      if (hasParameterChanges) {
        throw createError(
          "Нельзя менять параметры аттестации при активных попытках",
          409,
        );
      }
    }

    await repository.updateAssessmentFields(
      connection,
      assessmentId,
      updateFields,
      updateValues,
    );

    const hasAssignmentData =
      branchIds !== undefined ||
      positionIds !== undefined ||
      userIds !== undefined;
    if (canEditParameters && hasAssignmentData) {
      const { finalBranchIds, finalPositionIds, finalUserIds } =
        await resolveAssignments(
          connection,
          actor,
          branchIds,
          positionIds,
          userIds,
        );

      await repository.deleteBranchAssignments(connection, assessmentId);
      await repository.deletePositionAssignments(connection, assessmentId);
      await repository.deleteUserAssignments(connection, assessmentId);

      await repository.insertBranchAssignments(
        connection,
        assessmentId,
        finalBranchIds,
      );
      await repository.insertPositionAssignments(
        connection,
        assessmentId,
        finalPositionIds,
      );

      const autoUserIds = [
        ...new Set(
          await resolveAutoUsers(connection, finalBranchIds, finalPositionIds),
        ),
      ];
      const directUserIds = [...new Set(finalUserIds)];
      await repository.insertUserAssignments(
        connection,
        assessmentId,
        autoUserIds,
        directUserIds,
      );
    }

    if (questions && questions.length > 0) {
      if (hasInProgressAttempts) {
        const currentCount = await repository.countAssessmentQuestions(
          connection,
          assessmentId,
        );
        if (questions.length < currentCount) {
          throw createError(
            "Нельзя удалять вопросы при активных попытках",
            409,
          );
        }
      }
      await repository.deleteAssessmentQuestions(connection, assessmentId);
      await insertQuestionsWithOptions(connection, assessmentId, questions);
    }

    await connection.commit();

    await repository.createAdminLog(
      actor.id,
      "UPDATE",
      `Обновлена аттестация: ${title} (ID: ${assessmentId})`,
      "assessment",
      assessmentId,
    );

    return { message: "Аттестация обновлена успешно" };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteAssessment(assessmentId, actor) {
  const assessment = await repository.findAssessmentForDelete(assessmentId);
  if (!assessment) {
    throw createError("Аттестация не найдена", 404);
  }

  if (actor.role === "manager" && assessment.created_by !== actor.id) {
    throw createError("Нет доступа к удалению этой аттестации", 403);
  }

  if (assessment.status !== "pending") {
    throw createError('Можно удалять только аттестации со статусом "Ожидает"');
  }

  await repository.deleteAssessmentById(assessmentId);

  await repository.createAdminLog(
    actor.id,
    "DELETE",
    `Удалена аттестация: ${assessment.title} (ID: ${assessmentId})`,
    "assessment",
    assessmentId,
  );
}

// ─── Read operations ──────────────────────────────────────────────────────────

async function getAssessmentResults(assessmentId) {
  const results = await repository.findAssessmentResults(assessmentId);
  return { results };
}

async function getAssessmentDetails(assessmentId, actor) {
  await assessmentModel.completeExpiredAttempts(assessmentId);

  const assessment =
    await repository.findAssessmentWithStatusPool(assessmentId);
  if (!assessment) {
    throw createError("Аттестация не найдена", 404);
  }

  if (actor.role === "manager") {
    const hasAccess = await repository.checkManagerAccess(
      assessmentId,
      actor.id,
    );
    if (!hasAccess) {
      throw createError("Нет доступа к этой аттестации", 403);
    }
  }

  const questions = await repository.findQuestions(assessmentId);
  for (const question of questions) {
    question.options = await repository.findQuestionOptions(question.id);
    question.answerStats = await repository.findQuestionAnswerStats(
      question.id,
    );
  }

  const participants = await repository.findParticipants(assessmentId);

  const questionMap = new Map();
  questions.forEach((q) => {
    questionMap.set(q.id, q);
    q.userAnswers = [];
  });

  const attemptUserMap = new Map();
  participants.forEach((p) => {
    const attemptId = p.best_completed_attempt_id || null;
    if (attemptId) {
      attemptUserMap.set(attemptId, {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
      });
    }
  });

  const attemptIds = Array.from(attemptUserMap.keys());
  if (attemptIds.length > 0) {
    const answerRows = await repository.findAnswersByAttempts(attemptIds);
    answerRows.forEach((answer) => {
      const user = attemptUserMap.get(answer.attempt_id);
      const question = questionMap.get(answer.question_id);
      if (!user || !question) return;
      const { selectedOptionIds, selectedMatchPairs } = parseSelectedOptions(
        question.question_type,
        answer.selected_option_ids,
      );
      question.userAnswers.push({
        user,
        selectedOptionId: answer.option_id,
        selectedOptionIds,
        selectedMatchPairs,
        selectedTextAnswer: answer.text_answer || "",
        isCorrect: answer.is_correct === 1,
      });
    });
  }

  const stats = await repository.findAssessmentStats(
    assessmentId,
    assessment.pass_score_percent,
  );
  const assignedBranches = await repository.findAssignedBranches(assessmentId);
  const assignedPositions =
    await repository.findAssignedPositions(assessmentId);
  const directlyAssignedUsers =
    await repository.findDirectlyAssignedUsers(assessmentId);

  return {
    assessment,
    questions,
    participants,
    stats,
    accessibility: {
      branches: assignedBranches,
      positions: assignedPositions,
      users: directlyAssignedUsers,
    },
  };
}

async function getUserAssessmentProgress(
  assessmentId,
  userId,
  actor,
  attemptId,
) {
  const assessment =
    await repository.findAssessmentWithStatusPool(assessmentId);
  if (!assessment) {
    throw createError("Аттестация не найдена", 404);
  }

  if (actor.role === "manager") {
    const hasAccess = await repository.checkManagerAccess(
      assessmentId,
      actor.id,
    );
    if (!hasAccess) {
      throw createError("Нет доступа к этой аттестации", 403);
    }

    const targetBranchId = await repository.findTargetUserBranch(userId);
    if (targetBranchId === null) {
      throw createError("Пользователь не найден", 404);
    }

    const managerBranchId = Number(actor.branch_id || actor.branchId || 0);
    if (!managerBranchId || managerBranchId !== Number(targetBranchId)) {
      throw createError(
        "Нет доступа к прогрессу пользователя из другого филиала",
        403,
      );
    }
  }

  const user = await repository.findUserAssignedToAssessment(
    assessmentId,
    userId,
  );
  if (!user) {
    throw createError("Пользователь не назначен на аттестацию", 404);
  }

  const attempts = await repository.findAttempts(assessmentId, userId);
  const attemptIdSet = new Set(attempts.map((a) => a.id));
  const completedAttempts = attempts.filter((a) => a.status === "completed");

  const bestAttempt = completedAttempts.reduce((best, current) => {
    if (!best) return current;
    const bestScore = Number(best.score_percent ?? -1);
    const currentScore = Number(current.score_percent ?? -1);
    if (currentScore > bestScore) return current;
    if (currentScore === bestScore) {
      const bestTime = best.completed_at
        ? new Date(best.completed_at).getTime()
        : 0;
      const currentTime = current.completed_at
        ? new Date(current.completed_at).getTime()
        : 0;
      return currentTime > bestTime ? current : best;
    }
    return best;
  }, null);

  const selectedAttemptId = attemptIdSet.has(attemptId)
    ? attemptId
    : bestAttempt?.id || (attempts.length ? attempts[0].id : null);

  let questions = [];
  let selectedAttempt = null;

  if (selectedAttemptId) {
    selectedAttempt = attempts.find((a) => a.id === selectedAttemptId) || null;

    const questionRows =
      await repository.findQuestionsWithOptions(assessmentId);
    const answerRows = await repository.findAnswersByAttempt(selectedAttemptId);

    const answersMap = new Map();
    answerRows.forEach((row) => answersMap.set(row.question_id, row));

    const questionMap = new Map();
    questionRows.forEach((row) => {
      if (!questionMap.has(row.id)) {
        questionMap.set(row.id, {
          id: row.id,
          question_text: row.question_text,
          question_type: row.question_type,
          correct_text_answer: row.correct_text_answer,
          options: [],
          correctOptionIds: [],
          selectedOptionId: null,
          selectedOptionIds: [],
          selectedTextAnswer: "",
          selectedMatchPairs: null,
          isCorrect: null,
        });
      }
      if (row.option_id) {
        const option = {
          id: row.option_id,
          option_text: row.option_text,
          match_text: row.match_text,
          is_correct: row.is_correct === 1,
          order_index: row.option_order,
        };
        const q = questionMap.get(row.id);
        q.options.push(option);
        if (option.is_correct) q.correctOptionIds.push(option.id);
      }
    });

    questionMap.forEach((question) => {
      const answer = answersMap.get(question.id);
      if (!answer) return;

      if (answer.option_id) question.selectedOptionId = answer.option_id;
      if (answer.text_answer) question.selectedTextAnswer = answer.text_answer;

      if (answer.selected_option_ids) {
        const { selectedOptionIds, selectedMatchPairs } = parseSelectedOptions(
          question.question_type,
          answer.selected_option_ids,
        );
        question.selectedOptionIds = selectedOptionIds;
        if (selectedMatchPairs)
          question.selectedMatchPairs = selectedMatchPairs;
      }

      question.isCorrect = answer.is_correct === 1;
    });

    questions = Array.from(questionMap.values()).sort((a, b) => a.id - b.id);
  }

  const theoryRow = await repository.findTheoryCompletion(assessmentId, userId);
  const theory = theoryRow
    ? {
        time_spent_seconds: theoryRow.time_spent_seconds,
        completed_at: theoryRow.completed_at,
      }
    : null;

  return {
    assessment: {
      id: assessment.id,
      title: assessment.title,
      pass_score_percent: assessment.pass_score_percent,
      status: assessment.status,
    },
    user,
    attempts,
    selectedAttempt,
    questions,
    theory,
  };
}

async function getExportData(assessmentId) {
  const assessment = await repository.findAssessmentForExport(assessmentId);
  if (!assessment) {
    throw createError("Аттестация не найдена", 404);
  }
  const results = await repository.findExportResults(assessmentId);
  return { assessment, results };
}

module.exports = {
  createAssessment,
  updateAssessment,
  deleteAssessment,
  getAssessmentResults,
  getAssessmentDetails,
  getUserAssessmentProgress,
  getExportData,
};
