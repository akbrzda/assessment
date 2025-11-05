const { pool } = require("../config/database");

// Получить логи с фильтрами
exports.getLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, admin_id, action_type, entity_type, date_from, date_to, search } = req.query;

    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];

    // Фильтр по администратору
    if (admin_id) {
      conditions.push("al.admin_id = ?");
      params.push(admin_id);
    }

    // Фильтр по типу действия
    if (action_type) {
      conditions.push("al.action_type = ?");
      params.push(action_type);
    }

    // Фильтр по типу сущности
    if (entity_type) {
      conditions.push("al.entity_type = ?");
      params.push(entity_type);
    }

    // Фильтр по дате от
    if (date_from) {
      conditions.push("al.created_at >= ?");
      params.push(date_from);
    }

    // Фильтр по дате до
    if (date_to) {
      conditions.push("al.created_at <= ?");
      params.push(date_to);
    }

    // Поиск по описанию или имени администратора
    if (search) {
      conditions.push("(al.description LIKE ? OR al.admin_username LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)");
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    // Получить общее количество логов
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total 
       FROM action_logs al
       LEFT JOIN users u ON al.admin_id = u.id
       ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Получить логи с пагинацией
    const [logs] = await pool.query(
      `SELECT 
        al.*,
        u.first_name,
        u.last_name,
        r.name as role_name,
        COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), al.admin_username) AS display_name
       FROM action_logs al
       LEFT JOIN users u ON al.admin_id = u.id
       LEFT JOIN roles r ON u.role_id = r.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Получить статистику по логам
exports.getLogsStats = async (req, res, next) => {
  try {
    // Статистика по типам действий
    const [actionTypes] = await pool.query(
      `SELECT action_type, COUNT(*) as count
       FROM action_logs
       GROUP BY action_type
       ORDER BY count DESC`
    );

    // Статистика по типам сущностей
    const [entityTypes] = await pool.query(
      `SELECT entity_type, COUNT(*) as count
       FROM action_logs
       WHERE entity_type IS NOT NULL
       GROUP BY entity_type
       ORDER BY count DESC`
    );

    // Самые активные администраторы
    const [topAdmins] = await pool.query(
      `SELECT 
        al.admin_id,
        al.admin_username,
        COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), al.admin_username) AS display_name,
        COUNT(*) as actions_count
       FROM action_logs al
       LEFT JOIN users u ON al.admin_id = u.id
       GROUP BY al.admin_id, al.admin_username, display_name
       ORDER BY actions_count DESC
       LIMIT 10`
    );

    // Активность по дням за последний месяц
    const [dailyActivity] = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
       FROM action_logs
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
    );

    res.json({
      actionTypes,
      entityTypes,
      topAdmins,
      dailyActivity,
    });
  } catch (error) {
    next(error);
  }
};

// Получить список уникальных типов действий
exports.getActionTypes = async (req, res, next) => {
  try {
    const [types] = await pool.query(
      `SELECT DISTINCT action_type 
       FROM action_logs 
       ORDER BY action_type`
    );
    res.json(types.map((t) => t.action_type));
  } catch (error) {
    next(error);
  }
};

// Получить список уникальных типов сущностей
exports.getEntityTypes = async (req, res, next) => {
  try {
    const [types] = await pool.query(
      `SELECT DISTINCT entity_type 
       FROM action_logs 
       WHERE entity_type IS NOT NULL
       ORDER BY entity_type`
    );
    res.json(types.map((t) => t.entity_type));
  } catch (error) {
    next(error);
  }
};

// Записать новый лог (используется внутренне)
exports.createLog = async (adminId, actionType, description, entityType = null, entityId = null, req = null) => {
  try {
    const ipAddress = req ? req.headers["x-forwarded-for"] || req.connection.remoteAddress : null;
    const userAgent = req ? req.headers["user-agent"] : null;

    // Получить имя администратора
    const [admin] = await pool.query("SELECT first_name, last_name FROM users WHERE id = ?", [adminId]);
    const adminUsername = admin.length > 0 ? `${admin[0].first_name} ${admin[0].last_name}` : null;

    await pool.query(
      `INSERT INTO action_logs 
       (admin_id, admin_username, action_type, entity_type, entity_id, description, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [adminId, adminUsername, actionType, entityType, entityId, description, ipAddress, userAgent]
    );
  } catch (error) {
    console.error("Ошибка создания лога:", error);
    // Не бросаем ошибку, чтобы не прерывать основной процесс
  }
};

// Экспорт логов в Excel
exports.exportLogs = async (req, res, next) => {
  try {
    const ExcelJS = require("exceljs");
    const { admin_id, action_type, entity_type, date_from, date_to, search } = req.query;

    let conditions = [];
    let params = [];

    // Фильтры (те же что и в getLogs)
    if (admin_id) {
      conditions.push("al.admin_id = ?");
      params.push(admin_id);
    }
    if (action_type) {
      conditions.push("al.action_type = ?");
      params.push(action_type);
    }
    if (entity_type) {
      conditions.push("al.entity_type = ?");
      params.push(entity_type);
    }
    if (date_from) {
      conditions.push("al.created_at >= ?");
      params.push(date_from);
    }
    if (date_to) {
      conditions.push("al.created_at <= ?");
      params.push(date_to);
    }
    if (search) {
      conditions.push("(al.description LIKE ? OR al.admin_username LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)");
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    // Получить все логи
    const [logs] = await pool.query(
      `SELECT 
        al.id,
        al.created_at,
        al.admin_username,
        u.first_name,
        u.last_name,
        r.name as role_name,
        COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), al.admin_username) AS display_name,
        al.action_type,
        al.entity_type,
        al.entity_id,
        al.description,
        al.ip_address
       FROM action_logs al
       LEFT JOIN users u ON al.admin_id = u.id
       LEFT JOIN roles r ON u.role_id = r.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT 10000`,
      params
    );

    // Создать Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Журнал действий");

    // Заголовки
    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Дата и время", key: "created_at", width: 20 },
      { header: "Администратор", key: "admin", width: 25 },
      { header: "Действие", key: "action_type", width: 15 },
      { header: "Сущность", key: "entity_type", width: 15 },
      { header: "ID сущности", key: "entity_id", width: 12 },
      { header: "Описание", key: "description", width: 50 },
      { header: "IP-адрес", key: "ip_address", width: 15 },
    ];

    // Стиль заголовков
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Данные
    logs.forEach((log) => {
      worksheet.addRow({
        id: log.id,
        created_at: new Date(log.created_at).toLocaleString("ru-RU"),
        admin: log.display_name || log.admin_username || "",
        action_type: log.action_type,
        entity_type: log.entity_type || "",
        entity_id: log.entity_id || "",
        description: log.description,
        ip_address: log.ip_address || "",
      });
    });

    // Отправить файл
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=logs_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

// Отправить логи в Telegram
exports.sendLogsToTelegram = async (req, res, next) => {
  try {
    const { sendTelegramLog } = require("../services/telegramLogger");
    const { date_from, date_to, limit = 50 } = req.body;

    let conditions = ["al.created_at >= ?"];
    let params = [date_from || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]];

    if (date_to) {
      conditions.push("al.created_at <= ?");
      params.push(date_to);
    }

    const whereClause = conditions.join(" AND ");

    // Получить логи
    const [logs] = await pool.query(
      `SELECT 
        al.created_at,
        al.admin_username,
        u.first_name,
        u.last_name,
        COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), al.admin_username) AS display_name,
        al.action_type,
        al.description
       FROM action_logs al
       LEFT JOIN users u ON al.admin_id = u.id
       WHERE ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ?`,
      [...params, parseInt(limit)]
    );

    if (logs.length === 0) {
      return res.json({ success: true, message: "Логи за указанный период отсутствуют" });
    }

    // Формировать сообщение
    let message = `<b>📊 Журнал действий</b>\n`;
    message += `Период: ${date_from || "вчера"} - ${date_to || "сегодня"}\n`;
    message += `Всего действий: ${logs.length}\n\n`;

    logs.slice(0, 20).forEach((log, index) => {
      const time = new Date(log.created_at).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      const admin = log.display_name || log.admin_username || "Неизвестный администратор";
      message += `${index + 1}. [${time}] ${admin}\n`;
      message += `   ${log.action_type}: ${log.description}\n\n`;
    });

    if (logs.length > 20) {
      message += `... и ещё ${logs.length - 20} действий`;
    }

    await sendTelegramLog(message);

    res.json({ success: true, message: "Логи отправлены в Telegram" });
  } catch (error) {
    next(error);
  }
};
