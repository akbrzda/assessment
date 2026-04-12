const Joi = require("joi");

const createSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(64).required(),
  lastName: Joi.string().trim().min(2).max(64).required(),
  branchId: Joi.number().integer().positive().required(),
});

const updateSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(64).required(),
  lastName: Joi.string().trim().min(2).max(64).required(),
  branchId: Joi.number().integer().positive().required(),
});

const extendSchema = Joi.object({
  days: Joi.number().integer().min(1).max(30).required(),
});

function buildValidationError(error) {
  const validationError = new Error(error.details.map((detail) => detail.message).join(", "));
  validationError.status = 422;
  return validationError;
}

function parseInvitationId(rawId) {
  const invitationId = Number(rawId);
  if (Number.isInteger(invitationId) && invitationId > 0) {
    return invitationId;
  }

  const error = new Error("Invitation not found");
  error.status = 404;
  throw error;
}

function validateCreatePayload(payload) {
  const { error, value } = createSchema.validate(payload, { abortEarly: false });
  if (error) {
    throw buildValidationError(error);
  }
  return value;
}

function validateUpdatePayload(payload) {
  const { error, value } = updateSchema.validate(payload, { abortEarly: false });
  if (error) {
    throw buildValidationError(error);
  }
  return value;
}

function validateExtendPayload(payload) {
  const { error, value } = extendSchema.validate(payload, { abortEarly: false });
  if (error) {
    throw buildValidationError(error);
  }
  return value;
}

module.exports = {
  parseInvitationId,
  validateCreatePayload,
  validateUpdatePayload,
  validateExtendPayload,
};
