const coursesService = require("./service");
const contentService = require("./contentService");
const {
  createCourseSchema,
  updateCourseSchema,
  createSectionSchema,
  updateSectionSchema,
  createTopicSchema,
  updateTopicSchema,
} = require("./validators");

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

module.exports = {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  archiveCourse,
  createSection,
  updateSection,
  deleteSection,
  createTopic,
  updateTopic,
  deleteTopic,
};
