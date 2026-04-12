const Joi = require("joi");
const courseModel = require("../../../models/courseModel");
const { logAndSend, buildActorFromRequest } = require("../../../services/auditService");

const COURSE_STATUSES = ["draft", "published", "archived"];

const createCourseSchema = Joi.object({
  title: Joi.string().trim().min(3).max(255).required(),
  description: Joi.string().allow("", null).default(""),
  finalAssessmentId: Joi.number().integer().positive().allow(null).default(null),
});

const updateCourseSchema = Joi.object({
  title: Joi.string().trim().min(3).max(255),
  description: Joi.string().allow("", null),
  finalAssessmentId: Joi.number().integer().positive().allow(null),
  status: Joi.string().valid(...COURSE_STATUSES),
}).min(1);

const createModuleSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255).required(),
  description: Joi.string().allow("", null).default(""),
  content: Joi.string().allow("", null).default(""),
  orderIndex: Joi.number().integer().min(1),
  assessmentId: Joi.number().integer().positive().allow(null).default(null),
  isRequired: Joi.boolean().default(true),
  estimatedMinutes: Joi.number().integer().min(1).max(1440).allow(null).default(null),
});

const updateModuleSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255),
  description: Joi.string().allow("", null),
  content: Joi.string().allow("", null),
  orderIndex: Joi.number().integer().min(1),
  assessmentId: Joi.number().integer().positive().allow(null),
  isRequired: Joi.boolean(),
  estimatedMinutes: Joi.number().integer().min(1).max(1440).allow(null),
}).min(1);

function parsePositiveId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

async function listCourses(req, res, next) {
  try {
    const status = req.query.status && COURSE_STATUSES.includes(req.query.status) ? req.query.status : undefined;
    const search = req.query.search ? String(req.query.search).trim() : undefined;

    const courses = await courseModel.listCoursesForAdmin({
      status,
      search,
    });

    res.json({ courses });
  } catch (error) {
    next(error);
  }
}

async function getCourse(req, res, next) {
  try {
    const courseId = parsePositiveId(req.params.id);
    if (!courseId) {
      return res.status(400).json({ error: "РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ РёРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ РєСѓСЂСЃР°" });
    }

    const course = await courseModel.getCourseByIdForAdmin(courseId);
    if (!course) {
      return res.status(404).json({ error: "РљСѓСЂСЃ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    res.json({ course });
  } catch (error) {
    next(error);
  }
}

async function createCourse(req, res, next) {
  try {
    const { error, value } = createCourseSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((item) => item.message).join(", ") });
    }

    const course = await courseModel.createCourse({
      title: value.title,
      description: value.description || "",
      finalAssessmentId: value.finalAssessmentId,
      userId: req.user.id,
    });

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.created",
      entity: "course",
      entityId: course.id,
      metadata: {
        title: course.title,
        status: course.status,
      },
    });

    res.status(201).json({ course });
  } catch (error) {
    next(error);
  }
}

async function updateCourse(req, res, next) {
  try {
    const courseId = parsePositiveId(req.params.id);
    if (!courseId) {
      return res.status(400).json({ error: "РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ РёРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ РєСѓСЂСЃР°" });
    }

    const { error, value } = updateCourseSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((item) => item.message).join(", ") });
    }

    const existing = await courseModel.findById(courseId);
    if (!existing) {
      return res.status(404).json({ error: "РљСѓСЂСЃ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    const course = await courseModel.updateCourse(courseId, {
      ...value,
      userId: req.user.id,
    });

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.updated",
      entity: "course",
      entityId: courseId,
      metadata: {
        title: course.title,
        status: course.status,
        previousStatus: existing.status,
      },
    });

    res.json({ course });
  } catch (error) {
    next(error);
  }
}

async function deleteCourse(req, res, next) {
  try {
    const courseId = parsePositiveId(req.params.id);
    if (!courseId) {
      return res.status(400).json({ error: "РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ РёРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ РєСѓСЂСЃР°" });
    }

    const existing = await courseModel.findById(courseId);
    if (!existing) {
      return res.status(404).json({ error: "РљСѓСЂСЃ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    if (existing.status === "published") {
      return res.status(409).json({ error: "РќРµР»СЊР·СЏ СѓРґР°Р»РёС‚СЊ РѕРїСѓР±Р»РёРєРѕРІР°РЅРЅС‹Р№ РєСѓСЂСЃ. РЎРЅР°С‡Р°Р»Р° РїРµСЂРµРІРµРґРёС‚Рµ РµРіРѕ РІ Р°СЂС…РёРІ." });
    }

    await courseModel.deleteCourse(courseId);

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.deleted",
      entity: "course",
      entityId: courseId,
      metadata: {
        title: existing.title,
      },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function publishCourse(req, res, next) {
  try {
    const courseId = parsePositiveId(req.params.id);
    if (!courseId) {
      return res.status(400).json({ error: "РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ РёРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ РєСѓСЂСЃР°" });
    }

    const integrity = await courseModel.validatePublicationIntegrity(courseId);
    if (!integrity.valid) {
      return res.status(422).json({
        error: "РљСѓСЂСЃ РЅРµ РіРѕС‚РѕРІ Рє РїСѓР±Р»РёРєР°С†РёРё",
        validationErrors: integrity.errors,
      });
    }

    const course = await courseModel.publishCourse(courseId, req.user.id);

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.published",
      entity: "course",
      entityId: course.id,
      metadata: {
        title: course.title,
        version: course.version,
      },
    });

    res.json({ course });
  } catch (error) {
    next(error);
  }
}

async function archiveCourse(req, res, next) {
  try {
    const courseId = parsePositiveId(req.params.id);
    if (!courseId) {
      return res.status(400).json({ error: "РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ РёРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ РєСѓСЂСЃР°" });
    }

    const existing = await courseModel.findById(courseId);
    if (!existing) {
      return res.status(404).json({ error: "РљСѓСЂСЃ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    await courseModel.archiveCourse(courseId, req.user.id);
    const course = await courseModel.findById(courseId);

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.archived",
      entity: "course",
      entityId: courseId,
      metadata: {
        title: existing.title,
      },
    });

    res.json({ course });
  } catch (error) {
    next(error);
  }
}

async function createModule(req, res, next) {
  try {
    const courseId = parsePositiveId(req.params.id);
    if (!courseId) {
      return res.status(400).json({ error: "РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ РёРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ РєСѓСЂСЃР°" });
    }

    const { error, value } = createModuleSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((item) => item.message).join(", ") });
    }

    const moduleItem = await courseModel.createCourseModule(courseId, value, req.user.id);
    const course = await courseModel.getCourseByIdForAdmin(courseId);

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.module.created",
      entity: "course_module",
      entityId: moduleItem?.id || null,
      metadata: {
        courseId,
        title: moduleItem?.title || value.title,
        assessmentId: moduleItem?.assessmentId || value.assessmentId || null,
      },
    });

    res.status(201).json({
      module: moduleItem,
      course,
    });
  } catch (error) {
    next(error);
  }
}

async function updateModule(req, res, next) {
  try {
    const moduleId = parsePositiveId(req.params.moduleId);
    if (!moduleId) {
      return res.status(400).json({ error: "РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ РёРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ РјРѕРґСѓР»СЏ" });
    }

    const { error, value } = updateModuleSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((item) => item.message).join(", ") });
    }

    const moduleItem = await courseModel.updateCourseModule(moduleId, value, req.user.id);
    const course = await courseModel.getCourseByIdForAdmin(moduleItem.courseId);

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.module.updated",
      entity: "course_module",
      entityId: moduleId,
      metadata: {
        courseId: moduleItem.courseId,
        title: moduleItem.title,
        assessmentId: moduleItem.assessmentId,
      },
    });

    res.json({
      module: moduleItem,
      course,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteModule(req, res, next) {
  try {
    const moduleId = parsePositiveId(req.params.moduleId);
    if (!moduleId) {
      return res.status(400).json({ error: "РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ РёРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ РјРѕРґСѓР»СЏ" });
    }

    const result = await courseModel.deleteCourseModule(moduleId, req.user.id);
    const course = await courseModel.getCourseByIdForAdmin(result.courseId);

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.module.deleted",
      entity: "course_module",
      entityId: moduleId,
      metadata: {
        courseId: result.courseId,
      },
    });

    res.json({ course });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  archiveCourse,
  createModule,
  updateModule,
  deleteModule,
};

