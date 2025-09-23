const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const stream = require('stream');

function formatDate(value) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString('ru-RU');
}

function formatPercent(value) {
  if (value == null) {
    return '—';
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric.toFixed(2)}%` : '—';
}

function formatDuration(seconds) {
  if (seconds == null) {
    return '—';
  }
  const total = Math.max(0, Math.round(Number(seconds)));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

async function buildExcelReport({ assessment, participants }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Assessment System';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Результаты');

  sheet.columns = [
    { header: 'Сотрудник', key: 'fullName', width: 28 },
    { header: 'Филиал', key: 'branch', width: 18 },
    { header: 'Должность', key: 'position', width: 18 },
    { header: 'Статус', key: 'status', width: 16 },
    { header: 'Результат', key: 'score', width: 14 },
    { header: 'Правильные', key: 'correct', width: 16 },
    { header: 'Время', key: 'time', width: 12 },
    { header: 'Завершено', key: 'completed', width: 24 }
  ];

  participants.forEach((participant) => {
    sheet.addRow({
      fullName: `${participant.lastName} ${participant.firstName}`.trim(),
      branch: participant.branchName || '—',
      position: participant.positionName || '—',
      status: statusLabel(participant.status),
      score: formatPercent(participant.scorePercent),
      correct: participant.correctAnswers != null && participant.totalQuestions != null
        ? `${participant.correctAnswers}/${participant.totalQuestions}`
        : '—',
      time: formatDuration(participant.timeSpentSeconds),
      completed: formatDate(participant.completedAt)
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    filename: `${sanitizeFileName(assessment.title)}.xlsx`,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer
  };
}

function statusLabel(status) {
  switch ((status || '').toLowerCase()) {
    case 'completed':
      return 'Завершил';
    case 'in_progress':
      return 'В процессе';
    case 'cancelled':
      return 'Отменено';
    default:
      return 'Не начинал';
  }
}

function sanitizeFileName(name) {
  return (name || 'report')
    .replace(/\s+/g, '_')
    .replace(/[^а-яА-Яa-zA-Z0-9_\-]/g, '')
    .slice(0, 64) || 'report';
}

function buildPdfReport({ assessment, participants }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const passThreshold = assessment.passScorePercent != null ? `${assessment.passScorePercent}%` : '—';

  doc.fontSize(18).text(`Аттестация: ${assessment.title}`, { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Порог прохождения: ${passThreshold}`);
  doc.text(`Открытие: ${formatDate(assessment.openAt)}`);
  doc.text(`Закрытие: ${formatDate(assessment.closeAt)}`);
  doc.moveDown(1);

  const tableHeaders = [
    'Сотрудник',
    'Филиал',
    'Должность',
    'Статус',
    'Результат',
    'Правильные',
    'Время',
    'Завершено'
  ];

  const columnWidths = [120, 90, 90, 70, 70, 80, 60, 100];

  doc.fontSize(11).font('Helvetica-Bold');
  renderTableRow(doc, tableHeaders, columnWidths);
  doc.font('Helvetica');

  participants.forEach((participant) => {
    renderTableRow(
      doc,
      [
        `${participant.lastName} ${participant.firstName}`.trim(),
        participant.branchName || '—',
        participant.positionName || '—',
        statusLabel(participant.status),
        formatPercent(participant.scorePercent),
        participant.correctAnswers != null && participant.totalQuestions != null
          ? `${participant.correctAnswers}/${participant.totalQuestions}`
          : '—',
        formatDuration(participant.timeSpentSeconds),
        formatDate(participant.completedAt)
      ],
      columnWidths
    );
  });

  doc.end();

  const chunks = [];
  return new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve({
        filename: `${sanitizeFileName(assessment.title)}.pdf`,
        contentType: 'application/pdf',
        buffer
      });
    });
    doc.on('error', reject);
  });
}

function renderTableRow(doc, columns, widths) {
  const { y } = doc;
  columns.forEach((text, index) => {
    const width = widths[index] || 80;
    const x = doc.page.margins.left + widths.slice(0, index).reduce((acc, cur) => acc + cur, 0);
    doc.text(String(text || '—'), x, y, { width, continued: false });
  });
  doc.moveDown(0.6);
  if (doc.y > doc.page.height - doc.page.margins.bottom - 40) {
    doc.addPage();
  }
}

async function buildAssessmentReport(format, payload) {
  if (format === 'excel') {
    return buildExcelReport(payload);
  }
  if (format === 'pdf') {
    return buildPdfReport(payload);
  }
  throw new Error('Unsupported export format');
}

module.exports = {
  buildAssessmentReport
};
