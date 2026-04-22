const Joi = require("joi");
const assessmentModel = require("../../../../../models/assessmentModel");
const theoryModel = require("../../../../../models/theoryModel");
const referenceModel = require("../../../../../models/referenceModel");
const userModel = require("../../../../../models/userModel");
const logger = require("../../../../../utils/logger");
const gamificationService = require("../../../../../services/gamificationService");
const { logAndSend, buildActorFromRequest } = require("../../../../../services/auditService");

const optionSchema = Joi.object({
  text: Joi.string().trim().min(1).max(512).required(),
  isCorrect: Joi.boolean().default(false),
  matchText: Joi.string().trim().min(1).max(512).allow("", null),
});

const questionSchema = Joi.object({
  questionBankId: Joi.number().integer().positive().allow(null),
  text: Joi.string().trim().min(1).required(),
  questionType: Joi.string().valid("single", "multiple", "text", "matching").default("single"),
  correctTextAnswer: Joi.when("questionType", {
    is: "text",
    then: Joi.string().trim().min(1).required(),
    otherwise: Joi.string().allow("", null).default(""),
  }),
  options: Joi.when("questionType", {
    is: "text",
    then: Joi.array().default([]),
    otherwise: Joi.array().items(optionSchema).min(2).max(6).required(),
  }),
}).custom((value, helpers) => {
  if (value.questionType === "single") {
    const correctCount = value.options.filter((option) => option.isCorrect).length;
    if (correctCount !== 1) {
      return helpers.message(
        "Р”Р»СЏ РІРѕРїСЂРѕСЃРѕРІ СЃ РѕРґРЅРёРј РѕС‚РІРµС‚РѕРј РЅРµРѕР±С…РѕРґРёРјРѕ РІС‹Р±СЂР°С‚СЊ СЂРѕРІРЅРѕ РѕРґРёРЅ РїСЂР°РІРёР»СЊРЅС‹Р№ РІР°СЂРёР°РЅС‚",
      );
    }
  }
  if (value.questionType === "multiple") {
    const correctCount = value.options.filter((option) => option.isCorrect).length;
    if (correctCount < 2) {
      return helpers.message(
        "Р”Р»СЏ РІРѕРїСЂРѕСЃРѕРІ СЃ РЅРµСЃРєРѕР»СЊРєРёРјРё РѕС‚РІРµС‚Р°РјРё РЅРµРѕР±С…РѕРґРёРјРѕ РІС‹Р±СЂР°С‚СЊ РјРёРЅРёРјСѓРј РґРІР° РїСЂР°РІРёР»СЊРЅС‹С… РІР°СЂРёР°РЅС‚Р°",
      );
    }
  }
  if (value.questionType === "matching") {
    const allPairsFilled = value.options.every((option) => option.matchText && option.matchText.trim().length > 0);
    if (!allPairsFilled) {
      return helpers.message("Р”Р»СЏ СЃРѕРїРѕСЃС‚Р°РІР»РµРЅРёСЏ РЅРµРѕР±С…РѕРґРёРјРѕ Р·Р°РїРѕР»РЅРёС‚СЊ РІСЃРµ РїР°СЂС‹");
    }
  }
  if (value.questionType === "text" && !value.correctTextAnswer?.trim()) {
    return helpers.message("Р”Р»СЏ С‚РµРєСЃС‚РѕРІРѕРіРѕ РІРѕРїСЂРѕСЃР° РЅРµРѕР±С…РѕРґРёРјРѕ СѓРєР°Р·Р°С‚СЊ СЌС‚Р°Р»РѕРЅРЅС‹Р№ РѕС‚РІРµС‚");
  }
  return value;
});

const answerSchema = Joi.object({
  questionId: Joi.number().integer().positive().required(),
  optionId: Joi.number().integer().positive(),
  optionIds: Joi.array().items(Joi.number().integer().positive()).min(1),
  matchPairs: Joi.array().items(
    Joi.object({
      leftOptionId: Joi.number().integer().positive().required(),
      rightOptionId: Joi.number().integer().positive().required(),
    }),
  ),
  textAnswer: Joi.string().allow("", null),
}).custom((value, helpers) => {
  if (
    value.optionId == null &&
    (!value.optionIds || value.optionIds.length === 0) &&
    (!value.matchPairs || value.matchPairs.length === 0) &&
    (value.textAnswer == null || value.textAnswer === "")
  ) {
    return helpers.message("РќРµ СѓРєР°Р·Р°РЅ РѕС‚РІРµС‚");
  }
  return value;
});

const answerBatchSchema = Joi.object({
  answers: Joi.array().items(answerSchema).min(1).required(),
}).custom((value, helpers) => {
  const ids = value.answers.map((answer) => answer.questionId);
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    return helpers.message("Р’ РѕС‚РІРµС‚Р°С… РЅРµ РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ РґСѓР±Р»РёРєР°С‚РѕРІ РІРѕРїСЂРѕСЃРѕРІ");
  }
  return value;
});

const baseSchema = Joi.object({
  title: Joi.string().trim().min(3).max(255).required(),
  description: Joi.string().allow("", null).default(""),
  openAt: Joi.date().iso().required(),
  closeAt: Joi.date().iso().required(),
  timeLimitMinutes: Joi.number().integer().min(1).max(240).required(),
  passScorePercent: Joi.number().integer().min(0).max(100).required(),
  maxAttempts: Joi.number().integer().min(0).max(3).required(),
  branchIds: Joi.array().items(Joi.number().integer().positive()).unique().default([]),
  userIds: Joi.array().items(Joi.number().integer().positive()).unique().default([]),
  positionIds: Joi.array().items(Joi.number().integer().positive()).unique().default([]),
  questions: Joi.array().items(questionSchema).min(1).required(),
  clientTimezoneOffsetMinutes: Joi.number().integer().min(-720).max(840).optional(),
}).custom((value, helpers) => {
  if (!value.userIds.length && !value.positionIds.length && !value.branchIds.length) {
    return helpers.message(
      "РќРµРѕР±С…РѕРґРёРјРѕ РІС‹Р±СЂР°С‚СЊ С…РѕС‚СЏ Р±С‹ РѕРґРЅРѕРіРѕ СЃРѕС‚СЂСѓРґРЅРёРєР°, РґРѕР»Р¶РЅРѕСЃС‚СЊ РёР»Рё С„РёР»РёР°Р»",
    );
  }
  if (new Date(value.closeAt) <= new Date(value.openAt)) {
    return helpers.message("Р”Р°С‚Р° Р·Р°РєСЂС‹С‚РёСЏ РґРѕР»Р¶РЅР° Р±С‹С‚СЊ РїРѕР·Р¶Рµ РґР°С‚С‹ РѕС‚РєСЂС‹С‚РёСЏ");
  }
  return value;
});

function normalizeQuestionPayload(questions) {
  return questions.map((question) => ({
    questionBankId: question.questionBankId ?? null,
    text: question.text.trim(),
    questionType: question.questionType || "single",
    correctTextAnswer: question.questionType === "text" ? question.correctTextAnswer?.trim() || "" : "",
    options: Array.isArray(question.options)
      ? question.options.map((option) => ({
          text: option.text.trim(),
          matchText: option.matchText ? option.matchText.trim() : "",
          isCorrect: Boolean(option.isCorrect),
        }))
      : [],
  }));
}

function formatDateTime(value) {
  if (!value) {
    return "вЂ”";
  }
  return new Date(value).toLocaleString("ru-RU");
}

async function listManaged(req, res, next) {
  try {
    const items = await assessmentModel.listAssessmentsForManager({
      userId: req.currentUser.id,
      roleName: req.currentUser.roleName,
      branchId: req.currentUser.branchId,
    });
    res.json({ assessments: items });
  } catch (error) {
    next(error);
  }
}

async function listForUser(req, res, next) {
  try {
    const page = Number(req.query.page);
    const limit = Number(req.query.limit);

    const payload = await assessmentModel.listAssessmentsForUser(req.currentUser.id, {
      page: Number.isInteger(page) && page > 0 ? page : undefined,
      limit: Number.isInteger(limit) && limit > 0 ? limit : undefined,
    });

    if (payload.page && payload.limit) {
      res.setHeader("X-Total-Count", String(payload.total));
    }

    res.json({
      assessments: payload.items,
      total: payload.total,
      page: payload.page,
      limit: payload.limit,
    });
  } catch (error) {
    next(error);
  }
}

async function getForUser(req, res, next) {
  try {
    const assessmentId = Number(req.params.id);

    const assessment = await assessmentModel.getAssessmentForUser(assessmentId, req.currentUser.id);
    if (!assessment) {
      return res.status(404).json({ error: "РђС‚С‚РµСЃС‚Р°С†РёСЏ РЅРµ РЅР°Р№РґРµРЅР° РёР»Рё РЅРµРґРѕСЃС‚СѓРїРЅР°" });
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
      assessmentModel.listAssignableBranches({ roleName, branchId }),
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

  if (currentUser.roleName === "manager") {
    if (!currentUser.branchId) {
      const error = new Error("Р”Р»СЏ СѓРїСЂР°РІР»СЏСЋС‰РµРіРѕ РЅРµ СѓРєР°Р·Р°РЅ С„РёР»РёР°Р»");
      error.status = 422;
      throw error;
    }
    branchIds = [Number(currentUser.branchId)];
  } else if (branchIds.length) {
    const branches = await referenceModel.getBranchesByIds(branchIds);
    if (branches.length !== branchIds.length) {
      const foundIds = new Set(branches.map((branch) => branch.id));
      const missing = branchIds.filter((id) => !foundIds.has(id));
      const error = new Error(`РќРµРєРѕСЂСЂРµРєС‚РЅС‹Рµ С„РёР»РёР°Р»С‹: ${missing.join(", ")}`);
      error.status = 422;
      throw error;
    }
  }

  const users = await userModel.findByIds(userIds);
  if (userIds.length && users.length !== userIds.length) {
    const foundIds = new Set(users.map((item) => item.id));
    const missing = userIds.filter((id) => !foundIds.has(id));
    const error = new Error(`РќРµРєРѕСЂСЂРµРєС‚РЅС‹Рµ СЃРѕС‚СЂСѓРґРЅРёРєРё: ${missing.join(", ")}`);
    error.status = 422;
    throw error;
  }

  if (currentUser.roleName === "manager") {
    const invalidUsers = users.filter((user) => user.branchId !== currentUser.branchId);
    if (invalidUsers.length) {
      const names = invalidUsers.map((user) => `${user.firstName} ${user.lastName}`).join(", ");
      const error = new Error(
        `Р’С‹ РјРѕР¶РµС‚Рµ РЅР°Р·РЅР°С‡Р°С‚СЊ Р°С‚С‚РµСЃС‚Р°С†РёРё С‚РѕР»СЊРєРѕ СЃРѕС‚СЂСѓРґРЅРёРєР°Рј СЃРІРѕРµРіРѕ С„РёР»РёР°Р»Р°. РџСЂРѕРІРµСЂСЊС‚Рµ: ${names}`,
      );
      error.status = 422;
      throw error;
    }
  } else if (branchIds.length) {
    const invalidUsers = users.filter((user) => user.branchId && !branchIds.includes(Number(user.branchId)));
    if (invalidUsers.length) {
      const names = invalidUsers.map((user) => `${user.firstName} ${user.lastName}`).join(", ");
      const error = new Error(
        `РЎРѕС‚СЂСѓРґРЅРёРєРё РґРѕР»Р¶РЅС‹ РѕС‚РЅРѕСЃРёС‚СЊСЃСЏ Рє РІС‹Р±СЂР°РЅРЅС‹Рј С„РёР»РёР°Р»Р°Рј. РџСЂРѕРІРµСЂСЊС‚Рµ: ${names}`,
      );
      error.status = 422;
      throw error;
    }
  }

  if (positionIds.length) {
    if (currentUser.roleName === "manager") {
      const allowedPositions = new Set(
        (await assessmentModel.listAssignablePositions({ roleName: "manager", branchId: currentUser.branchId })).map((item) => item.id),
      );
      const invalidPositions = positionIds.filter((id) => !allowedPositions.has(id));
      if (invalidPositions.length) {
        const error = new Error("Р’С‹ РјРѕР¶РµС‚Рµ РІС‹Р±РёСЂР°С‚СЊ С‚РѕР»СЊРєРѕ РґРѕР»Р¶РЅРѕСЃС‚Рё РІР°С€РµРіРѕ С„РёР»РёР°Р»Р°");
        error.status = 422;
        throw error;
      }
    } else {
      const positions = await referenceModel.getPositionsByIds(positionIds);
      if (positions.length !== positionIds.length) {
        const foundIds = new Set(positions.map((item) => item.id));
        const missing = positionIds.filter((id) => !foundIds.has(id));
        const error = new Error(`РќРµРєРѕСЂСЂРµРєС‚РЅС‹Рµ РґРѕР»Р¶РЅРѕСЃС‚Рё: ${missing.join(", ")}`);
        error.status = 422;
        throw error;
      }
    }
  }

  if (!branchIds.length && !userIds.length && !positionIds.length) {
    const error = new Error(
      "РќРµРѕР±С…РѕРґРёРјРѕ РІС‹Р±СЂР°С‚СЊ С…РѕС‚СЏ Р±С‹ РѕРґРЅРѕРіРѕ СЃРѕС‚СЂСѓРґРЅРёРєР°, РґРѕР»Р¶РЅРѕСЃС‚СЊ РёР»Рё С„РёР»РёР°Р»",
    );
    error.status = 422;
    throw error;
  }

  return {
    branchIds,
    userIds,
    positionIds,
  };
}

async function create(req, res, next) {
  try {
    const payload = {
      ...req.body,
      branchIds: req.currentUser.roleName === "manager" ? [req.currentUser.branchId] : req.body.branchIds,
    };

    const { error, value } = baseSchema.validate(payload, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    const targets = await prepareTargets(value, req.currentUser);

    const assessmentData = {
      title: value.title.trim(),
      description: value.description?.trim() || "",
      openAt: new Date(value.openAt),
      closeAt: new Date(value.closeAt),
      timeLimitMinutes: value.timeLimitMinutes,
      passScorePercent: value.passScorePercent,
      maxAttempts: value.maxAttempts,
    };

    const questions = normalizeQuestionPayload(value.questions);

    const assessmentId = await assessmentModel.createAssessment({
      assessment: assessmentData,
      questions,
      branchIds: targets.branchIds,
      userIds: targets.userIds,
      positionIds: targets.positionIds,
      userId: req.currentUser.id,
    });

    const created = await assessmentModel.findAssessmentByIdForManager(assessmentId, {
      userId: req.currentUser.id,
      roleName: req.currentUser.roleName,
      branchId: req.currentUser.branchId,
    });

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "assessment.created",
      entity: "assessment",
      entityId: assessmentId,
      metadata: {
        title: created.title,
        openAt: created.openAt,
        closeAt: created.closeAt,
        questionCount: questions.length,
      },
    });

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
      roleName: req.currentUser.roleName,
      branchId: req.currentUser.branchId,
    });
    if (!assessment) {
      return res.status(404).json({ error: "РђС‚С‚РµСЃС‚Р°С†РёСЏ РЅРµ РЅР°Р№РґРµРЅР°" });
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
      return res.status(404).json({ error: "Аттестация не найдена или недоступна", code: "ASSESSMENT_NOT_FOUND" });
    }
    if (assessment.status === "pending") {
      return res.status(400).json({ error: "Аттестация ещё не открыта", code: "ASSESSMENT_NOT_OPEN" });
    }
    if (assessment.status === "closed") {
      return res.status(400).json({ error: "Аттестация уже закрыта", code: "ASSESSMENT_CLOSED" });
    }

    const theoryMeta = await theoryModel.getCurrentTheoryMeta(assessmentId);
    if (theoryMeta && theoryMeta.completionRequired) {
      const hasCompletion = await theoryModel.userHasCompletion({
        assessmentId,
        userId: req.currentUser.id,
        versionId: theoryMeta.versionId,
      });

      if (!hasCompletion) {
        return res.status(409).json({
          error: "РќРµРѕР±С…РѕРґРёРјРѕ РїСЂРѕР№С‚Рё РѕР±СЏР·Р°С‚РµР»СЊРЅСѓСЋ С‚РµРѕСЂРёСЋ РїРµСЂРµРґ РЅР°С‡Р°Р»РѕРј С‚РµСЃС‚Р°",
          code: "THEORY_NOT_COMPLETED",
          theory: {
            versionId: theoryMeta.versionId,
            versionNumber: theoryMeta.versionNumber,
            publishedAt: theoryMeta.publishedAt,
          },
        });
      }
    }

    const attempt = await assessmentModel.createAttempt(assessment, req.currentUser.id);

    res.status(201).json({
      attempt: {
        id: attempt.id,
        number: attempt.attemptNumber,
        timeLimitMinutes: attempt.timeLimitMinutes,
        maxAttempts: attempt.maxAttempts,
        startedAt: attempt.startedAt || new Date().toISOString(),
        remainingSeconds: attempt.remainingSeconds,
      },
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
      return res.status(400).json({ error: "Некорректные параметры", code: "INVALID_PARAMS" });
    }

    const { error, value } = answerSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    const result = await assessmentModel.saveAnswer({
      attemptId,
      userId: req.currentUser.id,
      questionId: value.questionId,
      optionId: value.optionId,
      optionIds: value.optionIds,
      textAnswer: value.textAnswer,
      matchPairs: value.matchPairs,
    });

    // Геймификация в фоне — не блокируем ответ API
    setImmediate(() => {
      gamificationService
        .processAnswerEvent({
          userId: req.currentUser.id,
          attemptId,
          assessmentId: result.assessmentId,
          questionId: value.questionId,
          answerCorrect: result.isCorrect,
        })
        .catch((gerr) => logger.error("Gamification answer event failed for attempt %s: %s", attemptId, gerr.message));
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function submitAnswersBatch(req, res, next) {
  try {
    const assessmentId = Number(req.params.id);
    const attemptId = Number(req.params.attemptId);

    if (!assessmentId || !attemptId) {
      return res.status(400).json({ error: "РќРµРєРѕСЂСЂРµРєС‚РЅС‹Рµ РїР°СЂР°РјРµС‚СЂС‹" });
    }

    const { error, value } = answerBatchSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    const results = await assessmentModel.saveAnswersBatch({
      attemptId,
      userId: req.currentUser.id,
      answers: value.answers,
    });

    // Геймификация в фоне — не блокируем ответ API
    setImmediate(() => {
      Promise.all(
        results.map((result) =>
          gamificationService
            .processAnswerEvent({
              userId: req.currentUser.id,
              attemptId,
              assessmentId: result.assessmentId,
              questionId: result.questionId,
              answerCorrect: result.isCorrect,
            })
            .catch((gerr) => logger.error("Gamification answer event failed for attempt %s: %s", attemptId, gerr.message)),
        ),
      );
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
      return res.status(400).json({ error: "РќРµРєРѕСЂСЂРµРєС‚РЅС‹Рµ РїР°СЂР°РјРµС‚СЂС‹" });
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
        attempt: summary.attempt,
      });
    } catch (gamificationError) {
      logger.error("Failed to process gamification for attempt %s: %s", attemptId, gamificationError.message);
    }

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "miniapp",
      action: "assessment.attempt.completed",
      entity: "assessment_attempt",
      entityId: summary.attempt.id,
      metadata: {
        assessmentId: summary.assessment.id,
        title: summary.assessment.title,
        scorePercent,
        passed,
        attemptNumber: summary.attempt.attemptNumber,
      },
    });

    res.json({
      assessment: {
        id: summary.assessment.id,
        title: summary.assessment.title,
        passScorePercent: summary.assessment.passScorePercent,
      },
      attempt: {
        id: summary.attempt.id,
        scorePercent,
        correctAnswers: summary.attempt.correctAnswers,
        totalQuestions: summary.attempt.totalQuestions,
        timeSpentSeconds: summary.attempt.timeSpentSeconds,
        attemptNumber: summary.attempt.attemptNumber,
        passed,
      },
      gamification,
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
      return res.status(400).json({ error: "РќРµРєРѕСЂСЂРµРєС‚РЅС‹Рµ РїР°СЂР°РјРµС‚СЂС‹" });
    }

    const result = await assessmentModel.getAttemptResult({
      assessmentId,
      attemptId,
      userId: req.currentUser.id,
    });

    if (!result) {
      return res.status(404).json({ error: "Р РµР·СѓР»СЊС‚Р°С‚ РЅРµ РЅР°Р№РґРµРЅ" });
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
      roleName: req.currentUser.roleName,
      branchId: req.currentUser.branchId,
    });
    if (!existing) {
      return res.status(404).json({ error: "РђС‚С‚РµСЃС‚Р°С†РёСЏ РЅРµ РЅР°Р№РґРµРЅР°" });
    }

    const hasInProgressAttempts = await assessmentModel.hasInProgressAttempts(assessmentId);
    const canEditParameters = !hasInProgressAttempts;

    const payload = {
      ...req.body,
      branchIds: req.currentUser.roleName === "manager" ? [req.currentUser.branchId] : req.body.branchIds,
    };

    const { error, value } = baseSchema.validate(payload, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    const targets = await prepareTargets(value, req.currentUser);

    if (hasInProgressAttempts) {
      const hasParameterChanges =
        Number(value.timeLimitMinutes) !== Number(existing.timeLimitMinutes) ||
        Number(value.passScorePercent) !== Number(existing.passScorePercent) ||
        Number(value.maxAttempts) !== Number(existing.maxAttempts);

      if (hasParameterChanges) {
        return res.status(409).json({
          error: "Нельзя менять параметры аттестации при активных попытках",
        });
      }

      const currentQuestionsCount = Array.isArray(existing.questions) ? existing.questions.length : 0;
      if (Array.isArray(value.questions) && value.questions.length < currentQuestionsCount) {
        return res.status(409).json({
          error: "Нельзя удалять вопросы при активных попытках",
        });
      }
    }

    // Р”Р°РЅРЅС‹Рµ РґР»СЏ РѕР±РЅРѕРІР»РµРЅРёСЏ - РёСЃРїРѕР»СЊР·СѓРµРј СЃС‚Р°СЂС‹Рµ Р·РЅР°С‡РµРЅРёСЏ РїР°СЂР°РјРµС‚СЂРѕРІ РµСЃР»Рё СЃС‚Р°С‚СѓСЃ РЅРµ pending
    const assessmentData = {
      title: value.title.trim(),
      description: value.description?.trim() || "",
      openAt: new Date(value.openAt),
      closeAt: new Date(value.closeAt),
      timeLimitMinutes: canEditParameters ? value.timeLimitMinutes : existing.timeLimitMinutes,
      passScorePercent: canEditParameters ? value.passScorePercent : existing.passScorePercent,
      maxAttempts: canEditParameters ? value.maxAttempts : existing.maxAttempts,
    };

    const questions = normalizeQuestionPayload(value.questions);

    await assessmentModel.updateAssessment(assessmentId, {
      assessment: assessmentData,
      questions,
      branchIds: canEditParameters ? targets.branchIds : undefined,
      userIds: canEditParameters ? targets.userIds : undefined,
      positionIds: canEditParameters ? targets.positionIds : undefined,
      userId: req.currentUser.id,
    });

    const updated = await assessmentModel.findAssessmentByIdForManager(assessmentId, {
      userId: req.currentUser.id,
      roleName: req.currentUser.roleName,
      branchId: req.currentUser.branchId,
    });

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "assessment.updated",
      entity: "assessment",
      entityId: assessmentId,
      metadata: {
        title: updated.title,
        openAt: updated.openAt,
        closeAt: updated.closeAt,
        questionCount: questions.length,
      },
    });

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
      roleName: req.currentUser.roleName,
      branchId: req.currentUser.branchId,
    });
    if (!existing) {
      return res.status(404).json({ error: "РђС‚С‚РµСЃС‚Р°С†РёСЏ РЅРµ РЅР°Р№РґРµРЅР°" });
    }

    if (new Date(existing.openAt) <= new Date()) {
      return res.status(400).json({ error: "РђС‚С‚РµСЃС‚Р°С†РёСЋ РЅРµР»СЊР·СЏ СѓРґР°Р»РёС‚СЊ РїРѕСЃР»Рµ РѕС‚РєСЂС‹С‚РёСЏ" });
    }

    const hasAttempts = await assessmentModel.hasAttempts(assessmentId);
    if (hasAttempts) {
      return res.status(400).json({ error: "РђС‚С‚РµСЃС‚Р°С†РёСЋ РЅРµР»СЊР·СЏ СѓРґР°Р»РёС‚СЊ, С‚Р°Рє РєР°Рє СѓР¶Рµ РµСЃС‚СЊ РїРѕРїС‹С‚РєРё" });
    }

    await assessmentModel.deleteAssessment(assessmentId);

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "assessment.deleted",
      entity: "assessment",
      entityId: assessmentId,
      metadata: {
        title: existing.title,
      },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function getUserAttemptHistory(req, res, next) {
  try {
    const userId = req.currentUser.id;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const { pool } = require("../../../../../config/database");
    const [rows] = await pool.query(
      `SELECT
        aa.id AS attempt_id,
        aa.attempt_number,
        aa.status,
        aa.score_percent,
        aa.started_at,
        aa.completed_at,
        a.id AS assessment_id,
        a.title AS assessment_title,
        a.pass_score_percent
       FROM assessment_attempts aa
       JOIN assessments a ON a.id = aa.assessment_id
       WHERE aa.user_id = ?
       ORDER BY aa.started_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset],
    );

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM assessment_attempts WHERE user_id = ?`, [userId]);

    res.json({
      attempts: rows.map((row) => ({
        attemptId: row.attempt_id,
        attemptNumber: row.attempt_number,
        status: row.status,
        scorePercent: row.score_percent != null ? Math.round(row.score_percent) : null,
        passed: row.score_percent != null ? row.score_percent >= row.pass_score_percent : null,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        assessmentId: row.assessment_id,
        assessmentTitle: row.assessment_title,
        passScorePercent: row.pass_score_percent,
      })),
      total: Number(countRows[0]?.total || 0),
      limit,
      offset,
    });
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
  submitAnswersBatch,
  completeAttempt,
  getAttemptResultController,
  getUserAttemptHistory,
};
