const { pool } = require("../../../config/database");
const { createLog } = require("../../../services/adminLogService");

/**
 * РџРѕР»СѓС‡РёС‚СЊ СЃРїРёСЃРѕРє РєР°С‚РµРіРѕСЂРёР№
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
 * РџРѕР»СѓС‡РёС‚СЊ СЃРїРёСЃРѕРє РІРѕРїСЂРѕСЃРѕРІ РёР· Р±Р°РЅРєР°
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

    // Р—Р°РіСЂСѓР¶Р°РµРј РѕРїС†РёРё РґР»СЏ РєР°Р¶РґРѕРіРѕ РІРѕРїСЂРѕСЃР°
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
 * РџРѕР»СѓС‡РёС‚СЊ РІРѕРїСЂРѕСЃ РїРѕ ID СЃ РІР°СЂРёР°РЅС‚Р°РјРё РѕС‚РІРµС‚РѕРІ
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
      return res.status(404).json({ error: "Р’РѕРїСЂРѕСЃ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    const question = questions[0];

    // Р”Р»СЏ С‚РёРїРѕРІ СЃ РІР°СЂРёР°РЅС‚Р°РјРё РѕС‚РІРµС‚РѕРІ Р·Р°РіСЂСѓР¶Р°РµРј РѕРїС†РёРё
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
 * РЎРѕР·РґР°С‚СЊ РЅРѕРІС‹Р№ РІРѕРїСЂРѕСЃ
 */
exports.createQuestion = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { categoryId, questionText, questionType, correctTextAnswer, options } = req.body;

    // Р’Р°Р»РёРґР°С†РёСЏ С‚РёРїР°
    if (!["single", "multiple", "text", "matching"].includes(questionType)) {
      return res.status(400).json({ error: "РќРµРґРѕРїСѓСЃС‚РёРјС‹Р№ С‚РёРї РІРѕРїСЂРѕСЃР°" });
    }

    // Р’Р°Р»РёРґР°С†РёСЏ РґР»СЏ С‚РµРєСЃС‚РѕРІРѕРіРѕ С‚РёРїР°
    if (questionType === "text") {
      if (!correctTextAnswer) {
        return res.status(400).json({ error: "Р”Р»СЏ С‚РµРєСЃС‚РѕРІРѕРіРѕ РІРѕРїСЂРѕСЃР° РЅРµРѕР±С…РѕРґРёРјРѕ СѓРєР°Р·Р°С‚СЊ СЌС‚Р°Р»РѕРЅРЅС‹Р№ РѕС‚РІРµС‚" });
      }
    }

    // Р’Р°Р»РёРґР°С†РёСЏ РґР»СЏ С‚РёРїРѕРІ СЃ РІР°СЂРёР°РЅС‚Р°РјРё РѕС‚РІРµС‚РѕРІ
    if (questionType === "single" || questionType === "multiple" || questionType === "matching") {
      if (!options || options.length < 2 || options.length > 6) {
        return res.status(400).json({ error: "РќРµРѕР±С…РѕРґРёРјРѕ СѓРєР°Р·Р°С‚СЊ РѕС‚ 2 РґРѕ 6 РІР°СЂРёР°РЅС‚РѕРІ РѕС‚РІРµС‚РѕРІ" });
      }

      if (questionType === "matching") {
        const allPairsFilled = options.every((opt) => opt.text && opt.matchText && opt.matchText.trim().length > 0);
        if (!allPairsFilled) {
          return res.status(400).json({ error: "Р”Р»СЏ СЃРѕРїРѕСЃС‚Р°РІР»РµРЅРёСЏ РЅРµРѕР±С…РѕРґРёРјРѕ Р·Р°РїРѕР»РЅРёС‚СЊ РІСЃРµ РїР°СЂС‹" });
        }
      } else {
        const correctOptions = options.filter((opt) => opt.isCorrect);

        if (questionType === "single" && correctOptions.length !== 1) {
          return res.status(400).json({ error: "Р”Р»СЏ С‚РёРїР° 'РѕРґРёРЅ РІР°СЂРёР°РЅС‚' РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ СЂРѕРІРЅРѕ РѕРґРёРЅ РїСЂР°РІРёР»СЊРЅС‹Р№ РѕС‚РІРµС‚" });
        }

        if (questionType === "multiple" && correctOptions.length < 2) {
          return res.status(400).json({ error: "Р”Р»СЏ С‚РёРїР° 'РјРЅРѕР¶РµСЃС‚РІРµРЅРЅС‹Р№ РІС‹Р±РѕСЂ' РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ РјРёРЅРёРјСѓРј 2 РїСЂР°РІРёР»СЊРЅС‹С… РѕС‚РІРµС‚Р°" });
        }
      }
    }

    // РЎРѕР·РґР°С‚СЊ РІРѕРїСЂРѕСЃ
    const [result] = await connection.query(
      `
      INSERT INTO question_bank (category_id, question_text, question_type, correct_text_answer, created_by)
      VALUES (?, ?, ?, ?, ?)
    `,
      [categoryId || null, questionText, questionType, questionType === "text" ? correctTextAnswer : null, req.user.id]
    );

    const questionId = result.insertId;

    // Р”РѕР±Р°РІРёС‚СЊ РІР°СЂРёР°РЅС‚С‹ РѕС‚РІРµС‚РѕРІ РґР»СЏ С‚РёРїРѕРІ СЃ РІР°СЂРёР°РЅС‚Р°РјРё
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

    // Р›РѕРіРёСЂРѕРІР°РЅРёРµ РґРµР№СЃС‚РІРёСЏ
    await createLog(req.user.id, "CREATE", `РЎРѕР·РґР°РЅ РІРѕРїСЂРѕСЃ РІ Р±Р°РЅРєРµ (ID: ${questionId}, С‚РёРї: ${questionType})`, "question", questionId, req);

    res.status(201).json({ questionId, message: "Р’РѕРїСЂРѕСЃ СЃРѕР·РґР°РЅ СѓСЃРїРµС€РЅРѕ" });
  } catch (error) {
    await connection.rollback();
    console.error("Create question error:", error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * РћР±РЅРѕРІРёС‚СЊ РІРѕРїСЂРѕСЃ
 */
exports.updateQuestion = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const questionId = Number(req.params.id);

    // РџСЂРѕРІРµСЂРёС‚СЊ СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ
    const [questions] = await connection.query("SELECT id, question_type FROM question_bank WHERE id = ?", [questionId]);

    if (questions.length === 0) {
      return res.status(404).json({ error: "Р’РѕРїСЂРѕСЃ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    await connection.beginTransaction();

    const { categoryId, questionText, questionType, correctTextAnswer, options } = req.body;

    // Р’Р°Р»РёРґР°С†РёСЏ С‚РёРїР°
    if (!["single", "multiple", "text", "matching"].includes(questionType)) {
      return res.status(400).json({ error: "РќРµРґРѕРїСѓСЃС‚РёРјС‹Р№ С‚РёРї РІРѕРїСЂРѕСЃР°" });
    }

    // Р’Р°Р»РёРґР°С†РёСЏ РґР»СЏ С‚РµРєСЃС‚РѕРІРѕРіРѕ С‚РёРїР°
    if (questionType === "text") {
      if (!correctTextAnswer) {
        return res.status(400).json({ error: "Р”Р»СЏ С‚РµРєСЃС‚РѕРІРѕРіРѕ РІРѕРїСЂРѕСЃР° РЅРµРѕР±С…РѕРґРёРјРѕ СѓРєР°Р·Р°С‚СЊ СЌС‚Р°Р»РѕРЅРЅС‹Р№ РѕС‚РІРµС‚" });
      }
    }

    // Р’Р°Р»РёРґР°С†РёСЏ РґР»СЏ С‚РёРїРѕРІ СЃ РІР°СЂРёР°РЅС‚Р°РјРё РѕС‚РІРµС‚РѕРІ
    if (questionType === "single" || questionType === "multiple" || questionType === "matching") {
      if (!options || options.length < 2 || options.length > 6) {
        return res.status(400).json({ error: "РќРµРѕР±С…РѕРґРёРјРѕ СѓРєР°Р·Р°С‚СЊ РѕС‚ 2 РґРѕ 6 РІР°СЂРёР°РЅС‚РѕРІ РѕС‚РІРµС‚РѕРІ" });
      }

      if (questionType === "matching") {
        const allPairsFilled = options.every((opt) => opt.text && opt.matchText && opt.matchText.trim().length > 0);
        if (!allPairsFilled) {
          return res.status(400).json({ error: "Р”Р»СЏ СЃРѕРїРѕСЃС‚Р°РІР»РµРЅРёСЏ РЅРµРѕР±С…РѕРґРёРјРѕ Р·Р°РїРѕР»РЅРёС‚СЊ РІСЃРµ РїР°СЂС‹" });
        }
      } else {
        const correctOptions = options.filter((opt) => opt.isCorrect);

        if (questionType === "single" && correctOptions.length !== 1) {
          return res.status(400).json({ error: "Р”Р»СЏ С‚РёРїР° 'РѕРґРёРЅ РІР°СЂРёР°РЅС‚' РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ СЂРѕРІРЅРѕ РѕРґРёРЅ РїСЂР°РІРёР»СЊРЅС‹Р№ РѕС‚РІРµС‚" });
        }

        if (questionType === "multiple" && correctOptions.length < 2) {
          return res.status(400).json({ error: "Р”Р»СЏ С‚РёРїР° 'РјРЅРѕР¶РµСЃС‚РІРµРЅРЅС‹Р№ РІС‹Р±РѕСЂ' РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ РјРёРЅРёРјСѓРј 2 РїСЂР°РІРёР»СЊРЅС‹С… РѕС‚РІРµС‚Р°" });
        }
      }
    }

    // РћР±РЅРѕРІРёС‚СЊ РІРѕРїСЂРѕСЃ
    await connection.query(
      `
      UPDATE question_bank 
      SET category_id = ?, question_text = ?, question_type = ?, correct_text_answer = ?
      WHERE id = ?
    `,
      [categoryId || null, questionText, questionType, questionType === "text" ? correctTextAnswer : null, questionId]
    );

    // РЈРґР°Р»РёС‚СЊ СЃС‚Р°СЂС‹Рµ РІР°СЂРёР°РЅС‚С‹ РѕС‚РІРµС‚РѕРІ
    await connection.query("DELETE FROM question_bank_options WHERE question_id = ?", [questionId]);

    // Р”РѕР±Р°РІРёС‚СЊ РЅРѕРІС‹Рµ РІР°СЂРёР°РЅС‚С‹ РѕС‚РІРµС‚РѕРІ РґР»СЏ С‚РёРїРѕРІ СЃ РІР°СЂРёР°РЅС‚Р°РјРё
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

    // Р›РѕРіРёСЂРѕРІР°РЅРёРµ РґРµР№СЃС‚РІРёСЏ
    await createLog(req.user.id, "UPDATE", `РћР±РЅРѕРІР»РµРЅ РІРѕРїСЂРѕСЃ РІ Р±Р°РЅРєРµ (ID: ${questionId}, С‚РёРї: ${questionType})`, "question", questionId, req);

    res.json({ message: "Р’РѕРїСЂРѕСЃ РѕР±РЅРѕРІР»РµРЅ СѓСЃРїРµС€РЅРѕ" });
  } catch (error) {
    await connection.rollback();
    console.error("Update question error:", error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * РЈРґР°Р»РёС‚СЊ РІРѕРїСЂРѕСЃ
 */
exports.deleteQuestion = async (req, res, next) => {
  try {
    const questionId = Number(req.params.id);

    const [questions] = await pool.query("SELECT question_text FROM question_bank WHERE id = ?", [questionId]);

    if (questions.length === 0) {
      return res.status(404).json({ error: "Р’РѕРїСЂРѕСЃ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    await pool.query("DELETE FROM question_bank WHERE id = ?", [questionId]);

    // Р›РѕРіРёСЂРѕРІР°РЅРёРµ РґРµР№СЃС‚РІРёСЏ
    await createLog(req.user.id, "DELETE", `РЈРґР°Р»РµРЅ РІРѕРїСЂРѕСЃ РёР· Р±Р°РЅРєР° (ID: ${questionId})`, "question", questionId, req);

    res.status(204).send();
  } catch (error) {
    console.error("Delete question error:", error);
    next(error);
  }
};

/**
 * РЎРѕР·РґР°С‚СЊ РЅРѕРІСѓСЋ РєР°С‚РµРіРѕСЂРёСЋ
 */
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "РќР°Р·РІР°РЅРёРµ РєР°С‚РµРіРѕСЂРёРё РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ" });
    }

    const [result] = await pool.query(
      `
      INSERT INTO question_categories (name, description)
      VALUES (?, ?)
    `,
      [name, description || ""]
    );

    // Р›РѕРіРёСЂРѕРІР°РЅРёРµ РґРµР№СЃС‚РІРёСЏ
    await createLog(req.user.id, "CREATE", `РЎРѕР·РґР°РЅР° РєР°С‚РµРіРѕСЂРёСЏ РІРѕРїСЂРѕСЃРѕРІ: ${name} (ID: ${result.insertId})`, "category", result.insertId, req);

    res.status(201).json({ categoryId: result.insertId, message: "РљР°С‚РµРіРѕСЂРёСЏ СЃРѕР·РґР°РЅР°" });
  } catch (error) {
    console.error("Create category error:", error);
    next(error);
  }
};

/**
 * РћР±РЅРѕРІРёС‚СЊ РєР°С‚РµРіРѕСЂРёСЋ
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const categoryId = Number(req.params.id);
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "РќР°Р·РІР°РЅРёРµ РєР°С‚РµРіРѕСЂРёРё РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ" });
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
      return res.status(404).json({ error: "РљР°С‚РµРіРѕСЂРёСЏ РЅРµ РЅР°Р№РґРµРЅР°" });
    }

    // Р›РѕРіРёСЂРѕРІР°РЅРёРµ РґРµР№СЃС‚РІРёСЏ
    await createLog(req.user.id, "UPDATE", `РћР±РЅРѕРІР»РµРЅР° РєР°С‚РµРіРѕСЂРёСЏ РІРѕРїСЂРѕСЃРѕРІ: ${name} (ID: ${categoryId})`, "category", categoryId, req);

    res.json({ message: "РљР°С‚РµРіРѕСЂРёСЏ РѕР±РЅРѕРІР»РµРЅР°" });
  } catch (error) {
    console.error("Update category error:", error);
    next(error);
  }
};

/**
 * РЈРґР°Р»РёС‚СЊ РєР°С‚РµРіРѕСЂРёСЋ
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const categoryId = Number(req.params.id);

    // РџСЂРѕРІРµСЂРёС‚СЊ, РµСЃС‚СЊ Р»Рё РІРѕРїСЂРѕСЃС‹ РІ РєР°С‚РµРіРѕСЂРёРё
    const [questions] = await pool.query("SELECT COUNT(*) as count FROM question_bank WHERE category_id = ?", [categoryId]);

    if (questions[0].count > 0) {
      return res.status(400).json({ error: "РќРµРІРѕР·РјРѕР¶РЅРѕ СѓРґР°Р»РёС‚СЊ РєР°С‚РµРіРѕСЂРёСЋ СЃ РІРѕРїСЂРѕСЃР°РјРё" });
    }

    const [result] = await pool.query("DELETE FROM question_categories WHERE id = ?", [categoryId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "РљР°С‚РµРіРѕСЂРёСЏ РЅРµ РЅР°Р№РґРµРЅР°" });
    }

    // Р›РѕРіРёСЂРѕРІР°РЅРёРµ РґРµР№СЃС‚РІРёСЏ
    await createLog(req.user.id, "DELETE", `РЈРґР°Р»РµРЅР° РєР°С‚РµРіРѕСЂРёСЏ РІРѕРїСЂРѕСЃРѕРІ (ID: ${categoryId})`, "category", categoryId, req);

    res.status(204).send();
  } catch (error) {
    console.error("Delete category error:", error);
    next(error);
  }
};


