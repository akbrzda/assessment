const Joi = require("joi");

const availabilitySchema = {
  availabilityMode: Joi.string().valid("unlimited", "relative_days", "fixed_dates").default("unlimited"),
  availabilityDays: Joi.number().integer().min(1).max(3650).allow(null).default(null),
  availabilityFrom: Joi.date().iso().allow(null).default(null),
  availabilityTo: Joi.date().iso().allow(null).default(null),
};

function withAvailabilityValidation(schema) {
  return schema.custom((value, helpers) => {
    if (value.availabilityMode === "relative_days" && !value.availabilityDays) {
      return helpers.error("any.invalid", { message: "Для режима срока в днях нужно указать количество дней" });
    }
    if (value.availabilityMode === "fixed_dates") {
      if (!value.availabilityFrom || !value.availabilityTo) {
        return helpers.error("any.invalid", { message: "Для фиксированных дат нужно указать начало и окончание действия курса" });
      }
      if (new Date(value.availabilityFrom).getTime() > new Date(value.availabilityTo).getTime()) {
        return helpers.error("any.invalid", { message: "Дата начала действия курса не может быть позже даты окончания" });
      }
    }
    return value;
  });
}

const createCourseSchema = Joi.object({
  title: Joi.string().trim().min(3).max(255).required(),
  description: Joi.string().allow("", null).default(""),
  coverUrl: Joi.string().uri().max(1024).allow("", null).default(null),
  category: Joi.string().trim().max(128).allow("", null).default(null),
  tags: Joi.array().items(Joi.string().trim().min(1).max(64)).max(20).default([]),
  finalAssessmentId: Joi.number().integer().positive().allow(null).default(null),
  ...availabilitySchema,
});

const updateCourseSchema = Joi.object({
  title: Joi.string().trim().min(3).max(255),
  description: Joi.string().allow("", null),
  coverUrl: Joi.string().uri().max(1024).allow("", null),
  category: Joi.string().trim().max(128).allow("", null),
  tags: Joi.array().items(Joi.string().trim().min(1).max(64)).max(20),
  finalAssessmentId: Joi.number().integer().positive().allow(null),
  status: Joi.string().valid("published", "archived"),
  ...availabilitySchema,
}).min(1);

const createSectionSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255).required(),
  description: Joi.string().allow("", null).default(""),
  orderIndex: Joi.number().integer().min(1),
  assessmentId: Joi.number().integer().positive().allow(null).default(null),
  isRequired: Joi.boolean().default(true),
  estimatedMinutes: Joi.number().integer().min(1).max(1440).allow(null).default(null),
  testShuffleQuestions: Joi.boolean().default(true),
  testShuffleOptions: Joi.boolean().default(true),
  testShowResultsAfterCompletion: Joi.boolean().default(true),
});

const updateSectionSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255),
  description: Joi.string().allow("", null),
  orderIndex: Joi.number().integer().min(1),
  assessmentId: Joi.number().integer().positive().allow(null),
  isRequired: Joi.boolean(),
  estimatedMinutes: Joi.number().integer().min(1).max(1440).allow(null),
  testShuffleQuestions: Joi.boolean(),
  testShuffleOptions: Joi.boolean(),
  testShowResultsAfterCompletion: Joi.boolean(),
}).min(1);

const createTopicSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255).required(),
  orderIndex: Joi.number().integer().min(1),
  isRequired: Joi.boolean().default(true),
  hasMaterial: Joi.boolean().default(false),
  content: Joi.string().allow("", null).default(null),
}).custom((value, helpers) => {
  if (!value.hasMaterial) {
    return helpers.error("any.invalid");
  }
  return value;
}, "Подтема должна содержать материал");

const updateTopicSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255),
  orderIndex: Joi.number().integer().min(1),
  isRequired: Joi.boolean(),
  hasMaterial: Joi.boolean(),
  content: Joi.string().allow("", null),
}).min(1);

const reorderSectionsSchema = Joi.object({
  sectionIds: Joi.array().items(Joi.number().integer().positive()).min(1).unique().required(),
});

const reorderTopicsSchema = Joi.object({
  topicIds: Joi.array().items(Joi.number().integer().positive()).min(1).unique().required(),
});

module.exports = {
  createCourseSchema: withAvailabilityValidation(createCourseSchema),
  updateCourseSchema: withAvailabilityValidation(updateCourseSchema),
  createSectionSchema,
  updateSectionSchema,
  createTopicSchema,
  updateTopicSchema,
  reorderSectionsSchema,
  reorderTopicsSchema,
};
