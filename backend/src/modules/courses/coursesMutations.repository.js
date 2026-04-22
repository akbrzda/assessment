/**
 * Гранулярные SQL-операции записи для курсов, разделов и тем.
 * Каждая функция выполняет ровно одно SQL-действие.
 * Управление транзакциями — на уровне сервиса (admin/service.js).
 */

// --- Курс -------------------------------------------------------------------

async function insertCourse(
  { title, description, coverUrl, category, tags, finalAssessmentId, availabilityMode, availabilityDays, availabilityFrom, availabilityTo, userId },
  connection,
) {
  const [result] = await connection.execute(
    `INSERT INTO courses
      (title, description, cover_url, category, tags, availability_mode, availability_days, availability_from, availability_to, status, version, final_assessment_id, created_by, updated_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [
      title,
      description || "",
      coverUrl || null,
      category || null,
      JSON.stringify(Array.isArray(tags) ? tags : []),
      availabilityMode || "unlimited",
      availabilityDays || null,
      availabilityFrom || null,
      availabilityTo || null,
      finalAssessmentId || null,
      userId || null,
      userId || null,
    ],
  );
  return result.insertId;
}

async function updateCourseFields(courseId, fields, userId, connection) {
  const cols = [];
  const params = [];

  if (fields.title !== undefined) {
    cols.push("title = ?");
    params.push(fields.title);
  }
  if (fields.description !== undefined) {
    cols.push("description = ?");
    params.push(fields.description || "");
  }
  if (fields.coverUrl !== undefined) {
    cols.push("cover_url = ?");
    params.push(fields.coverUrl || null);
  }
  if (fields.category !== undefined) {
    cols.push("category = ?");
    params.push(fields.category || null);
  }
  if (fields.tags !== undefined) {
    cols.push("tags = ?");
    params.push(JSON.stringify(Array.isArray(fields.tags) ? fields.tags : []));
  }
  if (fields.finalAssessmentId !== undefined) {
    cols.push("final_assessment_id = ?");
    params.push(fields.finalAssessmentId || null);
  }
  if (fields.availabilityMode !== undefined) {
    cols.push("availability_mode = ?");
    params.push(fields.availabilityMode);
  }
  if (fields.availabilityDays !== undefined) {
    cols.push("availability_days = ?");
    params.push(fields.availabilityDays || null);
  }
  if (fields.availabilityFrom !== undefined) {
    cols.push("availability_from = ?");
    params.push(fields.availabilityFrom || null);
  }
  if (fields.availabilityTo !== undefined) {
    cols.push("availability_to = ?");
    params.push(fields.availabilityTo || null);
  }
  if (fields.status !== undefined) {
    cols.push("status = ?");
    params.push(fields.status);
  }

  cols.push("updated_by = ?", "updated_at = UTC_TIMESTAMP()");
  params.push(userId || null, courseId);

  await connection.execute(`UPDATE courses SET ${cols.join(", ")} WHERE id = ?`, params);
}

async function deleteCourseById(courseId, connection) {
  await connection.execute("DELETE FROM courses WHERE id = ?", [courseId]);
}

async function checkCourseHasProgress(courseId, connection) {
  const [rows] = await connection.execute("SELECT id FROM course_user_progress WHERE course_id = ? LIMIT 1", [courseId]);
  return rows.length > 0;
}

async function publishCourseById(courseId, targetVersion, userId, connection) {
  await connection.execute(
    `UPDATE courses
        SET status = 'published', version = ?, published_at = UTC_TIMESTAMP(),
            archived_at = NULL, updated_by = ?, updated_at = UTC_TIMESTAMP()
      WHERE id = ?`,
    [targetVersion, userId || null, courseId],
  );
}

async function archiveCourseById(courseId, userId, connection) {
  await connection.execute(
    `UPDATE courses
        SET status = 'archived', archived_at = UTC_TIMESTAMP(),
            updated_by = ?, updated_at = UTC_TIMESTAMP()
      WHERE id = ?`,
    [userId || null, courseId],
  );
}

// --- Разделы ----------------------------------------------------------------

async function getNextSectionOrder(courseId, connection) {
  const [[row]] = await connection.execute("SELECT COALESCE(MAX(order_index), 0) AS max_order FROM course_sections WHERE course_id = ?", [courseId]);
  return Number(row.max_order || 0) + 1;
}

async function shiftSectionsUp(courseId, fromIndex, connection) {
  await connection.execute("UPDATE course_sections SET order_index = order_index + 1 WHERE course_id = ? AND order_index >= ?", [
    courseId,
    fromIndex,
  ]);
}

async function shiftSectionsDown(courseId, fromIndex, toIndex, connection) {
  await connection.execute("UPDATE course_sections SET order_index = order_index - 1 WHERE course_id = ? AND order_index > ? AND order_index <= ?", [
    courseId,
    fromIndex,
    toIndex,
  ]);
}

async function shiftSectionsUp2(courseId, fromIndex, toIndex, connection) {
  await connection.execute("UPDATE course_sections SET order_index = order_index + 1 WHERE course_id = ? AND order_index >= ? AND order_index < ?", [
    courseId,
    fromIndex,
    toIndex,
  ]);
}

async function insertSection(courseId, { title, description, orderIndex, assessmentId, isRequired, estimatedMinutes }, connection) {
  const [result] = await connection.execute(
    `INSERT INTO course_sections
      (course_id, title, description, order_index, assessment_id, is_required, estimated_minutes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [courseId, title, description || "", orderIndex, assessmentId || null, isRequired ? 1 : 0, estimatedMinutes || null],
  );
  return result.insertId;
}

async function updateSectionFields(sectionId, fields, connection) {
  const cols = [];
  const params = [];

  if (fields.title !== undefined) {
    cols.push("title = ?");
    params.push(fields.title);
  }
  if (fields.description !== undefined) {
    cols.push("description = ?");
    params.push(fields.description || "");
  }
  if (fields.assessmentId !== undefined) {
    cols.push("assessment_id = ?");
    params.push(fields.assessmentId || null);
  }
  if (fields.isRequired !== undefined) {
    cols.push("is_required = ?");
    params.push(fields.isRequired ? 1 : 0);
  }
  if (fields.estimatedMinutes !== undefined) {
    cols.push("estimated_minutes = ?");
    params.push(fields.estimatedMinutes || null);
  }
  if (fields.orderIndex !== undefined) {
    cols.push("order_index = ?");
    params.push(fields.orderIndex);
  }

  if (!cols.length) return;
  cols.push("updated_at = UTC_TIMESTAMP()");
  params.push(sectionId);
  await connection.execute(`UPDATE course_sections SET ${cols.join(", ")} WHERE id = ?`, params);
}

async function deleteSectionById(sectionId, connection) {
  await connection.execute("DELETE FROM course_sections WHERE id = ?", [sectionId]);
}

async function compactSectionOrder(courseId, afterIndex, connection) {
  await connection.execute("UPDATE course_sections SET order_index = order_index - 1 WHERE course_id = ? AND order_index > ?", [
    courseId,
    afterIndex,
  ]);
}

async function touchCourse(courseId, userId, bumpVersion, connection) {
  if (bumpVersion) {
    await connection.execute("UPDATE courses SET version = version + 1, updated_by = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?", [
      userId || null,
      courseId,
    ]);
  } else {
    await connection.execute("UPDATE courses SET updated_by = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?", [userId || null, courseId]);
  }
}

// --- Темы -------------------------------------------------------------------

async function getNextTopicOrder(sectionId, connection) {
  const [[row]] = await connection.execute("SELECT COALESCE(MAX(order_index), 0) AS max_order FROM course_topics WHERE section_id = ?", [sectionId]);
  return Number(row.max_order || 0) + 1;
}

async function shiftTopicsUp(sectionId, fromIndex, connection) {
  await connection.execute("UPDATE course_topics SET order_index = order_index + 1 WHERE section_id = ? AND order_index >= ?", [
    sectionId,
    fromIndex,
  ]);
}

async function shiftTopicsDown(sectionId, fromIndex, toIndex, connection) {
  await connection.execute("UPDATE course_topics SET order_index = order_index - 1 WHERE section_id = ? AND order_index > ? AND order_index <= ?", [
    sectionId,
    fromIndex,
    toIndex,
  ]);
}

async function shiftTopicsUp2(sectionId, fromIndex, toIndex, connection) {
  await connection.execute("UPDATE course_topics SET order_index = order_index + 1 WHERE section_id = ? AND order_index >= ? AND order_index < ?", [
    sectionId,
    fromIndex,
    toIndex,
  ]);
}

async function insertTopic(sectionId, courseId, { title, orderIndex, isRequired, hasMaterial, content, assessmentId }, connection) {
  const [result] = await connection.execute(
    `INSERT INTO course_topics
      (section_id, course_id, title, order_index, is_required, has_material, content, assessment_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [sectionId, courseId, title, orderIndex, isRequired === false ? 0 : 1, hasMaterial ? 1 : 0, content || null, assessmentId || null],
  );
  return result.insertId;
}

async function updateTopicFields(topicId, fields, connection) {
  const cols = [];
  const params = [];

  if (fields.title !== undefined) {
    cols.push("title = ?");
    params.push(fields.title);
  }
  if (fields.hasMaterial !== undefined) {
    cols.push("has_material = ?");
    params.push(fields.hasMaterial ? 1 : 0);
  }
  if (fields.content !== undefined) {
    cols.push("content = ?");
    params.push(fields.content || null);
  }
  if (fields.assessmentId !== undefined) {
    cols.push("assessment_id = ?");
    params.push(fields.assessmentId || null);
  }
  if (fields.orderIndex !== undefined) {
    cols.push("order_index = ?");
    params.push(fields.orderIndex);
  }
  if (fields.isRequired !== undefined) {
    cols.push("is_required = ?");
    params.push(fields.isRequired ? 1 : 0);
  }

  if (!cols.length) return;
  cols.push("updated_at = UTC_TIMESTAMP()");
  params.push(topicId);
  await connection.execute(`UPDATE course_topics SET ${cols.join(", ")} WHERE id = ?`, params);
}

async function deleteTopicById(topicId, connection) {
  await connection.execute("DELETE FROM course_topics WHERE id = ?", [topicId]);
}

async function compactTopicOrder(sectionId, afterIndex, connection) {
  await connection.execute("UPDATE course_topics SET order_index = order_index - 1 WHERE section_id = ? AND order_index > ?", [
    sectionId,
    afterIndex,
  ]);
}

async function reorderSections(courseId, sectionIds, connection) {
  await connection.execute("UPDATE course_sections SET order_index = order_index + 1000 WHERE course_id = ?", [courseId]);
  for (let index = 0; index < sectionIds.length; index += 1) {
    await connection.execute("UPDATE course_sections SET order_index = ? WHERE id = ? AND course_id = ?", [index + 1, sectionIds[index], courseId]);
  }
}

async function reorderTopics(sectionId, topicIds, connection) {
  await connection.execute("UPDATE course_topics SET order_index = order_index + 1000 WHERE section_id = ?", [sectionId]);
  for (let index = 0; index < topicIds.length; index += 1) {
    await connection.execute("UPDATE course_topics SET order_index = ? WHERE id = ? AND section_id = ?", [index + 1, topicIds[index], sectionId]);
  }
}

module.exports = {
  insertCourse,
  updateCourseFields,
  deleteCourseById,
  checkCourseHasProgress,
  publishCourseById,
  archiveCourseById,
  getNextSectionOrder,
  shiftSectionsUp,
  shiftSectionsDown,
  shiftSectionsUp2,
  insertSection,
  updateSectionFields,
  deleteSectionById,
  compactSectionOrder,
  touchCourse,
  getNextTopicOrder,
  shiftTopicsUp,
  shiftTopicsDown,
  shiftTopicsUp2,
  insertTopic,
  updateTopicFields,
  deleteTopicById,
  compactTopicOrder,
  reorderSections,
  reorderTopics,
};
