const Joi = require("joi");

const createCourseSchema = Joi.object({
  title: Joi.string().trim().min(3).max(255).required(),
  description: Joi.string().allow("", null).default(""),
  finalAssessmentId: Joi.number().integer().positive().allow(null).default(null),
});

const updateCourseSchema = Joi.object({
  title: Joi.string().trim().min(3).max(255),
  description: Joi.string().allow("", null),
  finalAssessmentId: Joi.number().integer().positive().allow(null),
  status: Joi.string().valid("draft", "published", "archived"),
}).min(1);

const createSectionSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255).required(),
  description: Joi.string().allow("", null).default(""),
  orderIndex: Joi.number().integer().min(1),
  assessmentId: Joi.number().integer().positive().allow(null).default(null),
  isRequired: Joi.boolean().default(true),
  estimatedMinutes: Joi.number().integer().min(1).max(1440).allow(null).default(null),
});

const updateSectionSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255),
  description: Joi.string().allow("", null),
  orderIndex: Joi.number().integer().min(1),
  assessmentId: Joi.number().integer().positive().allow(null),
  isRequired: Joi.boolean(),
  estimatedMinutes: Joi.number().integer().min(1).max(1440).allow(null),
}).min(1);

const createTopicSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255).required(),
  orderIndex: Joi.number().integer().min(1),
  hasMaterial: Joi.boolean().default(false),
  content: Joi.string().allow("", null).default(null),
  assessmentId: Joi.number().integer().positive().allow(null).default(null),
}).custom((value, helpers) => {
  if (!value.hasMaterial && !value.assessmentId) {
    return helpers.error("any.invalid");
  }
  return value;
}, "Тема должна содержать материал или тест");

const updateTopicSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255),
  orderIndex: Joi.number().integer().min(1),
  hasMaterial: Joi.boolean(),
  content: Joi.string().allow("", null),
  assessmentId: Joi.number().integer().positive().allow(null),
}).min(1);

module.exports = {
  createCourseSchema,
  updateCourseSchema,
  createSectionSchema,
  updateSectionSchema,
  createTopicSchema,
  updateTopicSchema,
};
