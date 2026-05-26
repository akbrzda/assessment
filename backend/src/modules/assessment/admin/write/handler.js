const writeService = require("./service");
const logger = require("../../../../utils/logger");

// NOTE: этот файл используется через write/controller.js → module.exports = require("./handler").
// Фактический HTTP-контроллер — admin/controller.js, который вызывает write/service.js напрямую.

function handleBusinessError(error, res, next) {
  if (error.status)
    return res.status(error.status).json({ error: error.message });
  next(error);
}

exports.createAssessment = async (req, res, next) => {
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
    const result = await writeService.createAssessment(req.body, req.user);
    res.status(201).json(result);
  } catch (error) {
    handleBusinessError(error, res, next);
  }
};

exports.updateAssessment = async (req, res, next) => {
  try {
    const assessmentId = Number(req.params.id);
    const result = await writeService.updateAssessment(
      assessmentId,
      req.body,
      req.user,
    );
    res.json(result);
  } catch (error) {
    handleBusinessError(error, res, next);
  }
};

exports.deleteAssessment = async (req, res, next) => {
  try {
    const assessmentId = Number(req.params.id);
    await writeService.deleteAssessment(assessmentId, req.user);
    res.status(204).send();
  } catch (error) {
    handleBusinessError(error, res, next);
  }
};

exports.getAssessmentResults = async (req, res, next) => {
  try {
    const assessmentId = Number(req.params.id);
    const result = await writeService.getAssessmentResults(assessmentId);
    res.json(result);
  } catch (error) {
    handleBusinessError(error, res, next);
  }
};

exports.getAssessmentDetails = async (req, res, next) => {
  try {
    const assessmentId = Number(req.params.id);
    const result = await writeService.getAssessmentDetails(
      assessmentId,
      req.user,
    );
    res.json(result);
  } catch (error) {
    handleBusinessError(error, res, next);
  }
};

exports.getUserAssessmentProgress = async (req, res, next) => {
  try {
    const assessmentId = Number(req.params.id);
    const userId = Number(req.params.userId);
    const attemptId = req.query.attemptId ? Number(req.query.attemptId) : null;
    if (!assessmentId || !userId) {
      return res.status(400).json({ error: "Некорректные параметры" });
    }
    const result = await writeService.getUserAssessmentProgress(
      assessmentId,
      userId,
      req.user,
      attemptId,
    );
    res.json(result);
  } catch (error) {
    handleBusinessError(error, res, next);
  }
};

exports.exportAssessmentToExcel = async (req, res, next) => {
  try {
    const assessmentId = Number(req.params.id);
    const { assessment, results } =
      await writeService.getExportData(assessmentId);

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
    handleBusinessError(error, res, next);
  }
};
