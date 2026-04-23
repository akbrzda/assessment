const coursesService = require("./service");
const contentService = require("./contentService");
const assignmentsRepo = require("../courseAssignments.repository");
const progressRepo = require("../courseProgress.repository");
const analyticsRepo = require("../courseAnalytics.repository");
const { pool } = require("../../../config/database");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const {
  createCourseSchema,
  updateCourseSchema,
  createSectionSchema,
  updateSectionSchema,
  createTopicSchema,
  updateTopicSchema,
  reorderSectionsSchema,
  reorderTopicsSchema,
} = require("./validators");

const COURSE_COVERS_UPLOAD_DIR = path.join(__dirname, "../../../../../uploads/courses");

const courseCoverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(COURSE_COVERS_UPLOAD_DIR)) {
      fs.mkdirSync(COURSE_COVERS_UPLOAD_DIR, { recursive: true });
    }
    cb(null, COURSE_COVERS_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `course-cover-${uniqueSuffix}${extension}`);
  },
});

const uploadCourseCoverFile = multer({
  storage: courseCoverStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extension = allowedTypes.test(path.extname(file.originalname || "").toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype || "");
    if (extension && mimeType) {
      return cb(null, true);
    }
    cb(new Error("Разрешены только изображения: jpeg, jpg, png, webp, gif"));
  },
}).single("cover");

function parseId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function validate(schema, body, res) {
  const { error, value } = schema.validate(body, { abortEarly: false });
  if (error) {
    res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    return null;
  }
  return value;
}

// - урс -

async function listCourses(req, res, next) {
  try {
    const status = req.query.status;
    const search = req.query.search ? String(req.query.search).trim() : undefined;
    const courses = await coursesService.listCourses({ status, search });
    res.json({ courses });
  } catch (error) {
    next(error);
  }
}

async function getCourse(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    if (!courseId) return res.status(400).json({ error: "екорректный идентификатор курса" });
    const course = await coursesService.getCourse(courseId);
    res.json({ course });
  } catch (error) {
    next(error);
  }
}

async function createCourse(req, res, next) {
  try {
    const value = validate(createCourseSchema, req.body, res);
    if (!value) return;
    const course = await coursesService.createCourse(value, req.user.id, req);
    res.status(201).json({ course });
  } catch (error) {
    next(error);
  }
}

async function updateCourse(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    if (!courseId) return res.status(400).json({ error: "екорректный идентификатор курса" });
    const value = validate(updateCourseSchema, req.body, res);
    if (!value) return;
    const course = await coursesService.updateCourse(courseId, value, req.user.id, req);
    res.json({ course });
  } catch (error) {
    next(error);
  }
}

async function uploadCourseCover(req, res, next) {
  uploadCourseCoverFile(req, res, async (uploadError) => {
    if (uploadError) {
      return res.status(400).json({ error: uploadError.message });
    }

    const courseId = parseId(req.params.id);
    if (!courseId) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: "Некорректный идентификатор курса" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Файл обложки не загружен" });
    }

    try {
      const course = await coursesService.uploadCourseCover(courseId, req.file, req.user.id, req);
      res.json({ course, coverUrl: course.coverUrl });
    } catch (error) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  });
}

async function deleteCourse(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    if (!courseId) return res.status(400).json({ error: "екорректный идентификатор курса" });
    await coursesService.deleteCourse(courseId, req);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function publishCourse(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    if (!courseId) return res.status(400).json({ error: "екорректный идентификатор курса" });
    const course = await coursesService.publishCourse(courseId, req.user.id, req);
    res.json({ course });
  } catch (error) {
    next(error);
  }
}

async function archiveCourse(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    if (!courseId) return res.status(400).json({ error: "екорректный идентификатор курса" });
    const course = await coursesService.archiveCourse(courseId, req.user.id, req);
    res.json({ course });
  } catch (error) {
    next(error);
  }
}

// - азделы -

async function createSection(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    if (!courseId) return res.status(400).json({ error: "екорректный идентификатор курса" });
    const value = validate(createSectionSchema, req.body, res);
    if (!value) return;
    const result = await contentService.createSection(courseId, value, req.user.id, req);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function updateSection(req, res, next) {
  try {
    const sectionId = parseId(req.params.sectionId);
    if (!sectionId) return res.status(400).json({ error: "екорректный идентификатор раздела" });
    const value = validate(updateSectionSchema, req.body, res);
    if (!value) return;
    const result = await contentService.updateSection(sectionId, value, req.user.id, req);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function deleteSection(req, res, next) {
  try {
    const sectionId = parseId(req.params.sectionId);
    if (!sectionId) return res.status(400).json({ error: "екорректный идентификатор раздела" });
    const result = await contentService.deleteSection(sectionId, req.user.id, req);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// - Темы -

async function createTopic(req, res, next) {
  try {
    const sectionId = parseId(req.params.sectionId);
    if (!sectionId) return res.status(400).json({ error: "екорректный идентификатор раздела" });
    const value = validate(createTopicSchema, req.body, res);
    if (!value) return;
    const result = await contentService.createTopic(sectionId, value, req.user.id, req);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function reorderSections(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    if (!courseId) return res.status(400).json({ error: "Некорректный идентификатор курса" });
    const value = validate(reorderSectionsSchema, req.body, res);
    if (!value) return;
    const result = await contentService.reorderSections(courseId, value.sectionIds, req.user.id, req);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function reorderTopics(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    const sectionId = parseId(req.params.sectionId);
    if (!courseId || !sectionId) return res.status(400).json({ error: "Некорректные параметры" });
    const value = validate(reorderTopicsSchema, req.body, res);
    if (!value) return;
    const result = await contentService.reorderTopics(courseId, sectionId, value.topicIds, req.user.id, req);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function updateTopic(req, res, next) {
  try {
    const topicId = parseId(req.params.topicId);
    if (!topicId) return res.status(400).json({ error: "екорректный идентификатор темы" });
    const value = validate(updateTopicSchema, req.body, res);
    if (!value) return;
    const result = await contentService.updateTopic(topicId, value, req.user.id, req);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function deleteTopic(req, res, next) {
  try {
    const topicId = parseId(req.params.topicId);
    if (!topicId) return res.status(400).json({ error: "екорректный идентификатор темы" });
    const result = await contentService.deleteTopic(topicId, req.user.id, req);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ─── Назначения ──────────────────────────────────────────────────────────────

async function getTargets(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    if (!courseId) return res.status(400).json({ error: "Некорректный идентификатор курса" });
    const targets = await assignmentsRepo.getTargets(courseId);
    res.json(targets);
  } catch (error) {
    next(error);
  }
}

async function updateTargets(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    if (!courseId) return res.status(400).json({ error: "Некорректный идентификатор курса" });

    const positionIds = (req.body.positionIds || []).map(Number).filter((n) => n > 0);
    const branchIds = (req.body.branchIds || []).map(Number).filter((n) => n > 0);

    await assignmentsRepo.replaceTargets(courseId, { positionIds, branchIds });
    const targets = await assignmentsRepo.getTargets(courseId);
    res.json(targets);
  } catch (error) {
    next(error);
  }
}

async function getAssignments(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    if (!courseId) return res.status(400).json({ error: "Некорректный идентификатор курса" });
    const assignments = await assignmentsRepo.getAssignments(courseId);
    res.json({ assignments });
  } catch (error) {
    next(error);
  }
}

async function addAssignment(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    if (!courseId) return res.status(400).json({ error: "Некорректный идентификатор курса" });

    const userId = Number(req.body.userId);
    if (!userId || userId <= 0) return res.status(400).json({ error: "Некорректный идентификатор пользователя" });

    const deadlineAt = req.body.deadlineAt ? new Date(req.body.deadlineAt) : null;
    if (deadlineAt && Number.isNaN(deadlineAt.getTime())) {
      return res.status(400).json({ error: "Некорректный формат даты дедлайна" });
    }

    await assignmentsRepo.addAssignment(courseId, userId, req.user.id, deadlineAt ? deadlineAt.toISOString().slice(0, 19).replace("T", " ") : null);
    const assignments = await assignmentsRepo.getAssignments(courseId);
    res.status(201).json({ assignments });
  } catch (error) {
    next(error);
  }
}

async function closeAssignment(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    const userId = parseId(req.params.userId);
    if (!courseId || !userId) return res.status(400).json({ error: "Некорректные параметры" });

    const changed = await assignmentsRepo.closeAssignment(courseId, userId, req.user.id);
    if (!changed) {
      return res.status(404).json({ error: "Назначение пользователя не найдено" });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO course_user_progress
          (course_id, user_id, status, progress_percent, completed_modules_count, total_modules_count, assigned_at, deadline_at, closed_at, closed_by, created_at, updated_at)
         VALUES (?, ?, 'closed', 0, 0, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP(), ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE
           status = 'closed',
           closed_at = UTC_TIMESTAMP(),
           closed_by = VALUES(closed_by),
           deadline_at = IFNULL(deadline_at, UTC_TIMESTAMP()),
           updated_at = UTC_TIMESTAMP()`,
        [courseId, userId, req.user.id],
      );
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    const assignments = await assignmentsRepo.getAssignments(courseId);
    res.json({ assignments });
  } catch (error) {
    next(error);
  }
}

async function removeAssignment(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    const userId = parseId(req.params.userId);
    if (!courseId || !userId) return res.status(400).json({ error: "Некорректные параметры" });

    await assignmentsRepo.removeAssignment(courseId, userId);
    const assignments = await assignmentsRepo.getAssignments(courseId);
    res.json({ assignments });
  } catch (error) {
    next(error);
  }
}

// ─── Прогресс пользователей ───────────────────────────────────────────────────

async function getCourseUsers(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    if (!courseId) return res.status(400).json({ error: "Некорректный идентификатор курса" });
    const users = await progressRepo.getAdminUsersProgress(courseId);
    res.json({ users });
  } catch (error) {
    next(error);
  }
}

async function getCourseUserProgress(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    const userId = parseId(req.params.userId);
    if (!courseId || !userId) return res.status(400).json({ error: "Некорректные параметры" });
    const progress = await progressRepo.getAdminUserDetailedProgress(courseId, userId);
    if (!progress) return res.status(404).json({ error: "Прогресс пользователя не найден" });
    res.json({ progress });
  } catch (error) {
    next(error);
  }
}

async function resetCourseUserProgress(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    const userId = parseId(req.params.userId);
    if (!courseId || !userId) return res.status(400).json({ error: "Некорректные параметры" });

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await progressRepo.resetUserProgressForCourse(courseId, userId, connection);
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ─── Аналитика ────────────────────────────────────────────────────────────────

async function getAnalyticsFunnel(req, res, next) {
  try {
    const courses = await analyticsRepo.getCourseFunnelStats();
    res.json({ courses });
  } catch (error) {
    next(error);
  }
}

async function getSectionFailures(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    if (!courseId) return res.status(400).json({ error: "Некорректный идентификатор курса" });
    const sections = await analyticsRepo.getSectionFailureStats(courseId);
    res.json({ sections });
  } catch (error) {
    next(error);
  }
}

async function getCourseProgressReport(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    if (!courseId) return res.status(400).json({ error: "Некорректный идентификатор курса" });
    const report = await analyticsRepo.getCourseProgressReport(courseId);
    res.json(report);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  uploadCourseCover,
  deleteCourse,
  publishCourse,
  archiveCourse,
  createSection,
  updateSection,
  deleteSection,
  createTopic,
  reorderSections,
  reorderTopics,
  updateTopic,
  deleteTopic,
  getTargets,
  updateTargets,
  getAssignments,
  addAssignment,
  closeAssignment,
  removeAssignment,
  getCourseUsers,
  getCourseUserProgress,
  resetCourseUserProgress,
  getAnalyticsFunnel,
  getSectionFailures,
  getCourseProgressReport,
};
