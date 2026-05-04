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
const COURSE_MEDIA_UPLOAD_DIR = path.join(__dirname, "../../../../../uploads/course-media");
const COURSE_MEDIA_IMAGE_MAX_SIZE = 50 * 1024 * 1024;
const COURSE_MEDIA_VIDEO_MAX_SIZE = 1024 * 1024 * 1024;
const COURSE_MEDIA_ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".ogg", ".mov"];

function resolveMediaMimeType(extension) {
  const mimeTypesByExtension = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".ogg": "video/ogg",
    ".mov": "video/quicktime",
  };

  return mimeTypesByExtension[extension] || "application/octet-stream";
}

function resolveMediaTypeByExtension(extension) {
  return [".mp4", ".webm", ".ogg", ".mov"].includes(extension) ? "video" : "image";
}

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

const courseMediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(COURSE_MEDIA_UPLOAD_DIR)) {
      fs.mkdirSync(COURSE_MEDIA_UPLOAD_DIR, { recursive: true });
    }
    cb(null, COURSE_MEDIA_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `course-media-${uniqueSuffix}${extension}`);
  },
});

const uploadCourseMediaFile = multer({
  storage: courseMediaStorage,
  limits: { fileSize: COURSE_MEDIA_VIDEO_MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const mimeType = String(file.mimetype || "").toLowerCase();
    const imageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    const videoTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];

    if (!imageTypes.includes(mimeType) && !videoTypes.includes(mimeType)) {
      cb(new Error("Разрешены только изображения (jpg, png, webp, gif) и видео (mp4, webm, ogg, mov)"));
      return;
    }

    cb(null, true);
  },
}).single("media");

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

async function listCourseMedia(req, res, next) {
  try {
    if (!fs.existsSync(COURSE_MEDIA_UPLOAD_DIR)) {
      return res.json({ items: [] });
    }

    const entries = fs.readdirSync(COURSE_MEDIA_UPLOAD_DIR, { withFileTypes: true });
    const items = entries
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const extension = path.extname(entry.name || "").toLowerCase();
        if (!COURSE_MEDIA_ALLOWED_EXTENSIONS.includes(extension)) {
          return null;
        }

        const fullPath = path.join(COURSE_MEDIA_UPLOAD_DIR, entry.name);
        const stats = fs.statSync(fullPath);
        const mimeType = resolveMediaMimeType(extension);

        return {
          fileName: entry.name,
          mediaUrl: `/uploads/course-media/${entry.name}`,
          mediaType: resolveMediaTypeByExtension(extension),
          mimeType,
          size: Number(stats.size || 0),
          updatedAt: stats.mtime ? stats.mtime.toISOString() : null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const left = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const right = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return right - left;
      });

    return res.json({ items });
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

async function getCoursePreview(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    if (!courseId) return res.status(400).json({ error: "Некорректный идентификатор курса" });
    const preview = await coursesService.getCoursePreview(courseId);
    res.json(preview);
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

async function uploadCourseMedia(req, res, next) {
  uploadCourseMediaFile(req, res, async (uploadError) => {
    if (uploadError) {
      if (uploadError.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "Превышен лимит размера файла. Видео до 1024 МБ, изображения до 50 МБ." });
      }
      return res.status(400).json({ error: uploadError.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Файл медиа не загружен" });
    }

    try {
      const mimeType = String(req.file.mimetype || "").toLowerCase();
      const isVideo = mimeType.startsWith("video/");
      const maxAllowedSize = isVideo ? COURSE_MEDIA_VIDEO_MAX_SIZE : COURSE_MEDIA_IMAGE_MAX_SIZE;

      if (Number(req.file.size || 0) > maxAllowedSize) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          error: isVideo ? "Превышен лимит видео. Максимальный размер — 1024 МБ." : "Превышен лимит изображения. Максимальный размер — 50 МБ.",
        });
      }

      const mediaType = isVideo ? "video" : "image";
      const mediaUrl = `/uploads/course-media/${req.file.filename}`;

      res.json({
        mediaUrl,
        mediaType,
        mimeType,
        originalName: req.file.originalname,
      });
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
  listCourseMedia,
  getCourse,
  getCoursePreview,
  createCourse,
  updateCourse,
  uploadCourseCover,
  uploadCourseMedia,
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
