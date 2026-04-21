const { pool } = require("../../../../config/database");
const { createAdminLog } = require("./repository");
const assessmentModel = require("../../../../models/assessmentModel");

/**
 * РџРѕР»СѓС‡РёС‚СЊ СЃРїРёСЃРѕРє РІСЃРµС… Р°С‚С‚РµСЃС‚Р°С†РёР№ РґР»СЏ Р°РґРјРёРЅ-РїР°РЅРµР»Рё
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

    // РћРіСЂР°РЅРёС‡РµРЅРёРµ РґР»СЏ СѓРїСЂР°РІР»СЏСЋС‰РµРіРѕ: С‚РѕР»СЊРєРѕ РµРіРѕ С„РёР»РёР°Р»С‹ РР›Р СЃРѕР·РґР°РЅРЅС‹Рµ РёРј СЃР°РјРёРј
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

    // Р¤РёР»СЊС‚СЂ РїРѕ С„РёР»РёР°Р»Сѓ
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
          WHERE aa.assessment_id = a.id
            AND aa.status = 'completed'
            AND aa.score_percent >= a.pass_score_percent
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
 * РџРѕР»СѓС‡РёС‚СЊ РґРµС‚Р°Р»Рё Р°С‚С‚РµСЃС‚Р°С†РёРё СЃ РІРѕРїСЂРѕСЃР°РјРё
 */
exports.getAssessmentById = async (req, res, next) => {
  try {
    const assessmentId = Number(req.params.id);

    // РџРѕР»СѓС‡РёС‚СЊ РѕСЃРЅРѕРІРЅСѓСЋ РёРЅС„РѕСЂРјР°С†РёСЋ
    const [assessments] = await pool.query("SELECT * FROM assessments WHERE id = ?", [assessmentId]);

    if (assessments.length === 0) {
      return res.status(404).json({ error: "РђС‚С‚РµСЃС‚Р°С†РёСЏ РЅРµ РЅР°Р№РґРµРЅР°" });
    }

    const assessment = assessments[0];

    // РџРѕР»СѓС‡РёС‚СЊ РІРѕРїСЂРѕСЃС‹ СЃ РІР°СЂРёР°РЅС‚Р°РјРё РѕС‚РІРµС‚РѕРІ
    const [questions] = await pool.query(
      `
      SELECT 
        q.id,
        q.question_text,
        q.question_bank_id,
        q.order_index,
        q.question_type,
        q.correct_text_answer
      FROM assessment_questions q
      WHERE q.assessment_id = ?
      ORDER BY q.order_index
    `,
      [assessmentId]
    );

    // РџРѕР»СѓС‡РёС‚СЊ РІР°СЂРёР°РЅС‚С‹ РѕС‚РІРµС‚РѕРІ РґР»СЏ РєР°Р¶РґРѕРіРѕ РІРѕРїСЂРѕСЃР°
    for (const question of questions) {
      const [options] = await pool.query(
        `
        SELECT id, option_text, match_text, is_correct, order_index
        FROM assessment_question_options
        WHERE question_id = ?
        ORDER BY order_index
      `,
        [question.id]
      );
      question.options = options;
    }

    // РџРѕР»СѓС‡РёС‚СЊ РЅР°Р·РЅР°С‡РµРЅРЅС‹С… РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№
    const [assignedUsers] = await pool.query(
      `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.telegram_id,
        b.name as branch_name,
        p.name as position_name
      FROM users u
      JOIN (
        SELECT aua.user_id AS user_id
        FROM assessment_user_assignments aua
        WHERE aua.assessment_id = ?
        UNION
        SELECT u.id AS user_id
        FROM assessment_branch_assignments aba
        JOIN users u ON u.branch_id = aba.branch_id
        WHERE aba.assessment_id = ?
          AND NOT EXISTS (
            SELECT 1 FROM assessment_position_assignments apa WHERE apa.assessment_id = aba.assessment_id
          )
        UNION
        SELECT u.id AS user_id
        FROM assessment_position_assignments apa
        JOIN users u ON u.position_id = apa.position_id
        WHERE apa.assessment_id = ?
          AND NOT EXISTS (
            SELECT 1 FROM assessment_branch_assignments aba WHERE aba.assessment_id = apa.assessment_id
          )
        UNION
        SELECT u.id AS user_id
        FROM assessment_branch_assignments aba
        JOIN assessment_position_assignments apa ON apa.assessment_id = aba.assessment_id
        JOIN users u ON u.branch_id = aba.branch_id AND u.position_id = apa.position_id
        WHERE aba.assessment_id = ?
      ) assigned ON assigned.user_id = u.id
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN positions p ON u.position_id = p.id
    `,
      [assessmentId, assessmentId, assessmentId, assessmentId]
    );

    // РџРѕР»СѓС‡РёС‚СЊ СЂРµР·СѓР»СЊС‚Р°С‚С‹ РїРѕРїС‹С‚РѕРє
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
 * РЎРѕР·РґР°С‚СЊ РЅРѕРІСѓСЋ Р°С‚С‚РµСЃС‚Р°С†РёСЋ
 */
exports.createAssessment = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { title, description, openAt, closeAt, timeLimitMinutes, passScorePercent, maxAttempts, userIds, positionIds, branchIds, questions } =
      req.body;

    // Р’Р°Р»РёРґР°С†РёСЏ
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
      return res.status(400).json({ error: "Р’СЃРµ РѕР±СЏР·Р°С‚РµР»СЊРЅС‹Рµ РїРѕР»СЏ РґРѕР»Р¶РЅС‹ Р±С‹С‚СЊ Р·Р°РїРѕР»РЅРµРЅС‹" });
    }

    if (new Date(closeAt) <= new Date(openAt)) {
      return res.status(400).json({ error: "Р”Р°С‚Р° Р·Р°РєСЂС‹С‚РёСЏ РґРѕР»Р¶РЅР° Р±С‹С‚СЊ РїРѕР·Р¶Рµ РґР°С‚С‹ РѕС‚РєСЂС‹С‚РёСЏ" });
    }

    // РџРѕР»СѓС‡РёС‚СЊ РёРЅС„РѕСЂРјР°С†РёСЋ Рѕ С‚РµРєСѓС‰РµРј РїРѕР»СЊР·РѕРІР°С‚РµР»Рµ
    const [currentUserData] = await connection.query(
      `SELECT u.id, u.branch_id, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (currentUserData.length === 0) {
      return res.status(403).json({ error: "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    const currentUser = currentUserData[0];

    // Р”Р»СЏ СѓРїСЂР°РІР»СЏСЋС‰РµРіРѕ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё РїРѕРґСЃС‚Р°РІР»СЏРµРј РµРіРѕ С„РёР»РёР°Р»
    let finalBranchIds = branchIds || [];
    let finalPositionIds = positionIds || [];
    let finalUserIds = userIds || [];

    if (currentUser.role_name === "manager") {
      if (!currentUser.branch_id) {
        return res.status(400).json({ error: "РЈ СѓРїСЂР°РІР»СЏСЋС‰РµРіРѕ РЅРµ СѓРєР°Р·Р°РЅ С„РёР»РёР°Р»" });
      }
      // РЈРїСЂР°РІР»СЏСЋС‰РёР№ РјРѕР¶РµС‚ РЅР°Р·РЅР°С‡Р°С‚СЊ С‚РѕР»СЊРєРѕ РЅР° СЃРІРѕР№ С„РёР»РёР°Р»
      finalBranchIds = [currentUser.branch_id];

      // Р’Р°Р»РёРґР°С†РёСЏ: РµСЃР»Рё СѓРєР°Р·Р°РЅС‹ РґРѕР»Р¶РЅРѕСЃС‚Рё, РїСЂРѕРІРµСЂСЏРµРј С‡С‚Рѕ РѕРЅРё РµСЃС‚СЊ РІ РµРіРѕ С„РёР»РёР°Р»Рµ
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
          return res.status(400).json({ error: "Р’С‹Р±СЂР°РЅС‹ РґРѕР»Р¶РЅРѕСЃС‚Рё, РєРѕС‚РѕСЂС‹С… РЅРµС‚ РІ РІР°С€РµРј С„РёР»РёР°Р»Рµ" });
        }
        finalPositionIds = positionIds;
      }

      // Р’Р°Р»РёРґР°С†РёСЏ: РµСЃР»Рё СѓРєР°Р·Р°РЅС‹ РїРѕР»СЊР·РѕРІР°С‚РµР»Рё, РїСЂРѕРІРµСЂСЏРµРј С‡С‚Рѕ РѕРЅРё РёР· РµРіРѕ С„РёР»РёР°Р»Р°
      if (userIds && userIds.length > 0) {
        const [validUsers] = await connection.query(`SELECT id FROM users WHERE id IN (?) AND branch_id = ?`, [userIds, currentUser.branch_id]);
        const validUserIds = validUsers.map((u) => u.id);
        const invalidUsers = userIds.filter((id) => !validUserIds.includes(id));
        if (invalidUsers.length > 0) {
          return res.status(400).json({ error: "Р’С‹Р±СЂР°РЅС‹ РїРѕР»СЊР·РѕРІР°С‚РµР»Рё, РєРѕС‚РѕСЂС‹Рµ РЅРµ РѕС‚РЅРѕСЃСЏС‚СЃСЏ Рє РІР°С€РµРјСѓ С„РёР»РёР°Р»Сѓ" });
        }
        finalUserIds = userIds;
      }
    }

    // РЎРѕР·РґР°С‚СЊ Р°С‚С‚РµСЃС‚Р°С†РёСЋ
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

    // Р”РѕР±Р°РІРёС‚СЊ РІРѕРїСЂРѕСЃС‹
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const questionType = question.questionType || "single";
      const correctTextAnswer = questionType === "text" ? question.correctTextAnswer || "" : null;
      if (!["single", "multiple", "text", "matching"].includes(questionType)) {
        return res.status(400).json({ error: "РќРµРґРѕРїСѓСЃС‚РёРјС‹Р№ С‚РёРї РІРѕРїСЂРѕСЃР°" });
      }
      if (questionType === "text" && !correctTextAnswer) {
        return res.status(400).json({ error: "Р”Р»СЏ С‚РµРєСЃС‚РѕРІРѕРіРѕ РІРѕРїСЂРѕСЃР° РЅРµРѕР±С…РѕРґРёРјРѕ СѓРєР°Р·Р°С‚СЊ СЌС‚Р°Р»РѕРЅРЅС‹Р№ РѕС‚РІРµС‚" });
      }
      if (questionType !== "text") {
        if (!question.options || question.options.length < 2 || question.options.length > 6) {
          return res.status(400).json({ error: "РќРµРѕР±С…РѕРґРёРјРѕ СѓРєР°Р·Р°С‚СЊ РѕС‚ 2 РґРѕ 6 РІР°СЂРёР°РЅС‚РѕРІ РѕС‚РІРµС‚РѕРІ" });
        }
        if (questionType === "matching") {
          const allPairsFilled = question.options.every((opt) => opt.text && opt.matchText && opt.matchText.trim().length > 0);
          if (!allPairsFilled) {
            return res.status(400).json({ error: "Р”Р»СЏ СЃРѕРїРѕСЃС‚Р°РІР»РµРЅРёСЏ РЅРµРѕР±С…РѕРґРёРјРѕ Р·Р°РїРѕР»РЅРёС‚СЊ РІСЃРµ РїР°СЂС‹" });
          }
        } else {
          const correctCount = question.options.filter((opt) => opt.isCorrect).length;
          if (questionType === "single" && correctCount !== 1) {
            return res.status(400).json({ error: "Р”Р»СЏ С‚РёРїР° 'РѕРґРёРЅ РІР°СЂРёР°РЅС‚' РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ СЂРѕРІРЅРѕ РѕРґРёРЅ РїСЂР°РІРёР»СЊРЅС‹Р№ РѕС‚РІРµС‚" });
          }
          if (questionType === "multiple" && correctCount < 2) {
            return res.status(400).json({ error: "Р”Р»СЏ С‚РёРїР° 'РјРЅРѕР¶РµСЃС‚РІРµРЅРЅС‹Р№ РІС‹Р±РѕСЂ' РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ РјРёРЅРёРјСѓРј 2 РїСЂР°РІРёР»СЊРЅС‹С… РѕС‚РІРµС‚Р°" });
          }
        }
      }
      const [qResult] = await connection.query(
        `
        INSERT INTO assessment_questions (assessment_id, question_bank_id, question_text, order_index, question_type, correct_text_answer)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [assessmentId, question.questionBankId || null, question.text, i, questionType, correctTextAnswer]
      );

      const questionId = qResult.insertId;

      if (questionType !== "text" && question.options) {
        for (let j = 0; j < question.options.length; j++) {
          const option = question.options[j];
          const isCorrectValue = questionType === "single" || questionType === "multiple" ? (option.isCorrect ? 1 : 0) : 0;
          console.log(
            `[createAssessment] Saving option: questionId=${questionId}, text="${option.text}", isCorrect=${
              option.isCorrect
            } (type: ${typeof option.isCorrect}), converted=${isCorrectValue}`
          );
          await connection.query(
            `
            INSERT INTO assessment_question_options (question_id, option_text, match_text, is_correct, order_index)
            VALUES (?, ?, ?, ?, ?)
          `,
            [questionId, option.text, questionType === "matching" ? option.matchText || "" : null, isCorrectValue, j]
          );
        }
      }
    }

    // РќР°Р·РЅР°С‡РёС‚СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№
    let autoUserIds = [];

    // РЎРѕС…СЂР°РЅРёС‚СЊ РЅР°Р·РЅР°С‡РµРЅРёСЏ РїРѕ С„РёР»РёР°Р»Р°Рј
    if (finalBranchIds && finalBranchIds.length > 0) {
      const branchValues = finalBranchIds.map((bid) => [assessmentId, bid]);
      await connection.query("INSERT INTO assessment_branch_assignments (assessment_id, branch_id) VALUES ?", [branchValues]);
    }

    // РЎРѕС…СЂР°РЅРёС‚СЊ РЅР°Р·РЅР°С‡РµРЅРёСЏ РїРѕ РґРѕР»Р¶РЅРѕСЃС‚СЏРј
    if (finalPositionIds && finalPositionIds.length > 0) {
      const positionValues = finalPositionIds.map((pid) => [assessmentId, pid]);
      await connection.query("INSERT INTO assessment_position_assignments (assessment_id, position_id) VALUES ?", [positionValues]);
    }

    // РџРѕР»СѓС‡РёС‚СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ РІ Р·Р°РІРёСЃРёРјРѕСЃС‚Рё РѕС‚ РєРѕРјР±РёРЅР°С†РёРё С„РёР»РёР°Р»РѕРІ Рё РґРѕР»Р¶РЅРѕСЃС‚РµР№
    if (finalBranchIds && finalBranchIds.length > 0 && finalPositionIds && finalPositionIds.length > 0) {
      // РљРѕРјР±РёРЅР°С†РёСЏ: С„РёР»РёР°Р» + РґРѕР»Р¶РЅРѕСЃС‚СЊ (РїРѕР»СЊР·РѕРІР°С‚РµР»Рё РґРѕР»Р¶РЅС‹ СЃРѕРѕС‚РІРµС‚СЃС‚РІРѕРІР°С‚СЊ РћР‘РћРРњ РєСЂРёС‚РµСЂРёСЏРј)
      const [usersFromBoth] = await connection.query(
        `SELECT DISTINCT u.id, u.first_name, u.last_name FROM users u
         WHERE u.branch_id IN (?) 
           AND u.position_id IN (?)`,
        [finalBranchIds, finalPositionIds]
      );
      console.log("Users from branch+position:", usersFromBoth);
      autoUserIds.push(...usersFromBoth.map((u) => u.id));
    } else if (finalBranchIds && finalBranchIds.length > 0) {
      // РўРѕР»СЊРєРѕ С„РёР»РёР°Р»С‹
      const [usersFromBranches] = await connection.query(
        `SELECT DISTINCT u.id, u.first_name, u.last_name FROM users u
         WHERE u.branch_id IN (?)`,
        [finalBranchIds]
      );
      console.log("Users from branches:", usersFromBranches);
      autoUserIds.push(...usersFromBranches.map((u) => u.id));
    } else if (finalPositionIds && finalPositionIds.length > 0) {
      // РўРѕР»СЊРєРѕ РґРѕР»Р¶РЅРѕСЃС‚Рё
      const [usersFromPositions] = await connection.query(
        `SELECT DISTINCT u.id, u.first_name, u.last_name FROM users u
         WHERE u.position_id IN (?)`,
        [finalPositionIds]
      );
      console.log("Users from positions:", usersFromPositions);
      autoUserIds.push(...usersFromPositions.map((u) => u.id));
    }

    // РќР°Р·РЅР°С‡РёС‚СЊ РїРѕ userIds РЅР°РїСЂСЏРјСѓСЋ
    const directUserIds = Array.isArray(finalUserIds) ? [...new Set(finalUserIds)] : [];
    autoUserIds = [...new Set(autoUserIds)];
    const assignedUserIds = [...new Set([...autoUserIds, ...directUserIds])];

    console.log("=== Assignment Debug ===");
    console.log("Final Branch IDs:", finalBranchIds);
    console.log("Final Position IDs:", finalPositionIds);
    console.log("Final User IDs:", finalUserIds);
    console.log("Assigned User IDs:", assignedUserIds);
    console.log("Direct User IDs:", directUserIds);
    console.log("Auto User IDs:", autoUserIds);
    console.log("=======================");

    // Р’СЃС‚Р°РІРёС‚СЊ РЅР°Р·РЅР°С‡РµРЅРёСЏ
    if (assignedUserIds.length > 0) {
      const autoValues = autoUserIds.map((uid) => [assessmentId, uid, 0]);
      const directValues = directUserIds.map((uid) => [assessmentId, uid, 1]);
      const assignmentValues = [...autoValues, ...directValues];
      await connection.query(
        `INSERT INTO assessment_user_assignments (assessment_id, user_id, is_direct)
         VALUES ?
         ON DUPLICATE KEY UPDATE is_direct = GREATEST(is_direct, VALUES(is_direct))`,
        [assignmentValues]
      );
    } else {
      console.warn("Warning: No users assigned to assessment", assessmentId);
    }

    await connection.commit();

    // Р›РѕРіРёСЂРѕРІР°РЅРёРµ РґРµР№СЃС‚РІРёСЏ
    await createAdminLog(
      req.user.id,
      "CREATE",
      `РЎРѕР·РґР°РЅР° Р°С‚С‚РµСЃС‚Р°С†РёСЏ: ${title} (ID: ${assessmentId}, РІРѕРїСЂРѕСЃРѕРІ: ${questions.length}, РЅР°Р·РЅР°С‡РµРЅРѕ: ${assignedUserIds.length})`,
      "assessment",
      assessmentId,
      req
    );

    res.status(201).json({ assessmentId, message: "РђС‚С‚РµСЃС‚Р°С†РёСЏ СЃРѕР·РґР°РЅР° СѓСЃРїРµС€РЅРѕ" });
  } catch (error) {
    await connection.rollback();
    console.error("Create assessment error:", error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * РћР±РЅРѕРІРёС‚СЊ Р°С‚С‚РµСЃС‚Р°С†РёСЋ (С‚РѕР»СЊРєРѕ РµСЃР»Рё СЃС‚Р°С‚СѓСЃ = pending)
 */
exports.updateAssessment = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const assessmentId = Number(req.params.id);
    const userRole = req.user.role;
    const userId = req.user.id;

    // РџСЂРѕРІРµСЂРёС‚СЊ Р°С‚С‚РµСЃС‚Р°С†РёСЋ Рё РІС‹С‡РёСЃР»РёС‚СЊ СЃС‚Р°С‚СѓСЃ
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
      return res.status(404).json({ error: "РђС‚С‚РµСЃС‚Р°С†РёСЏ РЅРµ РЅР°Р№РґРµРЅР°" });
    }

    const assessment = assessments[0];

    // РџСЂРѕРІРµСЂРєР° РґРѕСЃС‚СѓРїР° РґР»СЏ СѓРїСЂР°РІР»СЏСЋС‰РµРіРѕ
    if (userRole === "manager") {
      // РЈРїСЂР°РІР»СЏСЋС‰РёР№ РјРѕР¶РµС‚ СЂРµРґР°РєС‚РёСЂРѕРІР°С‚СЊ С‚РѕР»СЊРєРѕ СЃРІРѕРё Р°С‚С‚РµСЃС‚Р°С†РёРё
      if (assessment.created_by !== userId) {
        return res.status(403).json({ error: "РќРµС‚ РґРѕСЃС‚СѓРїР° Рє СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёСЋ СЌС‚РѕР№ Р°С‚С‚РµСЃС‚Р°С†РёРё" });
      }
    }

    await connection.beginTransaction();

    const { title, description, openAt, closeAt, timeLimitMinutes, passScorePercent, maxAttempts, questions, branchIds, positionIds, userIds } =
      req.body;

    const canEditParameters = true;

    // РћР±РЅРѕРІРёС‚СЊ РѕСЃРЅРѕРІРЅСѓСЋ РёРЅС„РѕСЂРјР°С†РёСЋ (title, description, РґР°С‚С‹ РјРѕР¶РЅРѕ РІСЃРµРіРґР°)
    const updateFields = ["title = ?", "description = ?", "open_at = ?", "close_at = ?"];
    const updateValues = [title, description || "", openAt, closeAt];

    updateFields.push("time_limit_minutes = ?", "pass_score_percent = ?", "max_attempts = ?");
    updateValues.push(timeLimitMinutes, passScorePercent, maxAttempts);

    updateValues.push(assessmentId);

    await connection.query(`UPDATE assessments SET ${updateFields.join(", ")} WHERE id = ?`, updateValues);

    // РћР±РЅРѕРІРёС‚СЊ РЅР°Р·РЅР°С‡РµРЅРёСЏ
    if (branchIds !== undefined || positionIds !== undefined || userIds !== undefined) {
      // РџРѕР»СѓС‡РёС‚СЊ С‚РµРєСѓС‰СѓСЋ СЂРѕР»СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
      const currentUser = req.user;

      // РћРїСЂРµРґРµР»РёС‚СЊ С„РёРЅР°Р»СЊРЅС‹Рµ РјР°СЃСЃРёРІС‹ РґР»СЏ РЅР°Р·РЅР°С‡РµРЅРёСЏ
      let finalBranchIds = branchIds || [];
      let finalPositionIds = positionIds || [];
      let finalUserIds = userIds || [];

      // Р•СЃР»Рё С‚РµРєСѓС‰РёР№ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ - РјРµРЅРµРґР¶РµСЂ, РѕРіСЂР°РЅРёС‡РёС‚СЊ РЅР°Р·РЅР°С‡РµРЅРёРµ С‚РѕР»СЊРєРѕ РµРіРѕ С„РёР»РёР°Р»РѕРј
      if (currentUser.role === "manager") {
        if (!currentUser.branch_id) {
          throw new Error("РЈ РјРµРЅРµРґР¶РµСЂР° РЅРµ СѓРєР°Р·Р°РЅ С„РёР»РёР°Р»");
        }
        // РњРµРЅРµРґР¶РµСЂ РјРѕР¶РµС‚ РЅР°Р·РЅР°С‡Р°С‚СЊ С‚РѕР»СЊРєРѕ РЅР° СЃРІРѕР№ С„РёР»РёР°Р»
        finalBranchIds = [currentUser.branch_id];
      }

      // РЈРґР°Р»РёС‚СЊ СЃС‚Р°СЂС‹Рµ РЅР°Р·РЅР°С‡РµРЅРёСЏ
      await connection.query("DELETE FROM assessment_branch_assignments WHERE assessment_id = ?", [assessmentId]);
      await connection.query("DELETE FROM assessment_position_assignments WHERE assessment_id = ?", [assessmentId]);
      await connection.query("DELETE FROM assessment_user_assignments WHERE assessment_id = ?", [assessmentId]);

      // Р”РѕР±Р°РІРёС‚СЊ РЅРѕРІС‹Рµ РЅР°Р·РЅР°С‡РµРЅРёСЏ РїРѕ С„РёР»РёР°Р»Р°Рј
      if (finalBranchIds && finalBranchIds.length > 0) {
        const branchValues = finalBranchIds.map((bid) => [assessmentId, bid]);
        await connection.query("INSERT INTO assessment_branch_assignments (assessment_id, branch_id) VALUES ?", [branchValues]);
      }

      // Р”РѕР±Р°РІРёС‚СЊ РЅРѕРІС‹Рµ РЅР°Р·РЅР°С‡РµРЅРёСЏ РїРѕ РґРѕР»Р¶РЅРѕСЃС‚СЏРј
      if (finalPositionIds && finalPositionIds.length > 0) {
        const positionValues = finalPositionIds.map((pid) => [assessmentId, pid]);
        await connection.query("INSERT INTO assessment_position_assignments (assessment_id, position_id) VALUES ?", [positionValues]);
      }

      // РџРѕР»СѓС‡РёС‚СЊ СЃРїРёСЃРѕРє РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ РЅР° РѕСЃРЅРѕРІРµ РЅР°Р·РЅР°С‡РµРЅРёР№
      let autoUserIds = [];

      if (finalBranchIds && finalBranchIds.length > 0 && finalPositionIds && finalPositionIds.length > 0) {
        // РљРѕРјР±РёРЅР°С†РёСЏ: С„РёР»РёР°Р» + РґРѕР»Р¶РЅРѕСЃС‚СЊ (РїРѕР»СЊР·РѕРІР°С‚РµР»Рё РґРѕР»Р¶РЅС‹ СЃРѕРѕС‚РІРµС‚СЃС‚РІРѕРІР°С‚СЊ РћР‘РћРРњ РєСЂРёС‚РµСЂРёСЏРј)
        const [usersFromBoth] = await connection.query(
          `SELECT DISTINCT u.id FROM users u
           WHERE u.branch_id IN (?) 
             AND u.position_id IN (?)`,
          [finalBranchIds, finalPositionIds]
        );
        autoUserIds.push(...usersFromBoth.map((u) => u.id));
      } else if (finalBranchIds && finalBranchIds.length > 0) {
        // РўРѕР»СЊРєРѕ С„РёР»РёР°Р»С‹
        const [usersFromBranches] = await connection.query(`SELECT DISTINCT u.id FROM users u WHERE u.branch_id IN (?)`, [finalBranchIds]);
        autoUserIds.push(...usersFromBranches.map((u) => u.id));
      } else if (finalPositionIds && finalPositionIds.length > 0) {
        // РўРѕР»СЊРєРѕ РґРѕР»Р¶РЅРѕСЃС‚Рё
        const [usersFromPositions] = await connection.query(`SELECT DISTINCT u.id FROM users u WHERE u.position_id IN (?)`, [finalPositionIds]);
        autoUserIds.push(...usersFromPositions.map((u) => u.id));
      }

      // Р”РѕР±Р°РІРёС‚СЊ РЅР°РїСЂСЏРјСѓСЋ РІС‹Р±СЂР°РЅРЅС‹С… РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№
      const directUserIds = Array.isArray(finalUserIds) ? [...new Set(finalUserIds)] : [];
      autoUserIds = [...new Set(autoUserIds)];
      const assignedUserIds = [...new Set([...autoUserIds, ...directUserIds])];

      // Р”РѕР±Р°РІРёС‚СЊ Р·Р°РїРёСЃРё РІ assessment_user_assignments
      if (assignedUserIds.length > 0) {
        const autoValues = autoUserIds.map((uid) => [assessmentId, uid, 0]);
        const directValues = directUserIds.map((uid) => [assessmentId, uid, 1]);
        const userAssignmentValues = [...autoValues, ...directValues];
        await connection.query(
          `INSERT INTO assessment_user_assignments (assessment_id, user_id, is_direct)
           VALUES ?
           ON DUPLICATE KEY UPDATE is_direct = GREATEST(is_direct, VALUES(is_direct))`,
          [userAssignmentValues]
        );
      }

      console.log(
        `РћР±РЅРѕРІР»РµРЅС‹ РЅР°Р·РЅР°С‡РµРЅРёСЏ РґР»СЏ Р°С‚С‚РµСЃС‚Р°С†РёРё ${assessmentId}: С„РёР»РёР°Р»С‹=${finalBranchIds.length}, РґРѕР»Р¶РЅРѕСЃС‚Рё=${finalPositionIds.length}, РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№=${assignedUserIds.length}`
      );
    }

    // Р•СЃР»Рё РїРµСЂРµРґР°РЅС‹ РІРѕРїСЂРѕСЃС‹, РѕР±РЅРѕРІРёС‚СЊ РёС…
    if (questions && questions.length > 0) {
      // РЈРґР°Р»РёС‚СЊ СЃС‚Р°СЂС‹Рµ РІРѕРїСЂРѕСЃС‹ Рё РёС… РІР°СЂРёР°РЅС‚С‹ (CASCADE СѓРґР°Р»РёС‚ РІР°СЂРёР°РЅС‚С‹)
      await connection.query("DELETE FROM assessment_questions WHERE assessment_id = ?", [assessmentId]);

      // Р”РѕР±Р°РІРёС‚СЊ РЅРѕРІС‹Рµ РІРѕРїСЂРѕСЃС‹
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const questionType = question.questionType || "single";
        const correctTextAnswer = questionType === "text" ? question.correctTextAnswer || "" : null;
        if (!["single", "multiple", "text", "matching"].includes(questionType)) {
          return res.status(400).json({ error: "РќРµРґРѕРїСѓСЃС‚РёРјС‹Р№ С‚РёРї РІРѕРїСЂРѕСЃР°" });
        }
        if (questionType === "text" && !correctTextAnswer) {
          return res.status(400).json({ error: "Р”Р»СЏ С‚РµРєСЃС‚РѕРІРѕРіРѕ РІРѕРїСЂРѕСЃР° РЅРµРѕР±С…РѕРґРёРјРѕ СѓРєР°Р·Р°С‚СЊ СЌС‚Р°Р»РѕРЅРЅС‹Р№ РѕС‚РІРµС‚" });
        }
        if (questionType !== "text") {
          if (!question.options || question.options.length < 2 || question.options.length > 6) {
            return res.status(400).json({ error: "РќРµРѕР±С…РѕРґРёРјРѕ СѓРєР°Р·Р°С‚СЊ РѕС‚ 2 РґРѕ 6 РІР°СЂРёР°РЅС‚РѕРІ РѕС‚РІРµС‚РѕРІ" });
          }
          if (questionType === "matching") {
            const allPairsFilled = question.options.every((opt) => opt.text && opt.matchText && opt.matchText.trim().length > 0);
            if (!allPairsFilled) {
              return res.status(400).json({ error: "Р”Р»СЏ СЃРѕРїРѕСЃС‚Р°РІР»РµРЅРёСЏ РЅРµРѕР±С…РѕРґРёРјРѕ Р·Р°РїРѕР»РЅРёС‚СЊ РІСЃРµ РїР°СЂС‹" });
            }
          } else {
            const correctCount = question.options.filter((opt) => opt.isCorrect).length;
            if (questionType === "single" && correctCount !== 1) {
              return res.status(400).json({ error: "Р”Р»СЏ С‚РёРїР° 'РѕРґРёРЅ РІР°СЂРёР°РЅС‚' РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ СЂРѕРІРЅРѕ РѕРґРёРЅ РїСЂР°РІРёР»СЊРЅС‹Р№ РѕС‚РІРµС‚" });
            }
            if (questionType === "multiple" && correctCount < 2) {
              return res.status(400).json({ error: "Р”Р»СЏ С‚РёРїР° 'РјРЅРѕР¶РµСЃС‚РІРµРЅРЅС‹Р№ РІС‹Р±РѕСЂ' РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ РјРёРЅРёРјСѓРј 2 РїСЂР°РІРёР»СЊРЅС‹С… РѕС‚РІРµС‚Р°" });
            }
          }
        }
      const [qResult] = await connection.query(
        `
          INSERT INTO assessment_questions (assessment_id, question_bank_id, question_text, order_index, question_type, correct_text_answer)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [assessmentId, question.questionBankId || null, question.text, i, questionType, correctTextAnswer]
      );

        const questionId = qResult.insertId;

        if (questionType !== "text" && question.options) {
          for (let j = 0; j < question.options.length; j++) {
            const option = question.options[j];
            await connection.query(
              `
              INSERT INTO assessment_question_options (question_id, option_text, match_text, is_correct, order_index)
              VALUES (?, ?, ?, ?, ?)
            `,
              [
                questionId,
                option.text,
                questionType === "matching" ? option.matchText || "" : null,
                questionType === "single" || questionType === "multiple" ? (option.isCorrect ? 1 : 0) : 0,
                j,
              ]
            );
          }
        }
      }
    }

    await connection.commit();

    // Р›РѕРіРёСЂРѕРІР°РЅРёРµ РґРµР№СЃС‚РІРёСЏ
    await createAdminLog(req.user.id, "UPDATE", `РћР±РЅРѕРІР»РµРЅР° Р°С‚С‚РµСЃС‚Р°С†РёСЏ: ${title} (ID: ${assessmentId})`, "assessment", assessmentId, req);

    res.json({ message: "РђС‚С‚РµСЃС‚Р°С†РёСЏ РѕР±РЅРѕРІР»РµРЅР° СѓСЃРїРµС€РЅРѕ" });
  } catch (error) {
    await connection.rollback();
    console.error("Update assessment error:", error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * РЈРґР°Р»РёС‚СЊ Р°С‚С‚РµСЃС‚Р°С†РёСЋ (С‚РѕР»СЊРєРѕ РµСЃР»Рё СЃС‚Р°С‚СѓСЃ = pending)
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
      return res.status(404).json({ error: "РђС‚С‚РµСЃС‚Р°С†РёСЏ РЅРµ РЅР°Р№РґРµРЅР°" });
    }

    const assessment = assessments[0];

    // РџСЂРѕРІРµСЂРєР° РґРѕСЃС‚СѓРїР° РґР»СЏ СѓРїСЂР°РІР»СЏСЋС‰РµРіРѕ
    if (userRole === "manager") {
      // РЈРїСЂР°РІР»СЏСЋС‰РёР№ РјРѕР¶РµС‚ СѓРґР°Р»СЏС‚СЊ С‚РѕР»СЊРєРѕ СЃРІРѕРё Р°С‚С‚РµСЃС‚Р°С†РёРё
      if (assessment.created_by !== userId) {
        return res.status(403).json({ error: "РќРµС‚ РґРѕСЃС‚СѓРїР° Рє СѓРґР°Р»РµРЅРёСЋ СЌС‚РѕР№ Р°С‚С‚РµСЃС‚Р°С†РёРё" });
      }
    }

    if (assessment.status !== "pending") {
      return res.status(400).json({ error: 'РњРѕР¶РЅРѕ СѓРґР°Р»СЏС‚СЊ С‚РѕР»СЊРєРѕ Р°С‚С‚РµСЃС‚Р°С†РёРё СЃРѕ СЃС‚Р°С‚СѓСЃРѕРј "РћР¶РёРґР°РµС‚"' });
    }

    await pool.query("DELETE FROM assessments WHERE id = ?", [assessmentId]);

    // Р›РѕРіРёСЂРѕРІР°РЅРёРµ РґРµР№СЃС‚РІРёСЏ
    await createAdminLog(req.user.id, "DELETE", `РЈРґР°Р»РµРЅР° Р°С‚С‚РµСЃС‚Р°С†РёСЏ: ${assessment.title} (ID: ${assessmentId})`, "assessment", assessmentId, req);

    res.status(204).send();
  } catch (error) {
    console.error("Delete assessment error:", error);
    next(error);
  }
};

/**
 * РџРѕР»СѓС‡РёС‚СЊ СЂРµР·СѓР»СЊС‚Р°С‚С‹ Р°С‚С‚РµСЃС‚Р°С†РёРё
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
 * РџРѕР»СѓС‡РёС‚СЊ РґРµС‚Р°Р»РёР·Р°С†РёСЋ Р°С‚С‚РµСЃС‚Р°С†РёРё СЃ СЂРµР·СѓР»СЊС‚Р°С‚Р°РјРё Рё СЃС‚Р°С‚РёСЃС‚РёРєРѕР№
 */
exports.getAssessmentDetails = async (req, res, next) => {
  try {
    const assessmentId = Number(req.params.id);
    const userRole = req.user.role;
    const userId = req.user.id;

    // РћС‚РјРµРЅРёС‚СЊ РїСЂРѕСЃСЂРѕС‡РµРЅРЅС‹Рµ РїРѕРїС‹С‚РєРё РїРµСЂРµРґ РїРѕР»СѓС‡РµРЅРёРµРј РґР°РЅРЅС‹С…
    await assessmentModel.cancelExpiredAttempts(assessmentId);

    // РћСЃРЅРѕРІРЅР°СЏ РёРЅС„РѕСЂРјР°С†РёСЏ РѕР± Р°С‚С‚РµСЃС‚Р°С†РёРё
    const [assessments] = await pool.query(
      `
      SELECT 
        *,
        CASE
          WHEN UTC_TIMESTAMP() < open_at THEN 'pending'
          WHEN UTC_TIMESTAMP() BETWEEN open_at AND close_at THEN 'open'
          ELSE 'closed'
        END as status
      FROM assessments 
      WHERE id = ?
    `,
      [assessmentId]
    );

    if (assessments.length === 0) {
      return res.status(404).json({ error: "РђС‚С‚РµСЃС‚Р°С†РёСЏ РЅРµ РЅР°Р№РґРµРЅР°" });
    }

    const assessment = assessments[0];

    // РџСЂРѕРІРµСЂРєР° РґРѕСЃС‚СѓРїР° РґР»СЏ СѓРїСЂР°РІР»СЏСЋС‰РµРіРѕ
    if (userRole === "manager") {
      // РЈРїСЂР°РІР»СЏСЋС‰РёР№ РјРѕР¶РµС‚ РІРёРґРµС‚СЊ Р°С‚С‚РµСЃС‚Р°С†РёСЋ, РµСЃР»Рё:
      // 1. РћРЅ СЃРѕР·РґР°Р» РµС‘ СЃР°Рј
      // 2. РћРЅР° РЅР°Р·РЅР°С‡РµРЅР° РЅР° РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ РёР· РµРіРѕ С„РёР»РёР°Р»Р°
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
        return res.status(403).json({ error: "РќРµС‚ РґРѕСЃС‚СѓРїР° Рє СЌС‚РѕР№ Р°С‚С‚РµСЃС‚Р°С†РёРё" });
      }
    }

    // Р’РѕРїСЂРѕСЃС‹ СЃ РІР°СЂРёР°РЅС‚Р°РјРё РѕС‚РІРµС‚РѕРІ
    const [questions] = await pool.query(
      `
      SELECT 
        q.id,
        q.question_text,
        q.question_bank_id,
        q.order_index,
        q.question_type,
        q.correct_text_answer
      FROM assessment_questions q
      WHERE q.assessment_id = ?
      ORDER BY q.order_index
    `,
      [assessmentId]
    );

    // Р”Р»СЏ РєР°Р¶РґРѕРіРѕ РІРѕРїСЂРѕСЃР° РїРѕР»СѓС‡РёС‚СЊ РІР°СЂРёР°РЅС‚С‹ Рё СЃС‚Р°С‚РёСЃС‚РёРєСѓ РѕС‚РІРµС‚РѕРІ
    for (const question of questions) {
      const [options] = await pool.query(
        `
        SELECT id, option_text, match_text, is_correct, order_index
        FROM assessment_question_options
        WHERE question_id = ?
        ORDER BY order_index
      `,
        [question.id]
      );
      question.options = options;

      // РЎС‚Р°С‚РёСЃС‚РёРєР° РїРѕ РІРѕРїСЂРѕСЃСѓ (СЃРєРѕР»СЊРєРѕ СЂР°Р· РІС‹Р±РёСЂР°Р»Рё РєР°Р¶РґС‹Р№ РІР°СЂРёР°РЅС‚)
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

    // РЈС‡Р°СЃС‚РЅРёРєРё СЃ СЂРµР·СѓР»СЊС‚Р°С‚Р°РјРё (РїРѕРєР°Р·С‹РІР°РµРј С‚РµРєСѓС‰СѓСЋ in_progress РёР»Рё Р»СѓС‡С€СѓСЋ Р·Р°РІРµСЂС€РµРЅРЅСѓСЋ РїРѕРїС‹С‚РєСѓ)
    const [participants] = await pool.query(
      `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.telegram_id,
        b.name as branch_name,
        p.name as position_name,
        in_progress.id as in_progress_attempt_id,
        best_completed.id as best_completed_attempt_id,
        COALESCE(in_progress.id, best_completed.id) as attempt_id,
        COALESCE(in_progress.status, best_completed.status) as attempt_status,
        COALESCE(in_progress.score_percent, best_completed.score_percent) as score_percent,
        COALESCE(in_progress.correct_answers, best_completed.correct_answers) as correct_answers,
        COALESCE(in_progress.total_questions, best_completed.total_questions) as total_questions,
        COALESCE(in_progress.started_at, best_completed.started_at) as started_at,
        COALESCE(in_progress.completed_at, best_completed.completed_at) as completed_at,
        TIMESTAMPDIFF(SECOND, COALESCE(in_progress.started_at, best_completed.started_at), 
                              COALESCE(in_progress.completed_at, best_completed.completed_at)) as time_spent_seconds,
        tc.time_spent_seconds as theory_time_seconds,
        tc.completed_at as theory_completed_at
      FROM assessment_user_assignments aua
      JOIN users u ON aua.user_id = u.id
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN positions p ON u.position_id = p.id
      LEFT JOIN (
        SELECT aa.*
        FROM (
          SELECT aa2.*, 
                 ROW_NUMBER() OVER (PARTITION BY aa2.user_id ORDER BY aa2.started_at DESC) as rn
          FROM assessment_attempts aa2
          WHERE aa2.assessment_id = ? AND aa2.status = 'in_progress'
        ) aa
        WHERE aa.rn = 1
      ) in_progress ON in_progress.user_id = u.id
      LEFT JOIN (
        SELECT aa.*
        FROM (
          SELECT aa1.*, 
                 ROW_NUMBER() OVER (PARTITION BY aa1.user_id ORDER BY aa1.score_percent DESC, aa1.completed_at DESC) as rn
          FROM assessment_attempts aa1
          WHERE aa1.assessment_id = ? AND aa1.status = 'completed'
        ) aa
        WHERE aa.rn = 1
      ) best_completed ON best_completed.user_id = u.id AND in_progress.id IS NULL
      LEFT JOIN assessment_theory_completions tc ON tc.assessment_id = aua.assessment_id 
        AND tc.user_id = u.id
        AND tc.version_id = (SELECT current_theory_version_id FROM assessments WHERE id = aua.assessment_id)
      WHERE aua.assessment_id = ?
      ORDER BY u.last_name, u.first_name
    `,
      [assessmentId, assessmentId, assessmentId]
    );

    const questionMap = new Map();
    questions.forEach((question) => {
      questionMap.set(question.id, question);
      question.userAnswers = [];
    });

    const attemptUserMap = new Map();
    participants.forEach((participant) => {
      const attemptId = participant.best_completed_attempt_id || null;
      if (attemptId) {
        attemptUserMap.set(attemptId, {
          id: participant.id,
          first_name: participant.first_name,
          last_name: participant.last_name,
        });
      }
    });

    const attemptIds = Array.from(attemptUserMap.keys());
    if (attemptIds.length > 0) {
      const [answerRows] = await pool.query(
        `
        SELECT attempt_id, question_id, option_id, selected_option_ids, text_answer, is_correct
        FROM assessment_answers
        WHERE attempt_id IN (?)
      `,
        [attemptIds]
      );

      const parseSelectedOptions = (questionType, selectedOptionIds) => {
        if (!selectedOptionIds) {
          return { selectedOptionIds: [], selectedMatchPairs: null };
        }
        try {
          const parsed = JSON.parse(selectedOptionIds);
          if (questionType === "matching") {
            const matchPairs = {};
            if (Array.isArray(parsed) && parsed.length && typeof parsed[0] === "object") {
              parsed.forEach((pair) => {
                const leftId = Number(pair?.leftOptionId);
                const rightId = Number(pair?.rightOptionId);
                if (leftId && rightId) {
                  matchPairs[leftId] = rightId;
                }
              });
            } else if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              Object.entries(parsed).forEach(([left, right]) => {
                const leftId = Number(left);
                const rightId = Number(right);
                if (leftId && rightId) {
                  matchPairs[leftId] = rightId;
                }
              });
            } else if (Array.isArray(parsed)) {
              return {
                selectedOptionIds: parsed.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0),
                selectedMatchPairs: null,
              };
            }
            return {
              selectedOptionIds: [],
              selectedMatchPairs: Object.keys(matchPairs).length ? matchPairs : null,
            };
          }
          if (Array.isArray(parsed)) {
            return {
              selectedOptionIds: parsed.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0),
              selectedMatchPairs: null,
            };
          }
        } catch (error) {
          console.warn("Failed to parse selected_option_ids", error);
        }
        return { selectedOptionIds: [], selectedMatchPairs: null };
      };

      answerRows.forEach((answer) => {
        const user = attemptUserMap.get(answer.attempt_id);
        const question = questionMap.get(answer.question_id);
        if (!user || !question) {
          return;
        }

        const { selectedOptionIds, selectedMatchPairs } = parseSelectedOptions(question.question_type, answer.selected_option_ids);
        question.userAnswers.push({
          user,
          selectedOptionId: answer.option_id,
          selectedOptionIds,
          selectedMatchPairs,
          selectedTextAnswer: answer.text_answer || "",
          isCorrect: answer.is_correct === 1,
        });
      });
    }

    // РЎС‚Р°С‚РёСЃС‚РёРєР° (РЅР° РѕСЃРЅРѕРІРµ Р»СѓС‡С€РµР№ Р·Р°РІРµСЂС€РµРЅРЅРѕР№ РїРѕРїС‹С‚РєРё РєР°Р¶РґРѕРіРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ)
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
        COUNT(DISTINCT CASE WHEN latest.score_percent >= ? THEN latest.user_id END) as passed_count,
        COALESCE(AVG(tc.time_spent_seconds), 0) as avg_theory_time_seconds,
        COALESCE(COUNT(DISTINCT tc.user_id), 0) as theory_completed_count
      FROM assessment_user_assignments aua
      LEFT JOIN (
        SELECT aa1.*
        FROM assessment_attempts aa1
        INNER JOIN (
          SELECT user_id, MAX(score_percent) as max_score, MAX(completed_at) as max_completed
          FROM assessment_attempts
          WHERE assessment_id = ? AND status = 'completed'
          GROUP BY user_id
        ) aa2 ON aa1.user_id = aa2.user_id 
                AND aa1.score_percent = aa2.max_score 
                AND aa1.completed_at = aa2.max_completed
        WHERE aa1.assessment_id = ? AND aa1.status = 'completed'
      ) latest ON latest.user_id = aua.user_id
      LEFT JOIN assessment_theory_completions tc ON tc.assessment_id = aua.assessment_id
        AND tc.user_id = aua.user_id
        AND tc.version_id = (SELECT current_theory_version_id FROM assessments WHERE id = aua.assessment_id)
      WHERE aua.assessment_id = ?
    `,
      [assessment.pass_score_percent, assessmentId, assessmentId, assessmentId]
    );

    // РРЅС„РѕСЂРјР°С†РёСЏ Рѕ РґРѕСЃС‚СѓРїРЅРѕСЃС‚Рё
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

    // РџРѕР»СѓС‡РёС‚СЊ С‚РѕР»СЊРєРѕ РЅР°РїСЂСЏРјСѓСЋ РЅР°Р·РЅР°С‡РµРЅРЅС‹С… РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ (РЅРµ С‡РµСЂРµР· С„РёР»РёР°Р»С‹/РґРѕР»Р¶РЅРѕСЃС‚Рё)
    const [directlyAssignedUsers] = await pool.query(
      `
      SELECT DISTINCT u.id, u.first_name, u.last_name
      FROM assessment_user_assignments aua
      JOIN users u ON aua.user_id = u.id
      WHERE aua.assessment_id = ?
        -- РСЃРєР»СЋС‡Р°РµРј РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№, РЅР°Р·РЅР°С‡РµРЅРЅС‹С… С‡РµСЂРµР· С„РёР»РёР°Р»С‹
        AND NOT EXISTS (
          SELECT 1 FROM assessment_branch_assignments aba
          WHERE aba.assessment_id = aua.assessment_id
            AND aba.branch_id = u.branch_id
        )
        -- РСЃРєР»СЋС‡Р°РµРј РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№, РЅР°Р·РЅР°С‡РµРЅРЅС‹С… С‡РµСЂРµР· РґРѕР»Р¶РЅРѕСЃС‚Рё
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

exports.getUserAssessmentProgress = async (req, res, next) => {
  try {
    const assessmentId = Number(req.params.id);
    const userId = Number(req.params.userId);
    const attemptId = req.query.attemptId ? Number(req.query.attemptId) : null;

    if (!assessmentId || !userId) {
      return res.status(400).json({ error: "РќРµРєРѕСЂСЂРµРєС‚РЅС‹Рµ РїР°СЂР°РјРµС‚СЂС‹" });
    }

    const [assessments] = await pool.query(
      `
      SELECT 
        id,
        title,
        pass_score_percent,
        CASE
          WHEN UTC_TIMESTAMP() < open_at THEN 'pending'
          WHEN UTC_TIMESTAMP() BETWEEN open_at AND close_at THEN 'open'
          ELSE 'closed'
        END as status
      FROM assessments 
      WHERE id = ?
    `,
      [assessmentId]
    );

    if (assessments.length === 0) {
      return res.status(404).json({ error: "РђС‚С‚РµСЃС‚Р°С†РёСЏ РЅРµ РЅР°Р№РґРµРЅР°" });
    }

    const assessment = assessments[0];
    const userRole = req.user.role;

    if (userRole === "manager") {
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
        [assessmentId, req.user.id, req.user.id]
      );

      if (access.length === 0) {
        return res.status(403).json({ error: "РќРµС‚ РґРѕСЃС‚СѓРїР° Рє СЌС‚РѕР№ Р°С‚С‚РµСЃС‚Р°С†РёРё" });
      }
    }

    const [users] = await pool.query(
      `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.telegram_id,
        b.name as branch_name,
        p.name as position_name
      FROM users u
      JOIN (
        SELECT aua.user_id AS user_id
        FROM assessment_user_assignments aua
        WHERE aua.assessment_id = ?
        UNION
        SELECT u.id AS user_id
        FROM assessment_branch_assignments aba
        JOIN users u ON u.branch_id = aba.branch_id
        WHERE aba.assessment_id = ?
          AND NOT EXISTS (
            SELECT 1 FROM assessment_position_assignments apa WHERE apa.assessment_id = aba.assessment_id
          )
        UNION
        SELECT u.id AS user_id
        FROM assessment_position_assignments apa
        JOIN users u ON u.position_id = apa.position_id
        WHERE apa.assessment_id = ?
          AND NOT EXISTS (
            SELECT 1 FROM assessment_branch_assignments aba WHERE aba.assessment_id = apa.assessment_id
          )
        UNION
        SELECT u.id AS user_id
        FROM assessment_branch_assignments aba
        JOIN assessment_position_assignments apa ON apa.assessment_id = aba.assessment_id
        JOIN users u ON u.branch_id = aba.branch_id AND u.position_id = apa.position_id
        WHERE aba.assessment_id = ?
      ) assigned ON assigned.user_id = u.id
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN positions p ON u.position_id = p.id
      WHERE u.id = ?
      LIMIT 1
    `,
      [assessmentId, assessmentId, assessmentId, assessmentId, userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р·РЅР°С‡РµРЅ РЅР° Р°С‚С‚РµСЃС‚Р°С†РёСЋ" });
    }

    const user = users[0];

    const [attempts] = await pool.query(
      `
      SELECT 
        id,
        attempt_number,
        status,
        score_percent,
        correct_answers,
        total_questions,
        time_spent_seconds,
        started_at,
        completed_at
      FROM assessment_attempts
      WHERE assessment_id = ? AND user_id = ?
      ORDER BY attempt_number DESC, started_at DESC
    `,
      [assessmentId, userId]
    );

    const attemptIds = new Set(attempts.map((item) => item.id));
    const completedAttempts = attempts.filter((item) => item.status === "completed");
    const bestAttempt = completedAttempts.reduce((best, current) => {
      if (!best) {
        return current;
      }
      const bestScore = Number(best.score_percent ?? -1);
      const currentScore = Number(current.score_percent ?? -1);
      if (currentScore > bestScore) {
        return current;
      }
      if (currentScore === bestScore) {
        const bestCompleted = best.completed_at ? new Date(best.completed_at).getTime() : 0;
        const currentCompleted = current.completed_at ? new Date(current.completed_at).getTime() : 0;
        return currentCompleted > bestCompleted ? current : best;
      }
      return best;
    }, null);
    const selectedAttemptId = attemptIds.has(attemptId) ? attemptId : (bestAttempt?.id || (attempts.length ? attempts[0].id : null));

    let questions = [];
    let selectedAttempt = null;
    if (selectedAttemptId) {
      selectedAttempt = attempts.find((item) => item.id === selectedAttemptId) || null;

      const [questionRows] = await pool.query(
        `
        SELECT 
          q.id,
          q.question_text,
          q.order_index,
          q.question_type,
          q.correct_text_answer,
          o.id AS option_id,
          o.option_text,
          o.match_text,
          o.is_correct,
          o.order_index AS option_order
        FROM assessment_questions q
        LEFT JOIN assessment_question_options o ON o.question_id = q.id
        WHERE q.assessment_id = ?
        ORDER BY q.order_index, o.order_index
      `,
        [assessmentId]
      );

      const [answerRows] = await pool.query(
        `
        SELECT question_id, option_id, selected_option_ids, text_answer, is_correct
        FROM assessment_answers
        WHERE attempt_id = ?
      `,
        [selectedAttemptId]
      );

      const answersMap = new Map();
      answerRows.forEach((row) => {
        answersMap.set(row.question_id, row);
      });

      const questionMap = new Map();
      questionRows.forEach((row) => {
        if (!questionMap.has(row.id)) {
          questionMap.set(row.id, {
            id: row.id,
            question_text: row.question_text,
            question_type: row.question_type,
            correct_text_answer: row.correct_text_answer,
            options: [],
            correctOptionIds: [],
            selectedOptionId: null,
            selectedOptionIds: [],
            selectedTextAnswer: "",
            selectedMatchPairs: null,
            isCorrect: null,
          });
        }
        if (row.option_id) {
          const option = {
            id: row.option_id,
            option_text: row.option_text,
            match_text: row.match_text,
            is_correct: row.is_correct === 1,
            order_index: row.option_order,
          };
          const question = questionMap.get(row.id);
          question.options.push(option);
          if (option.is_correct) {
            question.correctOptionIds.push(option.id);
          }
        }
      });

      questionMap.forEach((question) => {
        const answer = answersMap.get(question.id);
        if (!answer) {
          return;
        }

        if (answer.option_id) {
          question.selectedOptionId = answer.option_id;
        }

        if (answer.text_answer) {
          question.selectedTextAnswer = answer.text_answer;
        }

        if (answer.selected_option_ids) {
          try {
            const parsed = JSON.parse(answer.selected_option_ids);
            if (question.question_type === "matching") {
              const matchPairs = {};
              if (Array.isArray(parsed) && parsed.length && typeof parsed[0] === "object") {
                parsed.forEach((pair) => {
                  const leftId = Number(pair?.leftOptionId);
                  const rightId = Number(pair?.rightOptionId);
                  if (leftId && rightId) {
                    matchPairs[leftId] = rightId;
                  }
                });
              } else if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                Object.entries(parsed).forEach(([left, right]) => {
                  const leftId = Number(left);
                  const rightId = Number(right);
                  if (leftId && rightId) {
                    matchPairs[leftId] = rightId;
                  }
                });
              } else if (Array.isArray(parsed)) {
                question.selectedOptionIds = parsed.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
              }
              if (Object.keys(matchPairs).length) {
                question.selectedMatchPairs = matchPairs;
              }
            } else if (Array.isArray(parsed)) {
              question.selectedOptionIds = parsed.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
            }
          } catch (error) {
            console.warn("Failed to parse selected_option_ids", error);
          }
        }

        question.isCorrect = answer.is_correct === 1;
      });

      questions = Array.from(questionMap.values()).sort((a, b) => a.id - b.id);
    }

    const [theoryRows] = await pool.query(
      `
      SELECT tc.time_spent_seconds, tc.completed_at
      FROM assessment_theory_completions tc
      JOIN assessments a ON a.id = tc.assessment_id
      WHERE tc.assessment_id = ? AND tc.user_id = ? AND tc.version_id = a.current_theory_version_id
      LIMIT 1
    `,
      [assessmentId, userId]
    );

    const theory = theoryRows.length
      ? {
          time_spent_seconds: theoryRows[0].time_spent_seconds,
          completed_at: theoryRows[0].completed_at,
        }
      : null;

    res.json({
      assessment: {
        id: assessment.id,
        title: assessment.title,
        pass_score_percent: assessment.pass_score_percent,
        status: assessment.status,
      },
      user,
      attempts,
      selectedAttempt,
      questions,
      theory,
    });
  } catch (error) {
    console.error("Get user assessment progress error:", error);
    next(error);
  }
};

/**
 * Р­РєСЃРїРѕСЂС‚ Р°С‚С‚РµСЃС‚Р°С†РёРё РІ Excel
 */
exports.exportAssessmentToExcel = async (req, res, next) => {
  try {
    const assessmentId = Number(req.params.id);
    const ExcelJS = require("exceljs");

    // РџРѕР»СѓС‡РёС‚СЊ РґР°РЅРЅС‹Рµ Р°С‚С‚РµСЃС‚Р°С†РёРё
    const [assessments] = await pool.query("SELECT * FROM assessments WHERE id = ?", [assessmentId]);

    if (assessments.length === 0) {
      return res.status(404).json({ error: "РђС‚С‚РµСЃС‚Р°С†РёСЏ РЅРµ РЅР°Р№РґРµРЅР°" });
    }

    const assessment = assessments[0];

    // РџРѕР»СѓС‡РёС‚СЊ СЂРµР·СѓР»СЊС‚Р°С‚С‹ СѓС‡Р°СЃС‚РЅРёРєРѕРІ (РїСЂРёРѕСЂРёС‚РµС‚ РѕС‚РґР°РµС‚СЃСЏ С‚РµРєСѓС‰РµР№ РїРѕРїС‹С‚РєРµ in_progress)
    const [results] = await pool.query(
      `
      SELECT 
        u.first_name,
        u.last_name,
        b.name as branch_name,
        p.name as position_name,
        COALESCE(in_progress.status, best_completed.status) as status,
        COALESCE(in_progress.score_percent, best_completed.score_percent) as score_percent,
        COALESCE(in_progress.correct_answers, best_completed.correct_answers) as correct_answers,
        COALESCE(in_progress.total_questions, best_completed.total_questions) as total_questions,
        COALESCE(in_progress.started_at, best_completed.started_at) as started_at,
        COALESCE(in_progress.completed_at, best_completed.completed_at) as completed_at,
        TIMESTAMPDIFF(SECOND, COALESCE(in_progress.started_at, best_completed.started_at), 
                              COALESCE(in_progress.completed_at, best_completed.completed_at)) as time_spent_seconds
      FROM assessment_user_assignments aua
      JOIN users u ON aua.user_id = u.id
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN positions p ON u.position_id = p.id
      LEFT JOIN (
        SELECT aa.*
        FROM (
          SELECT aa1.*, 
                 ROW_NUMBER() OVER (PARTITION BY aa1.user_id ORDER BY aa1.started_at DESC) as rn
          FROM assessment_attempts aa1
          WHERE aa1.assessment_id = ? AND aa1.status = 'in_progress'
        ) aa
        WHERE aa.rn = 1
      ) in_progress ON in_progress.user_id = u.id
      LEFT JOIN (
        SELECT aa.*
        FROM (
          SELECT aa2.*, 
                 ROW_NUMBER() OVER (PARTITION BY aa2.user_id ORDER BY aa2.score_percent DESC, aa2.completed_at DESC) as rn
          FROM assessment_attempts aa2
          WHERE aa2.assessment_id = ? AND aa2.status = 'completed'
        ) aa
        WHERE aa.rn = 1
      ) best_completed ON best_completed.user_id = u.id AND in_progress.id IS NULL
      WHERE aua.assessment_id = ?
      ORDER BY u.last_name, u.first_name
    `,
      [assessmentId, assessmentId, assessmentId]
    );

    // РЎРѕР·РґР°С‚СЊ Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Р РµР·СѓР»СЊС‚Р°С‚С‹ Р°С‚С‚РµСЃС‚Р°С†РёРё");

    // Р—Р°РіРѕР»РѕРІРѕРє
    worksheet.addRow([`РђС‚С‚РµСЃС‚Р°С†РёСЏ: ${assessment.title}`]);
    worksheet.addRow([`Р”Р°С‚Р° СЌРєСЃРїРѕСЂС‚Р°: ${new Date().toLocaleString("ru-RU")}`]);
    worksheet.addRow([]);

    // Р—Р°РіРѕР»РѕРІРєРё С‚Р°Р±Р»РёС†С‹
    const headerRow = worksheet.addRow([
      "Р¤Р°РјРёР»РёСЏ",
      "РРјСЏ",
      "Р¤РёР»РёР°Р»",
      "Р”РѕР»Р¶РЅРѕСЃС‚СЊ",
      "РЎС‚Р°С‚СѓСЃ",
      "Р‘Р°Р»Р» (%)",
      "РџСЂР°РІРёР»СЊРЅС‹С… РѕС‚РІРµС‚РѕРІ",
      "Р’СЃРµРіРѕ РІРѕРїСЂРѕСЃРѕРІ",
      "Р’СЂРµРјСЏ (СЃРµРє)",
      "Р”Р°С‚Р° РЅР°С‡Р°Р»Р°",
      "Р”Р°С‚Р° Р·Р°РІРµСЂС€РµРЅРёСЏ",
    ]);

    // РЎС‚РёР»РёР·Р°С†РёСЏ Р·Р°РіРѕР»РѕРІРєР°
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Р”Р°РЅРЅС‹Рµ
    results.forEach((result) => {
      worksheet.addRow([
        result.last_name,
        result.first_name,
        result.branch_name || "вЂ”",
        result.position_name || "вЂ”",
        result.status || "РќРµ РЅР°С‡Р°С‚",
        result.score_percent || "вЂ”",
        result.correct_answers || "вЂ”",
        result.total_questions || "вЂ”",
        result.time_spent_seconds || "вЂ”",
        result.started_at ? new Date(result.started_at).toLocaleString("ru-RU") : "вЂ”",
        result.completed_at ? new Date(result.completed_at).toLocaleString("ru-RU") : "вЂ”",
      ]);
    });

    // РђРІС‚РѕС€РёСЂРёРЅР° СЃС‚РѕР»Р±С†РѕРІ
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });

    // РћС‚РїСЂР°РІРёС‚СЊ С„Р°Р№Р»
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="assessment_${assessmentId}_${Date.now()}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export assessment error:", error);
    next(error);
  }
};



