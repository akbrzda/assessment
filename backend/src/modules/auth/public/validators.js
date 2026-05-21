const Joi = require("joi");

const registrationSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(64).optional().allow(null),
  lastName: Joi.string().trim().min(2).max(64).optional().allow(null),
  positionId: Joi.number().integer().positive().optional().allow(null),
  branchId: Joi.number().integer().positive().optional().allow(null),
  inviteCode: Joi.string().trim().allow("", null),
  contact: Joi.object({
    source: Joi.string().trim().valid("telegram_contact", "max_contact").required(),
    userId: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string().trim().min(1)).required(),
    phoneNumber: Joi.string().trim().min(6).max(32).required(),
  })
    .optional()
    .allow(null),
});

const profileUpdateSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(64).required(),
  lastName: Joi.string().trim().min(2).max(64).required(),
});

const timezoneSchema = Joi.object({
  timezone: Joi.string().trim().min(1).max(64).required(),
});

function buildValidationError(error) {
  const validationError = new Error(error.details.map((detail) => detail.message).join(", "));
  validationError.status = 422;
  return validationError;
}

function validateRegistrationPayload(payload) {
  const { error, value } = registrationSchema.validate(payload, { abortEarly: false });
  if (error) {
    throw buildValidationError(error);
  }
  return value;
}

function validateProfilePayload(payload) {
  const { error, value } = profileUpdateSchema.validate(payload, { abortEarly: false });
  if (error) {
    throw buildValidationError(error);
  }
  return value;
}

function validateTimezonePayload(payload) {
  const { error, value } = timezoneSchema.validate(payload, { abortEarly: false });
  if (error) {
    throw buildValidationError(error);
  }
  return value;
}

module.exports = {
  validateRegistrationPayload,
  validateProfilePayload,
  validateTimezonePayload,
};
