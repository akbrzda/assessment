const Joi = require('joi');
const assessmentModel = require('../models/assessmentModel');
const referenceModel = require('../models/referenceModel');
const userModel = require('../models/userModel');
const logger = require('../utils/logger');
const { sendTelegramLog } = require('../services/telegramLogger');
const { sendUserNotification } = require('../services/telegramNotifier');
const gamificationService = require('../services/gamificationService');

const optionSchema = Joi.object({
  text: Joi.string().trim().min(1).max(512).required(),
  isCorrect: Joi.boolean().required()
});

const questionSchema = Joi.object({
  text: Joi.string().trim().min(1).required(),
  options: Joi.array().items(optionSchema).min(2).max(6).required()
}).custom((value, helpers) => {
  const correctCount = value.options.filter((option) => option.isCorrect).length;
  if (correctCount !== 1) {
    return helpers.message('Каждый вопрос должен иметь ровно один правильный ответ');
  }
  return value;
});

const answerSchema = Joi.object({
  questionId: Joi.number().integer().positive().required(),
  optionId: Joi.number().integer().positive().required()
});

const baseSchema = Joi.object({
  title: Joi.string().trim().min(3).max(255).required(),
  description: Joi.string().allow('', null).default(''),
  openAt: Joi.date().iso().required(),
  closeAt: Joi.date().iso().required(),
  timeLimitMinutes: Joi.number().integer().min(1).max(240).required(),
  passScorePercent: Joi.number().integer().min(0).max(100).required(),
  maxAttempts: Joi.number().integer().min(1).max(3).required(),
  branchIds: Joi.array().items(Joi.number().integer().positive()).unique().default([]),
  userIds: Joi.array().items(Joi.number().integer().positive()).unique().default([]),
  positionIds: Joi.array().items(Joi.number().integer().positive()).unique().default([]),
  questions: Joi.array().items(questionSchema).min(1).required(),
  clientTimezoneOffsetMinutes: Joi.number().integer().min(-720).max(840).optional()
}).custom((value, helpers) => {
  if (!value.userIds.length && !value.positionIds.length && !value.branchIds.length) {
    return helpers.message('Необходимо выбрать хотя бы одного сотрудника, должность или филиал');
  }
  if (new Date(value.closeAt) <= new Date(value.openAt)) {
    return helpers.message('Дата закрытия должна быть позже даты открытия');
  }
  return value;
});

function normalizeQuestionPayload(questions) {
  return questions.map((question) => ({
    text: question.text.trim(),
    options: question.options.map((option) => ({
      text: option.text.trim(),
      isCorrect: Boolean(option.isCorrect)
    }))
  }));
}

function formatDateTime(value) {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString('ru-RU');
}

async function listManaged(req, res, next) {
  try {
    const items = await assessmentModel.listAssessmentsForManager({
      userId: req.currentUser.id,
      roleName: req.currentUser.roleName
    });
    res.json({ assessments: items });
  } catch (error) {
    next(error);
  }
}

async function listForUser(req, res, next) {
  try {
    const assessments = await assessmentModel.listAssessmentsForUser(req.currentUser.id);
    res.json({ assessments });
  } catch (error) {
    next(error);
  }
}

async function getForUser(req, res, next) {
  try {
    const assessmentId = Number(req.params.id);
    const assessment = await assessmentModel.getAssessmentForUser(assessmentId, req.currentUser.id);
    if (!assessment) {
      return res.status(404).json({ error: 'Аттестация не найдена или недоступна' });
    }
    res.json({ assessment });
  } catch (error) {
    next(error);
  }
}

async function listTargets(req, res, next) {
  try {
    const roleName = req.currentUser.roleName;
    const branchId = req.currentUser.branchId;

    const [users, positions, branches] = await Promise.all([
      assessmentModel.listAssignableUsers({ roleName, branchId }),
      assessmentModel.listAssignablePositions({ roleName, branchId }),
      assessmentModel.listAssignableBranches({ roleName, branchId })
    ]);

    res.json({ users, positions, branches });
  } catch (error) {
    next(error);
  }
}

async function prepareTargets(value, currentUser) {
  const initialBranchIds = Array.isArray(value.branchIds) ? value.branchIds.map((id) => Number(id)) : [];
  const userIds = Array.isArray(value.userIds) ? value.userIds.map((id) => Number(id)) : [];
  const positionIds = Array.isArray(value.positionIds) ? value.positionIds.map((id) => Number(id)) : [];

  let branchIds = initialBranchIds;

  if (currentUser.roleName === 'manager') {
    if (!currentUser.branchId) {
      const error = new Error('Для управляющего не указан филиал');
      error.status = 422;
      throw error;
    }
    branchIds = [Number(currentUser.branchId)];
  } else if (branchIds.length) {
    const branches = await referenceModel.getBranchesByIds(branchIds);
    if (branches.length !== branchIds.length) {
      const foundIds = new Set(branches.map((branch) => branch.id));
      const missing = branchIds.filter((id) => !foundIds.has(id));
      const error = new Error(`Некорректные филиалы: ${missing.join(', ')}`);
      error.status = 422;
      throw error;
    }
  }

  const users = await userModel.findByIds(userIds);
  if (userIds.length && users.length !== userIds.length) {
    const foundIds = new Set(users.map((item) => item.id));
    const missing = userIds.filter((id) => !foundIds.has(id));
    const error = new Error(`Некорректные сотрудники: ${missing.join(', ')}`);
    error.status = 422;
    throw error;
  }

  if (currentUser.roleName === 'manager') {
    const invalidUsers = users.filter((user) => user.branchId !== currentUser.branchId);
    if (invalidUsers.length) {
      const names = invalidUsers.map((user) => `${user.firstName} ${user.lastName}`).join(', ');
      const error = new Error(`Вы можете назначать аттестации только сотрудникам своего филиала. Проверьте: ${names}`);
      error.status = 422;
      throw error;
    }
  } else if (branchIds.length) {
    const invalidUsers = users.filter((user) => user.branchId && !branchIds.includes(Number(user.branchId)));
    if (invalidUsers.length) {
      const names = invalidUsers.map((user) => `${user.firstName} ${user.lastName}`).join(', ');
      const error = new Error(`Сотрудники должны относиться к выбранным филиалам. Проверьте: ${names}`);
      error.status = 422;
      throw error;
    }
  }

  if (positionIds.length) {
    if (currentUser.roleName === 'manager') {
      const allowedPositions = new Set(
        (await assessmentModel.listAssignablePositions({ roleName: 'manager', branchId: currentUser.branchId })).map((item) => item.id)
      );
      const invalidPositions = positionIds.filter((id) => !allowedPositions.has(id));
      if (invalidPositions.length) {
        const error = new Error('Вы можете выбирать только должности вашего филиала');
        error.status = 422;
        throw error;
      }
    } else {
      const positions = await referenceModel.getPositionsByIds(positionIds);
      if (positions.length !== positionIds.length) {
        const foundIds = new Set(positions.map((item) => item.id));
        const missing = positionIds.filter((id) => !foundIds.has(id));
        const error = new Error(`Некорректные должности: ${missing.join(', ')}`);
        error.status = 422;
        throw error;
      }
    }
  }

  if (!branchIds.length && !userIds.length && !positionIds.length) {
    const error = new Error('Необходимо выбрать хотя бы одного сотрудника, должность или филиал');
    error.status = 422;
    throw error;
  }

  return {
    branchIds,
    userIds,
    positionIds
  };
}

async function create(req, res, next) {
  try {
    const payload = {
      ...req.body,
      branchIds: req.currentUser.roleName === 'manager' ? [req.currentUser.branchId] : req.body.branchIds
    };

    const { error, value } = baseSchema.validate(payload, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(', ') });
    }

    const targets = await prepareTargets(value, req.currentUser);

    const assessmentData = {
      title: value.title.trim(),
      description: value.description?.trim() || '',
      openAt: new Date(value.openAt),
      closeAt: new Date(value.closeAt),
      timeLimitMinutes: value.timeLimitMinutes,
      passScorePercent: value.passScorePercent,
      maxAttempts: value.maxAttempts
    };

    const questions = normalizeQuestionPayload(value.questions);

    const assessmentId = await assessmentModel.createAssessment({
      assessment: assessmentData,
      questions,
      branchIds: targets.branchIds,
      userIds: targets.userIds,
      positionIds: targets.positionIds,
      userId: req.currentUser.id
    });

    const created = await assessmentModel.findAssessmentByIdForManager(assessmentId, {
      userId: req.currentUser.id,
      roleName: req.currentUser.roleName
    });

    await sendTelegramLog(
      `📝 <b>Создана аттестация</b>\n` +
        `Название: ${created.title}\n` +
        `Открытие: ${created.openAt}\n` +
        `Создал: ${req.currentUser.firstName} ${req.currentUser.lastName}`
    );

    try {
      const targetUserIds = await assessmentModel.listAssignedUserIds(assessmentId);
      if (targetUserIds.length) {
        const targetUsers = await userModel.findByIds(targetUserIds);
        await Promise.all(
          targetUsers
            .filter((user) => user.telegramId)
            .map((user) =>
              sendUserNotification(
                user.telegramId,
                `📝 Новая аттестация: ${created.title}\nОткрытие: ${formatDateTime(created.openAt)}\nЗавершение: ${formatDateTime(created.closeAt)}`
              )
            )
        );
      }
    } catch (notifyError) {
      // логируем и не прерываем основной поток
      logger.error('Failed to notify users about assessment %s: %s', assessmentId, notifyError.message);
    }

    res.status(201).json({ assessment: created });
  } catch (error) {
    next(error);
  }
}

async function getDetail(req, res, next) {
  try {
    const assessmentId = Number(req.params.id);
    const assessment = await assessmentModel.findAssessmentByIdForManager(assessmentId, {
      userId: req.currentUser.id,
      roleName: req.currentUser.roleName
    });
    if (!assessment) {
      return res.status(404).json({ error: 'Аттестация не найдена' });
    }
    res.json({ assessment });
  } catch (error) {
    next(error);
  }
}

async function startAttempt(req, res, next) {
  try {
    const assessmentId = Number(req.params.id);
    const assessment = await assessmentModel.getAssessmentForUser(assessmentId, req.currentUser.id);
    if (!assessment) {
      return res.status(404).json({ error: 'Аттестация не найдена или недоступна' });
    }
    if (assessment.status === 'pending') {
      return res.status(400).json({ error: 'Аттестация ещё не открыта' });
    }
    if (assessment.status === 'closed') {
      return res.status(400).json({ error: 'Аттестация уже закрыта' });
    }

    const attempt = await assessmentModel.createAttempt(assessment, req.currentUser.id);

    res.status(201).json({
      attempt: {
        id: attempt.id,
        number: attempt.attemptNumber,
        timeLimitMinutes: attempt.timeLimitMinutes,
        maxAttempts: attempt.maxAttempts,
        startedAt: attempt.startedAt || new Date().toISOString(),
        remainingSeconds: attempt.remainingSeconds
      }
    });
  } catch (error) {
    next(error);
  }
}

async function submitAnswer(req, res, next) {
  try {
    const assessmentId = Number(req.params.id);
    const attemptId = Number(req.params.attemptId);

    if (!assessmentId || !attemptId) {
      return res.status(400).json({ error: 'Некорректные параметры' });
    }

    const { error, value } = answerSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(', ') });
    }

    await assessmentModel.saveAnswer({
      attemptId,
      userId: req.currentUser.id,
      questionId: value.questionId,
      optionId: value.optionId
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function completeAttempt(req, res, next) {
  try {
    const assessmentId = Number(req.params.id);
    const attemptId = Number(req.params.attemptId);

    if (!assessmentId || !attemptId) {
      return res.status(400).json({ error: 'Некорректные параметры' });
    }

    const summary = await assessmentModel.completeAttempt(attemptId, req.currentUser.id);

    const scorePercent = summary.attempt.scorePercent || 0;
    const passScore = summary.assessment.passScorePercent || 0;
    const passed = scorePercent >= passScore;

    let gamification = null;
    try {
      gamification = await gamificationService.processAttemptCompletion({
        userId: req.currentUser.id,
        attemptId,
        assessment: summary.assessment,
        attempt: summary.attempt
      });
    } catch (gamificationError) {
      logger.error('Failed to process gamification for attempt %s: %s', attemptId, gamificationError.message);
    }

    if (summary.assessment.createdBy && summary.assessment.createdBy !== req.currentUser.id) {
      try {
        const creator = await userModel.findById(summary.assessment.createdBy);
        if (creator?.telegramId) {
          const message =
            `📊 <b>Аттестация завершена</b>\n` +
            `Тест: ${summary.assessment.title}\n` +
            `Сотрудник: ${req.currentUser.firstName} ${req.currentUser.lastName}\n` +
            `Результат: ${scorePercent}% (${passed ? 'успешно' : 'неуспешно'})`; 
          await sendUserNotification(creator.telegramId, message);
        }
      } catch (notifyError) {
        logger.error('Failed to notify creator about completed assessment %s: %s', assessmentId, notifyError.message);
      }
    }

    res.json({
      assessment: {
        id: summary.assessment.id,
        title: summary.assessment.title,
        passScorePercent: summary.assessment.passScorePercent
      },
      attempt: {
        id: summary.attempt.id,
        scorePercent,
        correctAnswers: summary.attempt.correctAnswers,
        totalQuestions: summary.attempt.totalQuestions,
        timeSpentSeconds: summary.attempt.timeSpentSeconds,
        attemptNumber: summary.attempt.attemptNumber,
        passed
      },
      gamification
    });
  } catch (error) {
    next(error);
  }
}

async function getAttemptResultController(req, res, next) {
  try {
    const assessmentId = Number(req.params.id);
    const attemptId = Number(req.params.attemptId);

    if (!assessmentId || !attemptId) {
      return res.status(400).json({ error: 'Некорректные параметры' });
    }

    const result = await assessmentModel.getAttemptResult({
      assessmentId,
      attemptId,
      userId: req.currentUser.id
    });

    if (!result) {
      return res.status(404).json({ error: 'Результат не найден' });
    }

    res.json({ result });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const assessmentId = Number(req.params.id);
    const existing = await assessmentModel.findAssessmentByIdForManager(assessmentId, {
      userId: req.currentUser.id,
      roleName: req.currentUser.roleName
    });
    if (!existing) {
      return res.status(404).json({ error: 'Аттестация не найдена' });
    }

    if (new Date(existing.openAt) <= new Date()) {
      return res.status(400).json({ error: 'Аттестацию нельзя изменить после открытия' });
    }

    const hasAttempts = await assessmentModel.hasAttempts(assessmentId);
    if (hasAttempts) {
      return res.status(400).json({ error: 'Аттестацию нельзя изменить, так как уже есть попытки' });
    }

    const payload = {
      ...req.body,
      branchIds: req.currentUser.roleName === 'manager' ? [req.currentUser.branchId] : req.body.branchIds
    };

    const { error, value } = baseSchema.validate(payload, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(', ') });
    }

    const targets = await prepareTargets(value, req.currentUser);

    const assessmentData = {
      title: value.title.trim(),
      description: value.description?.trim() || '',
      openAt: new Date(value.openAt),
      closeAt: new Date(value.closeAt),
      timeLimitMinutes: value.timeLimitMinutes,
      passScorePercent: value.passScorePercent,
      maxAttempts: value.maxAttempts
    };

    const questions = normalizeQuestionPayload(value.questions);

    await assessmentModel.updateAssessment(assessmentId, {
      assessment: assessmentData,
      questions,
      branchIds: targets.branchIds,
      userIds: targets.userIds,
      positionIds: targets.positionIds,
      userId: req.currentUser.id
    });

    const updated = await assessmentModel.findAssessmentByIdForManager(assessmentId, {
      userId: req.currentUser.id,
      roleName: req.currentUser.roleName
    });

    await sendTelegramLog(
      `✏️ <b>Обновлена аттестация</b>\n` +
        `Название: ${updated.title}\n` +
        `Открытие: ${updated.openAt}\n` +
        `Обновил: ${req.currentUser.firstName} ${req.currentUser.lastName}`
    );

    res.json({ assessment: updated });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const assessmentId = Number(req.params.id);
    const existing = await assessmentModel.findAssessmentByIdForManager(assessmentId, {
      userId: req.currentUser.id,
      roleName: req.currentUser.roleName
    });
    if (!existing) {
      return res.status(404).json({ error: 'Аттестация не найдена' });
    }

    if (new Date(existing.openAt) <= new Date()) {
      return res.status(400).json({ error: 'Аттестацию нельзя удалить после открытия' });
    }

    const hasAttempts = await assessmentModel.hasAttempts(assessmentId);
    if (hasAttempts) {
      return res.status(400).json({ error: 'Аттестацию нельзя удалить, так как уже есть попытки' });
    }

    await assessmentModel.deleteAssessment(assessmentId);

    await sendTelegramLog(
      `🗑️ <b>Удалена аттестация</b>\n` +
        `Название: ${existing.title}\n` +
        `Удалил: ${req.currentUser.firstName} ${req.currentUser.lastName}`
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listManaged,
  listForUser,
  getForUser,
  listTargets,
  create,
  getDetail,
  update,
  remove,
  startAttempt,
  submitAnswer,
  completeAttempt,
  getAttemptResultController
};
