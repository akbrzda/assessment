const Joi = require("joi");
const theoryModel = require("../models/theoryModel");

const completionSchema = Joi.object({
  versionId: Joi.number().integer().positive().required(),
  timeSpentSeconds: Joi.number().integer().min(0).optional(),
  clientPayload: Joi.object().unknown(true).optional(),
});

async function getTheory(req, res, next) {
  try {
    const assessmentId = Number(req.params.id);
    if (!assessmentId) {
      return res.status(400).json({ error: "Некорректный идентификатор аттестации" });
    }

    const theory = await theoryModel.getTheoryForUser({ assessmentId, userId: req.currentUser.id });
    if (!theory) {
      return res.status(404).json({ error: "Теория не найдена или не опубликована" });
    }

    res.json({ theory });
  } catch (error) {
    next(error);
  }
}

async function completeTheory(req, res, next) {
  try {
    const assessmentId = Number(req.params.id);
    if (!assessmentId) {
      return res.status(400).json({ error: "Некорректный идентификатор аттестации" });
    }

    const { error, value } = completionSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((detail) => detail.message).join(", ") });
    }

    try {
      const completion = await theoryModel.saveCompletion({
        assessmentId,
        versionId: value.versionId,
        userId: req.currentUser.id,
        timeSpentSeconds: value.timeSpentSeconds || 0,
        clientPayload: value.clientPayload ?? null,
      });
      res.status(201).json({ completion });
    } catch (completionError) {
      if (completionError.status) {
        return res.status(completionError.status).json({
          error: completionError.message,
          code: completionError.code || "THEORY_COMPLETION_FAILED",
        });
      }
      throw completionError;
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTheory,
  completeTheory,
};
