function toIsoUtc(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function mapCourseRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description || "",
    status: row.status,
    version: Number(row.version || 0),
    finalAssessmentId: row.final_assessment_id ? Number(row.final_assessment_id) : null,
    createdBy: row.created_by ? Number(row.created_by) : null,
    updatedBy: row.updated_by ? Number(row.updated_by) : null,
    publishedAt: toIsoUtc(row.published_at),
    archivedAt: toIsoUtc(row.archived_at),
    createdAt: toIsoUtc(row.created_at),
    updatedAt: toIsoUtc(row.updated_at),
  };
}

function mapSectionRow(row) {
  return {
    id: Number(row.id),
    courseId: Number(row.course_id),
    title: row.title,
    description: row.description || "",
    orderIndex: Number(row.order_index),
    assessmentId: row.assessment_id ? Number(row.assessment_id) : null,
    isRequired: Boolean(row.is_required),
    estimatedMinutes: row.estimated_minutes ? Number(row.estimated_minutes) : null,
    createdAt: toIsoUtc(row.created_at),
    updatedAt: toIsoUtc(row.updated_at),
  };
}

function mapTopicRow(row) {
  return {
    id: Number(row.id),
    sectionId: Number(row.section_id),
    courseId: Number(row.course_id),
    title: row.title,
    orderIndex: Number(row.order_index),
    hasMaterial: Boolean(row.has_material),
    content: row.content || null,
    assessmentId: row.assessment_id ? Number(row.assessment_id) : null,
    createdAt: toIsoUtc(row.created_at),
    updatedAt: toIsoUtc(row.updated_at),
  };
}

module.exports = { toIsoUtc, mapCourseRow, mapSectionRow, mapTopicRow };
