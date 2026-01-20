const { pool } = require("../config/database");
const { createLog } = require("./adminLogsController");

/**
 * Получить список категорий
 */
exports.getCategories = async (req, res, next) => {
  try {
    const [categories] = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.description,
        COUNT(qb.id) as questions_count
      FROM question_categories c
      LEFT JOIN question_bank qb ON c.id = qb.category_id
      GROUP BY c.id
      ORDER BY c.name
    `);

    res.json({ categories });
  } catch (error) {
    console.error("Get categories error:", error);
    next(error);
  }
};

/**
 * Получить список вопросов из банка
 */
exports.getQuestions = async (req, res, next) => {
  try {
    const { category, search, type } = req.query;

    let query = `
      SELECT 
        qb.id,
        qb.question_text,
        qb.question_type,
        qb.created_at,
        qb.updated_at,
        qc.name as category_name,
        qc.id as category_id,
        u.first_name,
        u.last_name
      FROM question_bank qb
      LEFT JOIN question_categories qc ON qb.category_id = qc.id
      LEFT JOIN users u ON qb.created_by = u.id
      WHERE 1=1
    `;

    const params = [];

    if (category) {
      query += " AND qb.category_id = ?";
      params.push(category);
    }

    if (search) {
      query += " AND qb.question_text LIKE ?";
      params.push(`%${search}%`);
    }

    if (type) {
      query += " AND qb.question_type = ?";
      params.push(type);
    }

    query += " ORDER BY qb.created_at DESC";

    const [questions] = await pool.query(query, params);

    // Загружаем опции для каждого вопроса
    for (const question of questions) {
      const [options] = await pool.query(
        "SELECT id, option_text, match_text, is_correct, order_index FROM question_bank_options WHERE question_id = ? ORDER BY order_index",
        [question.id]
      );
      question.options = options;
    }

    res.json({ questions });
  } catch (error) {
    console.error("Get questions error:", error);
    next(error);
  }
};

/**
 * Получить вопрос по ID с вариантами ответов
 */
exports.getQuestionById = async (req, res, next) => {
  try {
    const questionId = Number(req.params.id);

    const [questions] = await pool.query(
      `
      SELECT 
        qb.*,
        qc.name as category_name
      FROM question_bank qb
      LEFT JOIN question_categories qc ON qb.category_id = qc.id
      WHERE qb.id = ?
    `,
      [questionId]
    );

    if (questions.length === 0) {
      return res.status(404).json({ error: "Вопрос не найден" });
    }

    const question = questions[0];

    // Для типов с вариантами ответов загружаем опции
    if (question.question_type !== "text") {
      const [options] = await pool.query(
        "SELECT id, option_text, match_text, is_correct, order_index FROM question_bank_options WHERE question_id = ? ORDER BY order_index",
        [questionId]
      );
      question.options = options;
    } else {
      question.options = [];
    }

    res.json({ question });
  } catch (error) {
    console.error("Get question by ID error:", error);
    next(error);
  }
};

/**
 * Создать новый вопрос
 */
exports.createQuestion = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { categoryId, questionText, questionType, correctTextAnswer, options } = req.body;

    // Валидация типа
    if (!["single", "multiple", "text", "matching"].includes(questionType)) {
      return res.status(400).json({ error: "Недопустимый тип вопроса" });
    }

    // Валидация для текстового типа
    if (questionType === "text") {
      if (!correctTextAnswer) {
        return res.status(400).json({ error: "Для текстового вопроса необходимо указать эталонный ответ" });
      }
    }

    // Валидация для типов с вариантами ответов
    if (questionType === "single" || questionType === "multiple" || questionType === "matching") {
      if (!options || options.length < 2 || options.length > 6) {
        return res.status(400).json({ error: "Необходимо указать от 2 до 6 вариантов ответов" });
      }

      if (questionType === "matching") {
        const allPairsFilled = options.every((opt) => opt.text && opt.matchText && opt.matchText.trim().length > 0);
        if (!allPairsFilled) {
          return res.status(400).json({ error: "Для сопоставления необходимо заполнить все пары" });
        }
      } else {
        const correctOptions = options.filter((opt) => opt.isCorrect);

        if (questionType === "single" && correctOptions.length !== 1) {
          return res.status(400).json({ error: "Для типа 'один вариант' должен быть ровно один правильный ответ" });
        }

        if (questionType === "multiple" && correctOptions.length < 2) {
          return res.status(400).json({ error: "Для типа 'множественный выбор' должно быть минимум 2 правильных ответа" });
        }
      }
    }

    // Создать вопрос
    const [result] = await connection.query(
      `
      INSERT INTO question_bank (category_id, question_text, question_type, correct_text_answer, created_by)
      VALUES (?, ?, ?, ?, ?)
    `,
      [categoryId || null, questionText, questionType, questionType === "text" ? correctTextAnswer : null, req.user.id]
    );

    const questionId = result.insertId;

    // Добавить варианты ответов для типов с вариантами
    if (questionType !== "text" && options) {
      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        await connection.query(
          `
          INSERT INTO question_bank_options (question_id, option_text, match_text, is_correct, order_index)
          VALUES (?, ?, ?, ?, ?)
        `,
          [questionId, option.text, questionType === "matching" ? option.matchText || "" : null, option.isCorrect ? 1 : 0, i]
        );
      }
    }

    await connection.commit();

    // Логирование действия
    await createLog(req.user.id, "CREATE", `Создан вопрос в банке (ID: ${questionId}, тип: ${questionType})`, "question", questionId, req);

    res.status(201).json({ questionId, message: "Вопрос создан успешно" });
  } catch (error) {
    await connection.rollback();
    console.error("Create question error:", error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Обновить вопрос
 */
exports.updateQuestion = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const questionId = Number(req.params.id);

    // Проверить существование
    const [questions] = await connection.query("SELECT id, question_type FROM question_bank WHERE id = ?", [questionId]);

    if (questions.length === 0) {
      return res.status(404).json({ error: "Вопрос не найден" });
    }

    await connection.beginTransaction();

    const { categoryId, questionText, questionType, correctTextAnswer, options } = req.body;

    // Валидация типа
    if (!["single", "multiple", "text", "matching"].includes(questionType)) {
      return res.status(400).json({ error: "Недопустимый тип вопроса" });
    }

    // Валидация для текстового типа
    if (questionType === "text") {
      if (!correctTextAnswer) {
        return res.status(400).json({ error: "Для текстового вопроса необходимо указать эталонный ответ" });
      }
    }

    // Валидация для типов с вариантами ответов
    if (questionType === "single" || questionType === "multiple" || questionType === "matching") {
      if (!options || options.length < 2 || options.length > 6) {
        return res.status(400).json({ error: "Необходимо указать от 2 до 6 вариантов ответов" });
      }

      if (questionType === "matching") {
        const allPairsFilled = options.every((opt) => opt.text && opt.matchText && opt.matchText.trim().length > 0);
        if (!allPairsFilled) {
          return res.status(400).json({ error: "Для сопоставления необходимо заполнить все пары" });
        }
      } else {
        const correctOptions = options.filter((opt) => opt.isCorrect);

        if (questionType === "single" && correctOptions.length !== 1) {
          return res.status(400).json({ error: "Для типа 'один вариант' должен быть ровно один правильный ответ" });
        }

        if (questionType === "multiple" && correctOptions.length < 2) {
          return res.status(400).json({ error: "Для типа 'множественный выбор' должно быть минимум 2 правильных ответа" });
        }
      }
    }

    // Обновить вопрос
    await connection.query(
      `
      UPDATE question_bank 
      SET category_id = ?, question_text = ?, question_type = ?, correct_text_answer = ?
      WHERE id = ?
    `,
      [categoryId || null, questionText, questionType, questionType === "text" ? correctTextAnswer : null, questionId]
    );

    // Удалить старые варианты ответов
    await connection.query("DELETE FROM question_bank_options WHERE question_id = ?", [questionId]);

    // Добавить новые варианты ответов для типов с вариантами
    if (questionType !== "text" && options) {
      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        await connection.query(
          `
          INSERT INTO question_bank_options (question_id, option_text, match_text, is_correct, order_index)
          VALUES (?, ?, ?, ?, ?)
        `,
          [questionId, option.text, questionType === "matching" ? option.matchText || "" : null, option.isCorrect ? 1 : 0, i]
        );
      }
    }

    await connection.commit();

    // Логирование действия
    await createLog(req.user.id, "UPDATE", `Обновлен вопрос в банке (ID: ${questionId}, тип: ${questionType})`, "question", questionId, req);

    res.json({ message: "Вопрос обновлен успешно" });
  } catch (error) {
    await connection.rollback();
    console.error("Update question error:", error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Удалить вопрос
 */
exports.deleteQuestion = async (req, res, next) => {
  try {
    const questionId = Number(req.params.id);

    const [questions] = await pool.query("SELECT question_text FROM question_bank WHERE id = ?", [questionId]);

    if (questions.length === 0) {
      return res.status(404).json({ error: "Вопрос не найден" });
    }

    await pool.query("DELETE FROM question_bank WHERE id = ?", [questionId]);

    // Логирование действия
    await createLog(req.user.id, "DELETE", `Удален вопрос из банка (ID: ${questionId})`, "question", questionId, req);

    res.status(204).send();
  } catch (error) {
    console.error("Delete question error:", error);
    next(error);
  }
};

/**
 * Создать новую категорию
 */
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Название категории обязательно" });
    }

    const [result] = await pool.query(
      `
      INSERT INTO question_categories (name, description)
      VALUES (?, ?)
    `,
      [name, description || ""]
    );

    // Логирование действия
    await createLog(req.user.id, "CREATE", `Создана категория вопросов: ${name} (ID: ${result.insertId})`, "category", result.insertId, req);

    res.status(201).json({ categoryId: result.insertId, message: "Категория создана" });
  } catch (error) {
    console.error("Create category error:", error);
    next(error);
  }
};

/**
 * Обновить категорию
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const categoryId = Number(req.params.id);
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Название категории обязательно" });
    }

    const [result] = await pool.query(
      `
      UPDATE question_categories 
      SET name = ?, description = ?
      WHERE id = ?
    `,
      [name, description || "", categoryId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Категория не найдена" });
    }

    // Логирование действия
    await createLog(req.user.id, "UPDATE", `Обновлена категория вопросов: ${name} (ID: ${categoryId})`, "category", categoryId, req);

    res.json({ message: "Категория обновлена" });
  } catch (error) {
    console.error("Update category error:", error);
    next(error);
  }
};

/**
 * Удалить категорию
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const categoryId = Number(req.params.id);

    // Проверить, есть ли вопросы в категории
    const [questions] = await pool.query("SELECT COUNT(*) as count FROM question_bank WHERE category_id = ?", [categoryId]);

    if (questions[0].count > 0) {
      return res.status(400).json({ error: "Невозможно удалить категорию с вопросами" });
    }

    const [result] = await pool.query("DELETE FROM question_categories WHERE id = ?", [categoryId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Категория не найдена" });
    }

    // Логирование действия
    await createLog(req.user.id, "DELETE", `Удалена категория вопросов (ID: ${categoryId})`, "category", categoryId, req);

    res.status(204).send();
  } catch (error) {
    console.error("Delete category error:", error);
    next(error);
  }
};
