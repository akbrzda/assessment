const assessmentsService = require("./service");
const { parseAssessmentId, normalizeListFilters } = require("./validators");
const assessmentsWriteService = require("./write/service");
const logger = require("../../../utils/logger");

async function getAssessments(req, res, next) {
  try {
    const filters = normalizeListFilters(req.query, req.user);
    const result = await assessmentsService.getAssessments(filters);
    res.setHeader("X-Total-Count", String(result.total));
    res.json({
      assessments: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    next(error);
  }
}

async function getAssessmentById(req, res, next) {
  try {
    const assessmentId = parseAssessmentId(req.params.id);
    const payload = await assessmentsService.getAssessmentById(assessmentId);
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

async function createAssessment(req, res, next) {
  try {
    const {
      title,
      openAt,
      closeAt,
      timeLimitMinutes,
      passScorePercent,
      maxAttempts,
      questions,
    } = req.body;
    if (
      !title ||
      !openAt ||
      !closeAt ||
      timeLimitMinutes == null ||
      passScorePercent == null ||
      maxAttempts == null ||
      !questions ||
      questions.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "Все обязательные поля должны быть заполнены" });
    }
    const result = await assessmentsWriteService.createAssessment(
      req.body,
      req.user,
    );
    res.status(201).json(result);
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ error: error.message });
    next(error);
  }
}

async function updateAssessment(req, res, next) {
  try {
    const assessmentId = parseAssessmentId(req.params.id);
    const result = await assessmentsWriteService.updateAssessment(
      assessmentId,
      req.body,
      req.user,
    );
    res.json(result);
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ error: error.message });
    next(error);
  }
}

async function deleteAssessment(req, res, next) {
  try {
    const assessmentId = parseAssessmentId(req.params.id);
    await assessmentsWriteService.deleteAssessment(assessmentId, req.user);
    res.status(204).send();
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ error: error.message });
    next(error);
  }
}

async function getAssessmentResults(req, res, next) {
  try {
    const assessmentId = parseAssessmentId(req.params.id);
    const result =
      await assessmentsWriteService.getAssessmentResults(assessmentId);
    res.json(result);
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ error: error.message });
    next(error);
  }
}

async function getAssessmentDetails(req, res, next) {
  try {
    const assessmentId = parseAssessmentId(req.params.id);
    const result = await assessmentsWriteService.getAssessmentDetails(
      assessmentId,
      req.user,
    );
    res.json(result);
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ error: error.message });
    next(error);
  }
}

async function getUserAssessmentProgress(req, res, next) {
  try {
    const assessmentId = parseAssessmentId(req.params.id);
    const userId = Number(req.params.userId);
    const attemptId = req.query.attemptId ? Number(req.query.attemptId) : null;
    if (!assessmentId || !userId) {
      return res.status(400).json({ error: "Некорректные параметры" });
    }
    const result = await assessmentsWriteService.getUserAssessmentProgress(
      assessmentId,
      userId,
      req.user,
      attemptId,
    );
    res.json(result);
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ error: error.message });
    next(error);
  }
}

async function exportAssessmentToExcel(req, res, next) {
  try {
    const assessmentId = parseAssessmentId(req.params.id);
    const { assessment, results } =
      await assessmentsWriteService.getExportData(assessmentId);

    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Результаты аттестации");

    worksheet.addRow([`Аттестация: ${assessment.title}`]);
    worksheet.addRow([`Дата экспорта: ${new Date().toLocaleString("ru-RU")}`]);
    worksheet.addRow([]);

    const headerRow = worksheet.addRow([
      "Фамилия",
      "Имя",
      "Филиал",
      "Должность",
      "Статус",
      "Балл (%)",
      "Правильных ответов",
      "Всего вопросов",
      "Время (сек)",
      "Дата начала",
      "Дата завершения",
    ]);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    results.forEach((r) => {
      worksheet.addRow([
        r.last_name,
        r.first_name,
        r.branch_name || "—",
        r.position_name || "—",
        r.status || "Не начат",
        r.score_percent ?? "—",
        r.correct_answers ?? "—",
        r.total_questions ?? "—",
        r.time_spent_seconds ?? "—",
        r.started_at ? new Date(r.started_at).toLocaleString("ru-RU") : "—",
        r.completed_at ? new Date(r.completed_at).toLocaleString("ru-RU") : "—",
      ]);
    });

    worksheet.columns.forEach((column) => {
      column.width = 15;
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="assessment_${assessmentId}_${Date.now()}.xlsx"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error("Export assessment error:", error);
    if (error.status)
      return res.status(error.status).json({ error: error.message });
    next(error);
  }
}

module.exports = {
  getAssessments,
  getAssessmentById,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  getAssessmentResults,
  getAssessmentDetails,
  getUserAssessmentProgress,
  exportAssessmentToExcel,
};
