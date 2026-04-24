const { pool } = require("../../config/database");
const { toIsoUtc, mapCourseRow, mapSectionRow, mapTopicRow } = require("./courses.mappers");

// ─── Курс ───────────────────────────────────────────────────────────────────

async function findById(courseId, options = {}) {
  const executor = options.connection || pool;
  const lock = options.forUpdate ? " FOR UPDATE" : "";
  const [rows] = await executor.execute(
    `SELECT id, title, description, cover_url, category, tags, availability_mode, availability_days, availability_from, availability_to, status, version, final_assessment_id,
            created_by, updated_by, published_at, archived_at, created_at, updated_at
       FROM courses WHERE id = ?${lock}`,
    [courseId],
  );
  return mapCourseRow(rows[0]);
}

async function listCoursesForAdmin({ status, search } = {}) {
  const params = [];
  const filters = [];

  if (status) {
    filters.push("c.status = ?");
    params.push(status);
  }
  if (search) {
    filters.push("(c.title LIKE ? OR c.description LIKE ?)");
    const p = `%${search}%`;
    params.push(p, p);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const [rows] = await pool.execute(
    `SELECT c.id, c.title, c.description, c.cover_url, c.category, c.tags, c.availability_mode, c.availability_days, c.availability_from, c.availability_to, c.status, c.version, c.final_assessment_id,
            c.created_by, c.updated_by, c.published_at, c.archived_at, c.created_at, c.updated_at,
            (SELECT COUNT(*) FROM course_sections cs WHERE cs.course_id = c.id) AS sections_count
       FROM courses c ${where}
      ORDER BY c.updated_at DESC, c.id DESC`,
    params,
  );
  return rows.map((row) => ({
    ...mapCourseRow(row),
    sectionsCount: Number(row.sections_count || 0),
  }));
}

async function getCourseByIdForAdmin(courseId) {
  const course = await findById(courseId);
  if (!course) return null;

  const sections = await listSectionsByCourseId(courseId);
  const sectionsWithTopics = await Promise.all(sections.map(async (section) => ({ ...section, topics: await listTopicsBySectionId(section.id) })));

  const integrity = await validatePublicationIntegrity(courseId);
  return { ...course, sections: sectionsWithTopics, publication: { valid: integrity.valid, errors: integrity.errors } };
}

// ─── Разделы ────────────────────────────────────────────────────────────────

async function listSectionsByCourseId(courseId, options = {}) {
  const executor = options.connection || pool;
  const lock = options.forUpdate ? " FOR UPDATE" : "";
  const [rows] = await executor.execute(
    `SELECT id, course_id, title, description, order_index, assessment_id,
            is_required, estimated_minutes, created_at, updated_at
       FROM course_sections WHERE course_id = ? ORDER BY order_index ASC${lock}`,
    [courseId],
  );
  return rows.map(mapSectionRow);
}

async function findSectionById(sectionId, options = {}) {
  const executor = options.connection || pool;
  const lock = options.forUpdate ? " FOR UPDATE" : "";
  const [rows] = await executor.execute(
    `SELECT cs.id, cs.course_id, cs.title, cs.description, cs.order_index,
            cs.assessment_id, cs.is_required, cs.estimated_minutes,
            cs.created_at, cs.updated_at, c.status AS course_status
       FROM course_sections cs
       JOIN courses c ON c.id = cs.course_id
      WHERE cs.id = ?${lock}`,
    [sectionId],
  );
  if (!rows.length) return null;
  const row = rows[0];
  return { ...mapSectionRow(row), courseStatus: row.course_status };
}

// ─── Темы ───────────────────────────────────────────────────────────────────

async function listTopicsBySectionId(sectionId, options = {}) {
  const executor = options.connection || pool;
  const [rows] = await executor.execute(
    `SELECT id, section_id, course_id, title, order_index, is_required, has_material, content, assessment_id, created_at, updated_at
       FROM course_topics WHERE section_id = ? ORDER BY order_index ASC`,
    [sectionId],
  );
  return rows.map(mapTopicRow);
}

async function listTopicsByCourseId(courseId, options = {}) {
  const executor = options.connection || pool;
  const [rows] = await executor.execute(
    `SELECT id, section_id, course_id, title, order_index, is_required, has_material, content, assessment_id, created_at, updated_at
       FROM course_topics WHERE course_id = ? ORDER BY section_id ASC, order_index ASC`,
    [courseId],
  );
  return rows.map(mapTopicRow);
}

async function findTopicById(topicId, options = {}) {
  const executor = options.connection || pool;
  const lock = options.forUpdate ? " FOR UPDATE" : "";
  const [rows] = await executor.execute(
    `SELECT ct.id, ct.section_id, ct.course_id, ct.title, ct.order_index,
            ct.is_required, ct.has_material, ct.content, ct.assessment_id, ct.created_at, ct.updated_at,
            c.status AS course_status
       FROM course_topics ct
       JOIN courses c ON c.id = ct.course_id
      WHERE ct.id = ?${lock}`,
    [topicId],
  );
  if (!rows.length) return null;
  const row = rows[0];
  return { ...mapTopicRow(row), courseStatus: row.course_status };
}

// ─── Валидация и итоговая аттестация ────────────────────────────────────────

async function validatePublicationIntegrity(courseId, options = {}) {
  const executor = options.connection || pool;
  const course = await findById(courseId, options);
  if (!course) return { valid: false, errors: ["Курс не найден"], course: null, sections: [] };

  const sections = await listSectionsByCourseId(courseId, options);
  const errors = [];

  if (!course.finalAssessmentId) {
    errors.push("Для публикации курса необходимо назначить итоговую аттестацию");
  } else {
    const [rows] = await executor.execute("SELECT id FROM assessments WHERE id = ? LIMIT 1", [course.finalAssessmentId]);
    if (!rows.length) errors.push("Указанная итоговая аттестация курса не найдена");
  }

  if (!sections.length) {
    errors.push("Для публикации курса необходим минимум один раздел");
  }

  for (const section of sections) {
    if (!section.assessmentId) {
      errors.push(`Раздел "${section.title}": не назначен тест раздела`);
      continue;
    }
    const [aRows] = await executor.execute("SELECT id FROM assessments WHERE id = ? LIMIT 1", [section.assessmentId]);
    if (!aRows.length) {
      errors.push(`Раздел "${section.title}": тест раздела не найден`);
      continue;
    }
    const topics = await listTopicsBySectionId(section.id, options);
    if (!topics.length) {
      errors.push(`Раздел "${section.title}": должна быть хотя бы одна тема`);
      continue;
    }
    for (const topic of topics) {
      if (!topic.hasMaterial && !topic.assessmentId) {
        errors.push(`Раздел "${section.title}", тема "${topic.title}": должна содержать материал или тест`);
      }
    }
  }

  return { valid: errors.length === 0, errors, course, sections };
}

function buildCourseSnapshot(course, sections, topicsBySectionId) {
  return {
    course: {
      id: course.id,
      title: course.title,
      description: course.description,
      availabilityMode: course.availabilityMode,
      availabilityDays: course.availabilityDays,
      availabilityFrom: course.availabilityFrom,
      availabilityTo: course.availabilityTo,
      version: course.version,
      finalAssessmentId: course.finalAssessmentId,
    },
    sections: sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      orderIndex: section.orderIndex,
      assessmentId: section.assessmentId,
      isRequired: section.isRequired,
      estimatedMinutes: section.estimatedMinutes,
      topics: (topicsBySectionId[section.id] || []).map((topic) => ({
        id: topic.id,
        title: topic.title,
        orderIndex: topic.orderIndex,
        hasMaterial: topic.hasMaterial,
        assessmentId: topic.assessmentId,
      })),
    })),
  };
}

async function canAccessFinalAssessment({ courseId, userId }, options = {}) {
  const executor = options.connection || pool;

  const [courseRows] = await executor.execute("SELECT id, final_assessment_id, status FROM courses WHERE id = ? LIMIT 1", [courseId]);
  if (!courseRows.length) return { allowed: false, reason: "Курс не найден" };
  if (courseRows[0].status !== "published") return { allowed: false, reason: "Итоговая аттестация доступна только для опубликованного курса" };
  if (!courseRows[0].final_assessment_id) return { allowed: false, reason: "Итоговая аттестация для курса не настроена" };

  const [progressRows] = await executor.execute(
    `SELECT status
       FROM course_user_progress
      WHERE course_id = ? AND user_id = ?
      LIMIT 1`,
    [courseId, userId],
  );
  if (progressRows.length && progressRows[0].status === "closed") {
    return { allowed: false, reason: "Курс закрыт администратором" };
  }

  const [[agg]] = await executor.execute(
    `SELECT COUNT(CASE WHEN cs.is_required = 1 THEN 1 END) AS total,
            COUNT(
              CASE
                WHEN cs.is_required = 1
                 AND csup.status = 'passed'
                 AND COALESCE(topic_agg.completed_required_topics, 0) = COALESCE(topic_agg.total_required_topics, 0)
                THEN 1
              END
            ) AS passed
       FROM course_sections cs
       LEFT JOIN course_section_user_progress csup ON csup.section_id = cs.id AND csup.user_id = ?
       LEFT JOIN (
         SELECT ct.section_id,
                SUM(CASE WHEN ct.is_required = 1 THEN 1 ELSE 0 END) AS total_required_topics,
                SUM(CASE WHEN ct.is_required = 1 AND ctup.status = 'completed' THEN 1 ELSE 0 END) AS completed_required_topics
           FROM course_topics ct
           LEFT JOIN course_topic_user_progress ctup ON ctup.topic_id = ct.id AND ctup.user_id = ?
          WHERE ct.course_id = ?
          GROUP BY ct.section_id
       ) topic_agg ON topic_agg.section_id = cs.id
       WHERE cs.course_id = ?`,
    [userId, userId, courseId, courseId],
  );

  const total = Number(agg?.total || 0);
  const passed = Number(agg?.passed || 0);
  if (total === 0) return { allowed: false, reason: "В курсе отсутствуют обязательные разделы" };
  if (passed < total)
    return {
      allowed: false,
      reason: "Итоговая аттестация будет доступна после прохождения всех обязательных разделов",
      totalRequiredSections: total,
      passedRequiredSections: passed,
    };

  return {
    allowed: true,
    finalAssessmentId: Number(courseRows[0].final_assessment_id),
    totalRequiredSections: total,
    passedRequiredSections: passed,
  };
}

module.exports = {
  findById,
  findSectionById,
  findTopicById,
  listSectionsByCourseId,
  listTopicsBySectionId,
  listTopicsByCourseId,
  listCoursesForAdmin,
  getCourseByIdForAdmin,
  validatePublicationIntegrity,
  buildCourseSnapshot,
  canAccessFinalAssessment,
};
