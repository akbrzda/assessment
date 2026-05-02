const Joi = require("joi");

const createSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(64).required(),
  lastName: Joi.string().trim().min(2).max(64).required(),
  branchId: Joi.number().integer().positive().required(),
  positionId: Joi.number().integer().positive().required(),
  phone: Joi.string().trim().max(20).optional().allow("", null),
  existingUserId: Joi.number().integer().positive().optional(),
});

const updateSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(64).required(),
  lastName: Joi.string().trim().min(2).max(64).required(),
  branchId: Joi.number().integer().positive().required(),
  positionId: Joi.number().integer().positive().optional(),
  phone: Joi.string().trim().max(20).optional().allow("", null),
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

module.exports = {
  parseInvitationId,
  validateCreatePayload,
  validateUpdatePayload,
};
