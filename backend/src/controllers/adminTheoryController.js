const Joi = require("joi");
const theoryModel = require("../models/theoryModel");

const blockSchema = Joi.object({
  title: Joi.string().trim().min(3).max(255).required(),
  type: Joi.string().valid("text", "video", "link").required(),
  content: Joi.when("type", {
    is: "text",
    then: Joi.string().trim().min(1).required(),
    otherwise: Joi.string().allow("", null),
  }),
  videoUrl: Joi.when("type", {
    is: "video",
    then: Joi.string().trim().uri().required(),
    otherwise: Joi.string().trim().uri().allow("", null),
  }),
  externalUrl: Joi.when("type", {
    is: "link",
    then: Joi.string().trim().uri().required(),
    otherwise: Joi.string().trim().uri().allow("", null),
  }),
  metadata: Joi.object().unknown(true).optional(),
});

const saveDraftSchema = Joi.object({
  requiredBlocks: Joi.array().items(blockSchema).min(1).required(),
  optionalBlocks: Joi.array().items(blockSchema).default([]),
  metadata: Joi.object().unknown(true).optional(),
});

const publishSchema = Joi.object({
  mode: Joi.string().valid("current", "new").required(),
});

async function getTheory(req, res, next) {
  try {
    const assessmentId = Number(req.params.id);
    if (!assessmentId) {
      return res.status(400).json({ error: "Некорректный идентификатор аттестации" });
    }

    const theory = await theoryModel.getTheoryForAdmin(assessmentId);
    if (!theory) {
      return res.status(404).json({ error: "Аттестация не найдена" });
    }

    res.json({ theory });
  } catch (error) {
    next(error);
  }
}

async function saveDraft(req, res, next) {
  try {
    const assessmentId = Number(req.params.id);
    if (!assessmentId) {
      return res.status(400).json({ error: "Некорректный идентификатор аттестации" });
    }

    const { error, value } = saveDraftSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((detail) => detail.message).join(", ") });
    }

    const draft = await theoryModel.saveDraftVersion({
      assessmentId,
      requiredBlocks: value.requiredBlocks,
      optionalBlocks: value.optionalBlocks || [],
      metadata: value.metadata ?? null,
    });

    res.json({ draft });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}

async function publish(req, res, next) {
  try {
    const assessmentId = Number(req.params.id);
    if (!assessmentId) {
      return res.status(400).json({ error: "Некорректный идентификатор аттестации" });
    }

    const { error, value } = publishSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((detail) => detail.message).join(", ") });
    }

    const result = await theoryModel.publishDraftVersion({
      assessmentId,
      mode: value.mode,
    });

    res.json({
      version: result.version,
      createdNewVersion: result.createdNewVersion,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = {
  getTheory,
  saveDraft,
  publish,
};
