const { pool } = require("../config/database");
const { sendTelegramLog } = require("../services/telegramLogger");
const { createLog } = require("./adminLogsController");

/**
 * Получить список всех аттестаций для админ-панели
 */
exports.getAssessments = async (req, res, next) => {
  try {
    const { status, branch, search } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    const params = [];
    const conditions = [];

    const statusExpression = `
      CASE
        WHEN UTC_TIMESTAMP() < a.open_at THEN 'pending'
        WHEN UTC_TIMESTAMP() BETWEEN a.open_at AND a.close_at THEN 'open'
        ELSE 'closed'
      END
    `;

    if (status) {
      conditions.push(`${statusExpression} = ?`);
      params.push(status);
    }

    if (search) {
      conditions.push("(a.title LIKE ? OR a.description LIKE ?)");
      const pattern = `%${search}%`;
      params.push(pattern, pattern);
    }

    // Ограничение для управляющего: только его филиалы ИЛИ созданные им самим
    if (userRole === "manager") {
      conditions.push(`(
        a.created_by = ?
        OR EXISTS (
          SELECT 1
          FROM assessment_user_assignments aua_m
          JOIN users u_m ON u_m.id = aua_m.user_id
          WHERE aua_m.assessment_id = a.id
            AND u_m.branch_id = (SELECT branch_id FROM users WHERE id = ?)
        )
      )`);
      params.push(userId, userId);
    }

    // Фильтр по филиалу
    if (branch) {
      const branchId = Number(branch);
      if (!Number.isNaN(branchId)) {
        conditions.push(`EXISTS (
          SELECT 1
          FROM assessment_user_assignments aua_b
          JOIN users u_b ON u_b.id = aua_b.user_id
          WHERE aua_b.assessment_id = a.id
            AND u_b.branch_id = ?
        )`);
        params.push(branchId);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT
        a.id,
        a.title,
        a.description,
        a.open_at,
        a.close_at,
        a.time_limit_minutes,
        a.pass_score_percent,
        a.max_attempts,
        ${statusExpression} AS status,
        a.created_at,
        (
          SELECT COUNT(DISTINCT aua.user_id)
          FROM assessment_user_assignments aua
          WHERE aua.assessment_id = a.id
        ) AS assigned_users,
        (
          SELECT COUNT(*)
          FROM assessment_attempts aa
          WHERE aa.assessment_id = a.id
        ) AS total_attempts,
        (
          SELECT COUNT(*)
          FROM assessment_attempts aa
          WHERE aa.assessment_id = a.id AND aa.status = 'completed'
        ) AS completed_attempts,
        (
          SELECT AVG(aa.score_percent)
          FROM assessment_attempts aa
          WHERE aa.assessment_id = a.id AND aa.status = 'completed'
        ) AS avg_score
      FROM assessments a
      ${whereClause}
      ORDER BY a.created_at DESC
    `;

    const [assessments] = await pool.query(query, params);

    res.json({ assessments });
  } catch (error) {
    console.error("Get assessments error:", error);
    next(error);
  }
};

/**
 * Получить детали аттестации с вопросами
 */
exports.getAssessmentById = async (req, res, next) => {
  try {
    const assessmentId = Number(req.params.id);

    // Получить основную информацию
    const [assessments] = await pool.query("SELECT * FROM assessments WHERE id = ?", [assessmentId]);

    if (assessments.length === 0) {
      return res.status(404).json({ error: "Аттестация не найдена" });
    }

    const assessment = assessments[0];

    // Получить вопросы с вариантами ответов
    const [questions] = await pool.query(
      `
      SELECT 
        q.id,
        q.question_text,
        q.order_index
      FROM assessment_questions q
      WHERE q.assessment_id = ?
      ORDER BY q.order_index
    `,
      [assessmentId]
    );

    // Получить варианты ответов для каждого вопроса
    for (const question of questions) {
      const [options] = await pool.query(
        `
        SELECT id, option_text, is_correct, order_index
        FROM assessment_question_options
        WHERE question_id = ?
        ORDER BY order_index
      `,
        [question.id]
      );
      question.options = options;
    }

    // Получить назначенных пользователей
    const [assignedUsers] = await pool.query(
      `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.telegram_id,
        b.name as branch_name,
        p.name as position_name
      FROM assessment_user_assignments aua
      JOIN users u ON aua.user_id = u.id
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN positions p ON u.position_id = p.id
      WHERE aua.assessment_id = ?
    `,
      [assessmentId]
    );

    // Получить результаты попыток
    const [attempts] = await pool.query(
      `
      SELECT 
        aa.id,
        aa.user_id,
        aa.status,
        aa.score_percent,
        aa.total_questions,
        aa.correct_answers,
        aa.started_at,
        aa.completed_at,
        u.first_name,
        u.last_name
      FROM assessment_attempts aa
      JOIN users u ON aa.user_id = u.id
      WHERE aa.assessment_id = ?
      ORDER BY aa.started_at DESC
    `,
      [assessmentId]
    );

    res.json({
      assessment: {
        ...assessment,
        questions,
        assignedUsers,
        attempts,
      },
    });
  } catch (error) {
    console.error("Get assessment by ID error:", error);
    next(error);
  }
};

/**
 * Создать новую аттестацию
 */
exports.createAssessment = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { title, description, openAt, closeAt, timeLimitMinutes, passScorePercent, maxAttempts, userIds, positionIds, branchIds, questions } =
      req.body;

    // Валидация
    if (!title || !openAt || !closeAt || !timeLimitMinutes || !passScorePercent || !maxAttempts || !questions || questions.length === 0) {
      return res.status(400).json({ error: "Все обязательные поля должны быть заполнены" });
    }

    if (new Date(closeAt) <= new Date(openAt)) {
      return res.status(400).json({ error: "Дата закрытия должна быть позже даты открытия" });
    }

    // Получить информацию о текущем пользователе
    const [currentUserData] = await connection.query(
      `SELECT u.id, u.branch_id, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (currentUserData.length === 0) {
      return res.status(403).json({ error: "Пользователь не найден" });
    }

    const currentUser = currentUserData[0];

    // Для управляющего автоматически подставляем его филиал
    let finalBranchIds = branchIds || [];
    let finalPositionIds = positionIds || [];
    let finalUserIds = userIds || [];

    if (currentUser.role_name === "manager") {
      if (!currentUser.branch_id) {
        return res.status(400).json({ error: "У управляющего не указан филиал" });
      }
      // Управляющий может назначать только на свой филиал
      finalBranchIds = [currentUser.branch_id];

      // Валидация: если указаны должности, проверяем что они есть в его филиале
      if (positionIds && positionIds.length > 0) {
        const [validPositions] = await connection.query(
          `SELECT DISTINCT p.id 
           FROM positions p
           JOIN users u ON u.position_id = p.id
           WHERE p.id IN (?) AND u.branch_id = ?`,
          [positionIds, currentUser.branch_id]
        );
        const validPositionIds = validPositions.map((p) => p.id);
        const invalidPositions = positionIds.filter((id) => !validPositionIds.includes(id));
        if (invalidPositions.length > 0) {
          return res.status(400).json({ error: "Выбраны должности, которых нет в вашем филиале" });
        }
        finalPositionIds = positionIds;
      }

      // Валидация: если указаны пользователи, проверяем что они из его филиала
      if (userIds && userIds.length > 0) {
        const [validUsers] = await connection.query(`SELECT id FROM users WHERE id IN (?) AND branch_id = ?`, [userIds, currentUser.branch_id]);
        const validUserIds = validUsers.map((u) => u.id);
        const invalidUsers = userIds.filter((id) => !validUserIds.includes(id));
        if (invalidUsers.length > 0) {
          return res.status(400).json({ error: "Выбраны пользователи, которые не относятся к вашему филиалу" });
        }
        finalUserIds = userIds;
      }
    }

    // Создать аттестацию
    const [result] = await connection.query(
      `
      INSERT INTO assessments (
        title, description, open_at, close_at, time_limit_minutes,
        pass_score_percent, max_attempts, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [title, description || "", openAt, closeAt, timeLimitMinutes, passScorePercent, maxAttempts, req.user.id]
    );

    const assessmentId = result.insertId;

    // Добавить вопросы
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const [qResult] = await connection.query(
        `
        INSERT INTO assessment_questions (assessment_id, question_text, order_index)
        VALUES (?, ?, ?)
      `,
        [assessmentId, question.text, i]
      );

      const questionId = qResult.insertId;

      // Добавить варианты ответов
      for (let j = 0; j < question.options.length; j++) {
        const option = question.options[j];
        const isCorrectValue = option.isCorrect ? 1 : 0;
        console.log(
          `[createAssessment] Saving option: questionId=${questionId}, text="${option.text}", isCorrect=${
            option.isCorrect
          } (type: ${typeof option.isCorrect}), converted=${isCorrectValue}`
        );
        await connection.query(
          `
          INSERT INTO assessment_question_options (question_id, option_text, is_correct, order_index)
          VALUES (?, ?, ?, ?)
        `,
          [questionId, option.text, isCorrectValue, j]
        );
      }
    }

    // Назначить пользователей
    let assignedUserIds = [];

    // Сохранить назначения по филиалам
    if (finalBranchIds && finalBranchIds.length > 0) {
      const branchValues = finalBranchIds.map((bid) => [assessmentId, bid]);
      await connection.query("INSERT INTO assessment_branch_assignments (assessment_id, branch_id) VALUES ?", [branchValues]);
    }

    // Сохранить назначения по должностям
    if (finalPositionIds && finalPositionIds.length > 0) {
      const positionValues = finalPositionIds.map((pid) => [assessmentId, pid]);
      await connection.query("INSERT INTO assessment_position_assignments (assessment_id, position_id) VALUES ?", [positionValues]);
    }

    // Получить пользователей в зависимости от комбинации филиалов и должностей
    if (finalBranchIds && finalBranchIds.length > 0 && finalPositionIds && finalPositionIds.length > 0) {
      // Комбинация: филиал + должность (пользователи должны соответствовать ОБОИМ критериям)
      const [usersFromBoth] = await connection.query(
        `SELECT DISTINCT u.id, u.first_name, u.last_name FROM users u
         WHERE u.branch_id IN (?) 
           AND u.position_id IN (?)`,
        [finalBranchIds, finalPositionIds]
      );
      console.log("Users from branch+position:", usersFromBoth);
      assignedUserIds.push(...usersFromBoth.map((u) => u.id));
    } else if (finalBranchIds && finalBranchIds.length > 0) {
      // Только филиалы
      const [usersFromBranches] = await connection.query(
        `SELECT DISTINCT u.id, u.first_name, u.last_name FROM users u
         WHERE u.branch_id IN (?)`,
        [finalBranchIds]
      );
      console.log("Users from branches:", usersFromBranches);
      assignedUserIds.push(...usersFromBranches.map((u) => u.id));
    } else if (finalPositionIds && finalPositionIds.length > 0) {
      // Только должности
      const [usersFromPositions] = await connection.query(
        `SELECT DISTINCT u.id, u.first_name, u.last_name FROM users u
         WHERE u.position_id IN (?)`,
        [finalPositionIds]
      );
      console.log("Users from positions:", usersFromPositions);
      assignedUserIds.push(...usersFromPositions.map((u) => u.id));
    }

    // Назначить по userIds напрямую
    if (finalUserIds && finalUserIds.length > 0) {
      assignedUserIds.push(...finalUserIds);
    }

    // Убрать дубликаты
    assignedUserIds = [...new Set(assignedUserIds)];

    console.log("=== Assignment Debug ===");
    console.log("Final Branch IDs:", finalBranchIds);
    console.log("Final Position IDs:", finalPositionIds);
    console.log("Final User IDs:", finalUserIds);
    console.log("Assigned User IDs:", assignedUserIds);
    console.log("=======================");

    // Вставить назначения
    if (assignedUserIds.length > 0) {
      const assignmentValues = assignedUserIds.map((uid) => [assessmentId, uid]);
      await connection.query("INSERT INTO assessment_user_assignments (assessment_id, user_id) VALUES ?", [assignmentValues]);
    } else {
      console.warn("Warning: No users assigned to assessment", assessmentId);
    }

    await connection.commit();

    // Логирование действия
    await createLog(
      req.user.id,
      "CREATE",
      `Создана аттестация: ${title} (ID: ${assessmentId}, вопросов: ${questions.length}, назначено: ${assignedUserIds.length})`,
      "assessment",
      assessmentId,
      req
    );

    await sendTelegramLog(
      `📝 <b>Создана новая аттестация</b>\n` +
        `ID: ${assessmentId}\n` +
        `Название: ${title}\n` +
        `Вопросов: ${questions.length}\n` +
        `Назначено пользователей: ${assignedUserIds.length}\n` +
        `Создал: ${req.user.id}`
    );

    res.status(201).json({ assessmentId, message: "Аттестация создана успешно" });
  } catch (error) {
    await connection.rollback();
    console.error("Create assessment error:", error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Обновить аттестацию (только если статус = pending)
 */
exports.updateAssessment = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const assessmentId = Number(req.params.id);
    const userRole = req.user.role;
    const userId = req.user.id;

    // Проверить аттестацию и вычислить статус
    const [assessments] = await connection.query(
      `SELECT 
        *,
        CASE
          WHEN UTC_TIMESTAMP() < open_at THEN 'pending'
          WHEN UTC_TIMESTAMP() BETWEEN open_at AND close_at THEN 'open'
          ELSE 'closed'
        END as status
      FROM assessments WHERE id = ?`,
      [assessmentId]
    );

    if (assessments.length === 0) {
      return res.status(404).json({ error: "Аттестация не найдена" });
    }

    const assessment = assessments[0];

    // Проверка доступа для управляющего
    if (userRole === "manager") {
      // Управляющий может редактировать только свои аттестации
      if (assessment.created_by !== userId) {
        return res.status(403).json({ error: "Нет доступа к редактированию этой аттестации" });
      }
    }

    if (assessment.status !== "pending") {
      return res.status(400).json({ error: 'Можно редактировать только аттестации со статусом "Ожидает"' });
    }

    await connection.beginTransaction();

    const { title, description, openAt, closeAt, timeLimitMinutes, passScorePercent, maxAttempts, questions, branchIds, positionIds, userIds } =
      req.body;

    // Обновить основную информацию
    await connection.query(
      `
      UPDATE assessments SET
        title = ?,
        description = ?,
        open_at = ?,
        close_at = ?,
        time_limit_minutes = ?,
        pass_score_percent = ?,
        max_attempts = ?
      WHERE id = ?
    `,
      [title, description || "", openAt, closeAt, timeLimitMinutes, passScorePercent, maxAttempts, assessmentId]
    );

    // Обновить назначения (если переданы)
    if (branchIds !== undefined || positionIds !== undefined || userIds !== undefined) {
      // Получить текущую роль пользователя
      const currentUser = req.user;

      // Определить финальные массивы для назначения
      let finalBranchIds = branchIds || [];
      let finalPositionIds = positionIds || [];
      let finalUserIds = userIds || [];

      // Если текущий пользователь - менеджер, ограничить назначение только его филиалом
      if (currentUser.role === "manager") {
        if (!currentUser.branch_id) {
          throw new Error("У менеджера не указан филиал");
        }
        // Менеджер может назначать только на свой филиал
        finalBranchIds = [currentUser.branch_id];
      }

      // Удалить старые назначения
      await connection.query("DELETE FROM assessment_branch_assignments WHERE assessment_id = ?", [assessmentId]);
      await connection.query("DELETE FROM assessment_position_assignments WHERE assessment_id = ?", [assessmentId]);
      await connection.query("DELETE FROM assessment_user_assignments WHERE assessment_id = ?", [assessmentId]);

      // Добавить новые назначения по филиалам
      if (finalBranchIds && finalBranchIds.length > 0) {
        const branchValues = finalBranchIds.map((bid) => [assessmentId, bid]);
        await connection.query("INSERT INTO assessment_branch_assignments (assessment_id, branch_id) VALUES ?", [branchValues]);
      }

      // Добавить новые назначения по должностям
      if (finalPositionIds && finalPositionIds.length > 0) {
        const positionValues = finalPositionIds.map((pid) => [assessmentId, pid]);
        await connection.query("INSERT INTO assessment_position_assignments (assessment_id, position_id) VALUES ?", [positionValues]);
      }

      // Получить список пользователей на основе назначений
      let assignedUserIds = [];

      if (finalBranchIds && finalBranchIds.length > 0 && finalPositionIds && finalPositionIds.length > 0) {
        // Комбинация: филиал + должность (пользователи должны соответствовать ОБОИМ критериям)
        const [usersFromBoth] = await connection.query(
          `SELECT DISTINCT u.id FROM users u
           WHERE u.branch_id IN (?) 
             AND u.position_id IN (?)`,
          [finalBranchIds, finalPositionIds]
        );
        assignedUserIds.push(...usersFromBoth.map((u) => u.id));
      } else if (finalBranchIds && finalBranchIds.length > 0) {
        // Только филиалы
        const [usersFromBranches] = await connection.query(`SELECT DISTINCT u.id FROM users u WHERE u.branch_id IN (?)`, [finalBranchIds]);
        assignedUserIds.push(...usersFromBranches.map((u) => u.id));
      } else if (finalPositionIds && finalPositionIds.length > 0) {
        // Только должности
        const [usersFromPositions] = await connection.query(`SELECT DISTINCT u.id FROM users u WHERE u.position_id IN (?)`, [finalPositionIds]);
        assignedUserIds.push(...usersFromPositions.map((u) => u.id));
      }

      // Добавить напрямую выбранных пользователей
      if (finalUserIds && finalUserIds.length > 0) {
        assignedUserIds.push(...finalUserIds);
      }

      // Убрать дубликаты
      assignedUserIds = [...new Set(assignedUserIds)];

      // Добавить записи в assessment_user_assignments
      if (assignedUserIds.length > 0) {
        const userAssignmentValues = assignedUserIds.map((uid) => [assessmentId, uid]);
        await connection.query("INSERT INTO assessment_user_assignments (assessment_id, user_id) VALUES ?", [userAssignmentValues]);
      }

      console.log(
        `Обновлены назначения для аттестации ${assessmentId}: филиалы=${finalBranchIds.length}, должности=${finalPositionIds.length}, пользователей=${assignedUserIds.length}`
      );
    }

    // Если переданы вопросы, обновить их
    if (questions && questions.length > 0) {
      // Удалить старые вопросы и их варианты (CASCADE удалит варианты)
      await connection.query("DELETE FROM assessment_questions WHERE assessment_id = ?", [assessmentId]);

      // Добавить новые вопросы
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const [qResult] = await connection.query(
          `
          INSERT INTO assessment_questions (assessment_id, question_text, order_index)
          VALUES (?, ?, ?)
        `,
          [assessmentId, question.text, i]
        );

        const questionId = qResult.insertId;

        // Добавить варианты ответов
        for (let j = 0; j < question.options.length; j++) {
          const option = question.options[j];
          await connection.query(
            `
            INSERT INTO assessment_question_options (question_id, option_text, is_correct, order_index)
            VALUES (?, ?, ?, ?)
          `,
            [questionId, option.text, option.isCorrect ? 1 : 0, j]
          );
        }
      }
    }

    await connection.commit();

    // Логирование действия
    await createLog(req.user.id, "UPDATE", `Обновлена аттестация: ${title} (ID: ${assessmentId})`, "assessment", assessmentId, req);

    await sendTelegramLog(`✏️ <b>Обновлена аттестация</b>\n` + `ID: ${assessmentId}\n` + `Название: ${title}\n` + `Обновил: ${req.user.id}`);

    res.json({ message: "Аттестация обновлена успешно" });
  } catch (error) {
    await connection.rollback();
    console.error("Update assessment error:", error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Удалить аттестацию (только если статус = pending)
 */
exports.deleteAssessment = async (req, res, next) => {
  try {
    const assessmentId = Number(req.params.id);
    const userRole = req.user.role;
    const userId = req.user.id;

    const [assessments] = await pool.query(
      `SELECT 
        title,
        created_by,
        CASE
          WHEN UTC_TIMESTAMP() < open_at THEN 'pending'
          WHEN UTC_TIMESTAMP() BETWEEN open_at AND close_at THEN 'open'
          ELSE 'closed'
        END as status
      FROM assessments WHERE id = ?`,
      [assessmentId]
    );

    if (assessments.length === 0) {
      return res.status(404).json({ error: "Аттестация не найдена" });
    }

    const assessment = assessments[0];

    // Проверка доступа для управляющего
    if (userRole === "manager") {
      // Управляющий может удалять только свои аттестации
      if (assessment.created_by !== userId) {
        return res.status(403).json({ error: "Нет доступа к удалению этой аттестации" });
      }
    }

    if (assessment.status !== "pending") {
      return res.status(400).json({ error: 'Можно удалять только аттестации со статусом "Ожидает"' });
    }

    await pool.query("DELETE FROM assessments WHERE id = ?", [assessmentId]);

    // Логирование действия
    await createLog(req.user.id, "DELETE", `Удалена аттестация: ${assessment.title} (ID: ${assessmentId})`, "assessment", assessmentId, req);

    await sendTelegramLog(`🗑️ <b>Удалена аттестация</b>\n` + `ID: ${assessmentId}\n` + `Название: ${assessment.title}\n` + `Удалил: ${req.user.id}`);

    res.status(204).send();
  } catch (error) {
    console.error("Delete assessment error:", error);
    next(error);
  }
};

/**
 * Получить результаты аттестации
 */
exports.getAssessmentResults = async (req, res, next) => {
  try {
    const assessmentId = Number(req.params.id);

    const [results] = await pool.query(
      `
      SELECT 
        aa.id,
        aa.user_id,
        aa.status,
        aa.score_percent,
        aa.total_questions,
        aa.correct_answers,
        aa.started_at,
        aa.completed_at,
        TIMESTAMPDIFF(SECOND, aa.started_at, aa.completed_at) as duration_seconds,
        u.first_name,
        u.last_name,
        u.telegram_id,
        b.name as branch_name,
        p.name as position_name
      FROM assessment_attempts aa
      JOIN users u ON aa.user_id = u.id
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN positions p ON u.position_id = p.id
      WHERE aa.assessment_id = ?
      ORDER BY aa.started_at DESC
    `,
      [assessmentId]
    );

    res.json({ results });
  } catch (error) {
    console.error("Get assessment results error:", error);
    next(error);
  }
};

/**
 * Получить детализацию аттестации с результатами и статистикой
 */
exports.getAssessmentDetails = async (req, res, next) => {
  try {
    const assessmentId = Number(req.params.id);
    const userRole = req.user.role;
    const userId = req.user.id;

    // Основная информация об аттестации
    const [assessments] = await pool.query("SELECT * FROM assessments WHERE id = ?", [assessmentId]);

    if (assessments.length === 0) {
      return res.status(404).json({ error: "Аттестация не найдена" });
    }

    const assessment = assessments[0];

    // Проверка доступа для управляющего
    if (userRole === "manager") {
      // Управляющий может видеть аттестацию, если:
      // 1. Он создал её сам
      // 2. Она назначена на пользователей из его филиала
      const [access] = await pool.query(
        `SELECT 1 
         FROM assessments a
         WHERE a.id = ?
           AND (
             a.created_by = ?
             OR EXISTS (
               SELECT 1
               FROM assessment_user_assignments aua
               JOIN users u ON u.id = aua.user_id
               WHERE aua.assessment_id = a.id
                 AND u.branch_id = (SELECT branch_id FROM users WHERE id = ?)
             )
           )`,
        [assessmentId, userId, userId]
      );

      if (access.length === 0) {
        return res.status(403).json({ error: "Нет доступа к этой аттестации" });
      }
    }

    // Вопросы с вариантами ответов
    const [questions] = await pool.query(
      `
      SELECT 
        q.id,
        q.question_text,
        q.order_index
      FROM assessment_questions q
      WHERE q.assessment_id = ?
      ORDER BY q.order_index
    `,
      [assessmentId]
    );

    // Для каждого вопроса получить варианты и статистику ответов
    for (const question of questions) {
      const [options] = await pool.query(
        `
        SELECT id, option_text, is_correct, order_index
        FROM assessment_question_options
        WHERE question_id = ?
        ORDER BY order_index
      `,
        [question.id]
      );
      question.options = options;

      // Статистика по вопросу (сколько раз выбирали каждый вариант)
      const [stats] = await pool.query(
        `
        SELECT 
          ans.option_id,
          COUNT(*) AS selection_count
        FROM assessment_answers ans
        JOIN assessment_attempts aa ON ans.attempt_id = aa.id
        WHERE ans.question_id = ? AND aa.status = 'completed'
        GROUP BY ans.option_id
      `,
        [question.id]
      );

      question.answerStats = stats;
    }

    // Участники с результатами (берем последнюю попытку каждого пользователя)
    const [participants] = await pool.query(
      `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.telegram_id,
        b.name as branch_name,
        p.name as position_name,
        aa.id as attempt_id,
        aa.status as attempt_status,
        aa.score_percent,
        aa.correct_answers,
        aa.total_questions,
        aa.started_at,
        aa.completed_at,
        TIMESTAMPDIFF(SECOND, aa.started_at, aa.completed_at) as time_spent_seconds
      FROM assessment_user_assignments aua
      JOIN users u ON aua.user_id = u.id
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN positions p ON u.position_id = p.id
      LEFT JOIN assessment_attempts aa ON aa.assessment_id = aua.assessment_id 
        AND aa.user_id = u.id 
        AND aa.id = (
          SELECT id FROM assessment_attempts 
          WHERE assessment_id = aua.assessment_id 
            AND user_id = u.id 
          ORDER BY started_at DESC 
          LIMIT 1
        )
      WHERE aua.assessment_id = ?
      ORDER BY u.last_name, u.first_name
    `,
      [assessmentId]
    );

    // Статистика (на основе последней попытки каждого пользователя)
    const [stats] = await pool.query(
      `
      SELECT 
        COUNT(DISTINCT aua.user_id) as total_assigned,
        COUNT(DISTINCT CASE WHEN latest.status = 'completed' THEN latest.user_id END) as completed_count,
        COUNT(DISTINCT CASE WHEN latest.status = 'in_progress' THEN latest.user_id END) as in_progress_count,
        COUNT(DISTINCT CASE WHEN latest.id IS NULL THEN aua.user_id END) as not_started_count,
        AVG(CASE WHEN latest.status = 'completed' THEN latest.score_percent END) as avg_score,
        MIN(CASE WHEN latest.status = 'completed' THEN latest.score_percent END) as min_score,
        MAX(CASE WHEN latest.status = 'completed' THEN latest.score_percent END) as max_score,
        COUNT(DISTINCT CASE WHEN latest.score_percent >= ? THEN latest.user_id END) as passed_count
      FROM assessment_user_assignments aua
      LEFT JOIN (
        SELECT aa1.*
        FROM assessment_attempts aa1
        INNER JOIN (
          SELECT user_id, MAX(started_at) as max_started
          FROM assessment_attempts
          WHERE assessment_id = ?
          GROUP BY user_id
        ) aa2 ON aa1.user_id = aa2.user_id AND aa1.started_at = aa2.max_started
        WHERE aa1.assessment_id = ?
      ) latest ON latest.user_id = aua.user_id
      WHERE aua.assessment_id = ?
    `,
      [assessment.pass_score_percent, assessmentId, assessmentId, assessmentId]
    );

    // Информация о доступности
    const [assignedBranches] = await pool.query(
      `
      SELECT DISTINCT b.id, b.name
      FROM assessment_branch_assignments aba
      JOIN branches b ON aba.branch_id = b.id
      WHERE aba.assessment_id = ?
      ORDER BY b.name
    `,
      [assessmentId]
    );

    const [assignedPositions] = await pool.query(
      `
      SELECT DISTINCT p.id, p.name
      FROM assessment_position_assignments apa
      JOIN positions p ON apa.position_id = p.id
      WHERE apa.assessment_id = ?
      ORDER BY p.name
    `,
      [assessmentId]
    );

    // Получить только напрямую назначенных пользователей (не через филиалы/должности)
    const [directlyAssignedUsers] = await pool.query(
      `
      SELECT DISTINCT u.id, u.first_name, u.last_name
      FROM assessment_user_assignments aua
      JOIN users u ON aua.user_id = u.id
      WHERE aua.assessment_id = ?
        -- Исключаем пользователей, назначенных через филиалы
        AND NOT EXISTS (
          SELECT 1 FROM assessment_branch_assignments aba
          WHERE aba.assessment_id = aua.assessment_id
            AND aba.branch_id = u.branch_id
        )
        -- Исключаем пользователей, назначенных через должности
        AND NOT EXISTS (
          SELECT 1 FROM assessment_position_assignments apa
          WHERE apa.assessment_id = aua.assessment_id
            AND apa.position_id = u.position_id
        )
      ORDER BY u.last_name, u.first_name
    `,
      [assessmentId]
    );

    res.json({
      assessment,
      questions,
      participants,
      stats: stats[0],
      accessibility: {
        branches: assignedBranches,
        positions: assignedPositions,
        users: directlyAssignedUsers,
      },
    });
  } catch (error) {
    console.error("Get assessment details error:", error);
    next(error);
  }
};

/**
 * Экспорт аттестации в Excel
 */
exports.exportAssessmentToExcel = async (req, res, next) => {
  try {
    const assessmentId = Number(req.params.id);
    const ExcelJS = require("exceljs");

    // Получить данные аттестации
    const [assessments] = await pool.query("SELECT * FROM assessments WHERE id = ?", [assessmentId]);

    if (assessments.length === 0) {
      return res.status(404).json({ error: "Аттестация не найдена" });
    }

    const assessment = assessments[0];

    // Получить результаты участников
    const [results] = await pool.query(
      `
      SELECT 
        u.first_name,
        u.last_name,
        b.name as branch_name,
        p.name as position_name,
        aa.status,
        aa.score_percent,
        aa.correct_answers,
        aa.total_questions,
        aa.started_at,
        aa.completed_at,
        TIMESTAMPDIFF(SECOND, aa.started_at, aa.completed_at) as time_spent_seconds
      FROM assessment_user_assignments aua
      JOIN users u ON aua.user_id = u.id
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN positions p ON u.position_id = p.id
      LEFT JOIN assessment_attempts aa ON aa.assessment_id = aua.assessment_id AND aa.user_id = u.id
      WHERE aua.assessment_id = ?
      ORDER BY u.last_name, u.first_name
    `,
      [assessmentId]
    );

    // Создать Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Результаты аттестации");

    // Заголовок
    worksheet.addRow([`Аттестация: ${assessment.title}`]);
    worksheet.addRow([`Дата экспорта: ${new Date().toLocaleString("ru-RU")}`]);
    worksheet.addRow([]);

    // Заголовки таблицы
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

    // Стилизация заголовка
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Данные
    results.forEach((result) => {
      worksheet.addRow([
        result.last_name,
        result.first_name,
        result.branch_name || "—",
        result.position_name || "—",
        result.status || "Не начат",
        result.score_percent || "—",
        result.correct_answers || "—",
        result.total_questions || "—",
        result.time_spent_seconds || "—",
        result.started_at ? new Date(result.started_at).toLocaleString("ru-RU") : "—",
        result.completed_at ? new Date(result.completed_at).toLocaleString("ru-RU") : "—",
      ]);
    });

    // Автоширина столбцов
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });

    // Отправить файл
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="assessment_${assessmentId}_${Date.now()}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export assessment error:", error);
    next(error);
  }
};
