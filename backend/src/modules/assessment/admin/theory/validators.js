const Joi = require("joi");

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

const publishSchema = Joi.object({
  mode: Joi.string().valid("current", "new").required(),
  requiredBlocks: Joi.array().items(blockSchema).min(1).required(),
  optionalBlocks: Joi.array().items(blockSchema).default([]),
  metadata: Joi.object().unknown(true).optional(),
});

function parseAssessmentId(rawId) {
  const assessmentId = Number(rawId);
  if (!assessmentId) {
    const error = new Error("Некорректный идентификатор аттестации");
    error.status = 400;
    throw error;
  }

  return assessmentId;
}

function validatePublishPayload(payload) {
  const { error, value } = publishSchema.validate(payload, { abortEarly: false });
  if (error) {
    const validationError = new Error(error.details.map((detail) => detail.message).join(", "));
    validationError.status = 422;
    throw validationError;
  }

  return value;
}

module.exports = {
  parseAssessmentId,
  validatePublishPayload,
};
