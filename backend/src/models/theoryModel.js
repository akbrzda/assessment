const { pool } = require("../config/database");

function toIsoUtc(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const str = String(value).trim();
  if (!str) {
    return null;
  }

  const normalized = str.replace(" ", "T");
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized);
  const source = hasZone ? normalized : `${normalized}Z`;
  const date = new Date(source);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function parseJson(value) {
  if (value == null) {
    return null;
  }
  if (typeof value === "object") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function serializeJson(value) {
  if (value == null) {
    return null;
  }
  try {
    return JSON.stringify(value);
  } catch (error) {
    return null;
  }
}

function mapBlockRow(row) {
  return {
    id: row.id,
    title: row.title,
    order: Number(row.order_index),
    type: row.block_type,
    content: row.content || "",
    videoUrl: row.video_url || null,
    externalUrl: row.external_url || null,
    metadata: parseJson(row.metadata),
    isRequired: row.is_required ? true : false,
  };
}

function mapVersionRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    assessmentId: row.assessment_id,
    versionNumber: Number(row.version_number),
    status: row.status,
    completionRequired: row.completion_required ? true : false,
    requiredBlockCount: Number(row.required_block_count || 0),
    optionalBlockCount: Number(row.optional_block_count || 0),
    metadata: parseJson(row.metadata),
    publishedAt: toIsoUtc(row.published_at),
    createdAt: toIsoUtc(row.created_at),
    updatedAt: toIsoUtc(row.updated_at),
  };
}

async function getBlocksForVersion(versionId) {
  const [blockRows] = await pool.execute(
    `SELECT
       id,
       title,
       order_index,
       block_type,
       content,
       video_url,
       external_url,
       metadata,
       is_required
     FROM assessment_theory_blocks
     WHERE version_id = ?
     ORDER BY order_index ASC`,
    [versionId]
  );
  return blockRows.map(mapBlockRow);
}

function splitBlocks(blocks) {
  return {
    requiredBlocks: blocks.filter((block) => block.isRequired),
    optionalBlocks: blocks.filter((block) => !block.isRequired),
  };
}

async function getCurrentTheoryMeta(assessmentId) {
  const [rows] = await pool.execute(
    `SELECT
       a.current_theory_version_id AS version_id,
       v.version_number,
       v.completion_required,
       v.published_at
     FROM assessments a
     LEFT JOIN assessment_theory_versions v ON v.id = a.current_theory_version_id
     WHERE a.id = ?
     LIMIT 1`,
    [assessmentId]
  );

  if (!rows.length || !rows[0].version_id) {
    return null;
  }

  const row = rows[0];
  return {
    versionId: Number(row.version_id),
    versionNumber: Number(row.version_number),
    completionRequired: row.completion_required ? true : false,
    publishedAt: toIsoUtc(row.published_at),
  };
}

async function getTheoryForUser({ assessmentId, userId }) {
  const [accessRows] = await pool.execute(
    `SELECT 1
       FROM assessments a
      WHERE a.id = ?
        AND EXISTS (
          SELECT 1
          FROM assessment_user_assignments aua
          WHERE aua.assessment_id = a.id
            AND aua.user_id = ?
            AND aua.is_direct = 1
          UNION
          SELECT 1
          FROM assessment_branch_assignments aba
          JOIN users u ON u.branch_id = aba.branch_id
          WHERE aba.assessment_id = a.id
            AND u.id = ?
            AND NOT EXISTS (
              SELECT 1 FROM assessment_position_assignments apa WHERE apa.assessment_id = aba.assessment_id
            )
          UNION
          SELECT 1
          FROM assessment_position_assignments apa
          JOIN users u ON u.position_id = apa.position_id
          WHERE apa.assessment_id = a.id
            AND u.id = ?
            AND NOT EXISTS (
              SELECT 1 FROM assessment_branch_assignments aba WHERE aba.assessment_id = apa.assessment_id
            )
          UNION
          SELECT 1
          FROM assessment_branch_assignments aba
          JOIN assessment_position_assignments apa ON apa.assessment_id = aba.assessment_id
          JOIN users u ON u.branch_id = aba.branch_id AND u.position_id = apa.position_id
          WHERE aba.assessment_id = a.id AND u.id = ?
        )
      LIMIT 1`,
    [assessmentId, userId, userId, userId, userId]
  );

  if (!accessRows.length) {
    return null;
  }

  const [rows] = await pool.execute(
    `SELECT
       a.id AS assessment_id,
       a.current_theory_version_id AS version_id,
       v.version_number,
       v.completion_required,
       v.required_block_count,
       v.optional_block_count,
       v.published_at
     FROM assessments a
     LEFT JOIN assessment_theory_versions v ON v.id = a.current_theory_version_id AND v.status = 'published'
     WHERE a.id = ?
     LIMIT 1`,
    [assessmentId]
  );

  if (!rows.length || !rows[0].version_id) {
    return null;
  }

  const versionId = Number(rows[0].version_id);
  const blocks = await getBlocksForVersion(versionId);
  const { requiredBlocks, optionalBlocks } = splitBlocks(blocks);

  const completion = await getCompletionForVersion({
    assessmentId,
    userId,
    versionId,
  });

  return {
    assessmentId,
    version: {
      id: versionId,
      number: Number(rows[0].version_number),
      completionRequired: rows[0].completion_required ? true : false,
      requiredBlockCount: Number(rows[0].required_block_count || requiredBlocks.length),
      optionalBlockCount: Number(rows[0].optional_block_count || optionalBlocks.length),
      publishedAt: toIsoUtc(rows[0].published_at),
    },
    requiredBlocks,
    optionalBlocks,
    completion,
  };
}

async function getCompletionForVersion({ assessmentId, userId, versionId }) {
  const [rows] = await pool.execute(
    `SELECT id, completed_at
       FROM assessment_theory_completions
      WHERE assessment_id = ? AND user_id = ? AND version_id = ?
      LIMIT 1`,
    [assessmentId, userId, versionId]
  );

  if (!rows.length) {
    return null;
  }

  return {
    id: rows[0].id,
    completedAt: toIsoUtc(rows[0].completed_at),
    versionId,
  };
}

async function userHasCompletion({ assessmentId, userId, versionId }) {
  const completion = await getCompletionForVersion({ assessmentId, userId, versionId });
  return Boolean(completion);
}

async function saveCompletion({ assessmentId, versionId, userId, timeSpentSeconds, clientPayload }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [assessmentRows] = await connection.execute(
      `SELECT a.id, a.current_theory_version_id
         FROM assessments a
        WHERE a.id = ?
          AND EXISTS (
            SELECT 1
            FROM assessment_user_assignments aua
            WHERE aua.assessment_id = a.id
              AND aua.user_id = ?
              AND aua.is_direct = 1
            UNION
            SELECT 1
            FROM assessment_branch_assignments aba
            JOIN users u ON u.branch_id = aba.branch_id
            WHERE aba.assessment_id = a.id
              AND u.id = ?
              AND NOT EXISTS (
                SELECT 1 FROM assessment_position_assignments apa WHERE apa.assessment_id = aba.assessment_id
              )
            UNION
            SELECT 1
            FROM assessment_position_assignments apa
            JOIN users u ON u.position_id = apa.position_id
            WHERE apa.assessment_id = a.id
              AND u.id = ?
              AND NOT EXISTS (
                SELECT 1 FROM assessment_branch_assignments aba WHERE aba.assessment_id = apa.assessment_id
              )
            UNION
            SELECT 1
            FROM assessment_branch_assignments aba
            JOIN assessment_position_assignments apa ON apa.assessment_id = aba.assessment_id
            JOIN users u ON u.branch_id = aba.branch_id AND u.position_id = apa.position_id
            WHERE aba.assessment_id = a.id AND u.id = ?
          )
        FOR UPDATE`,
      [assessmentId, userId, userId, userId, userId]
    );

    if (!assessmentRows.length) {
      const error = new Error("Нет доступа к аттестации");
      error.status = 403;
      throw error;
    }

    const currentVersionId = assessmentRows[0].current_theory_version_id ? Number(assessmentRows[0].current_theory_version_id) : null;
    if (!currentVersionId) {
      const error = new Error("Для аттестации не назначена теория");
      error.status = 409;
      error.code = "THEORY_NOT_REQUIRED";
      throw error;
    }

    if (currentVersionId !== Number(versionId)) {
      const error = new Error("Версия теории устарела. Обновите страницу и изучите материалы заново.");
      error.status = 409;
      error.code = "THEORY_VERSION_MISMATCH";
      throw error;
    }

    const [versionRows] = await connection.execute(
      `SELECT id, version_number, completion_required
         FROM assessment_theory_versions
        WHERE id = ? AND status = 'published'
        LIMIT 1`,
      [currentVersionId]
    );

    if (!versionRows.length) {
      const error = new Error("Версия теории не найдена");
      error.status = 404;
      throw error;
    }

    const payloadValue = clientPayload != null ? JSON.stringify(clientPayload) : null;
    const timeSpent = Number.isFinite(timeSpentSeconds) && timeSpentSeconds >= 0 ? Number(timeSpentSeconds) : 0;

    await connection.execute(
      `INSERT INTO assessment_theory_completions (assessment_id, user_id, version_id, completed_at, time_spent_seconds, client_payload)
       VALUES (?, ?, ?, UTC_TIMESTAMP(), ?, ?)
       ON DUPLICATE KEY UPDATE completed_at = VALUES(completed_at), time_spent_seconds = VALUES(time_spent_seconds), client_payload = VALUES(client_payload)`,
      [assessmentId, userId, currentVersionId, timeSpent, payloadValue]
    );

    const [completionRows] = await connection.execute(
      `SELECT id, completed_at, time_spent_seconds
         FROM assessment_theory_completions
        WHERE assessment_id = ? AND user_id = ? AND version_id = ?
        LIMIT 1`,
      [assessmentId, userId, currentVersionId]
    );

    await connection.commit();

    return {
      id: completionRows[0].id,
      completedAt: toIsoUtc(completionRows[0].completed_at),
      timeSpentSeconds: Number(completionRows[0].time_spent_seconds || 0),
      versionId: currentVersionId,
      versionNumber: Number(versionRows[0].version_number),
      completionRequired: versionRows[0].completion_required ? true : false,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getTheoryForAdmin(assessmentId) {
  const [assessmentRows] = await pool.execute(
    `SELECT id, current_theory_version_id
       FROM assessments
      WHERE id = ?
      LIMIT 1`,
    [assessmentId]
  );

  if (!assessmentRows.length) {
    return null;
  }

  const currentVersionId = assessmentRows[0].current_theory_version_id ? Number(assessmentRows[0].current_theory_version_id) : null;
  let currentVersion = null;
  if (currentVersionId) {
    currentVersion = await getVersionDetail(currentVersionId);
  }

  const [draftRows] = await pool.execute(
    `SELECT id
       FROM assessment_theory_versions
      WHERE assessment_id = ? AND status = 'draft'
      ORDER BY updated_at DESC
      LIMIT 1`,
    [assessmentId]
  );

  let draftVersion = null;
  if (draftRows.length) {
    draftVersion = await getVersionDetail(draftRows[0].id);
  }

  return {
    assessmentId,
    currentVersion,
    draftVersion,
  };
}

async function getVersionDetail(versionId) {
  if (!versionId) {
    return null;
  }
  const [rows] = await pool.execute(
    `SELECT
       id,
       assessment_id,
       version_number,
       status,
       completion_required,
       required_block_count,
       optional_block_count,
       metadata,
       published_at,
       created_at,
       updated_at
     FROM assessment_theory_versions
     WHERE id = ?
     LIMIT 1`,
    [versionId]
  );

  if (!rows.length) {
    return null;
  }

  const version = mapVersionRow(rows[0]);
  const blocks = await getBlocksForVersion(versionId);
  const { requiredBlocks, optionalBlocks } = splitBlocks(blocks);

  return {
    ...version,
    requiredBlocks,
    optionalBlocks,
  };
}

async function saveDraftVersion({ assessmentId, requiredBlocks, optionalBlocks, metadata }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [assessmentRows] = await connection.execute("SELECT id FROM assessments WHERE id = ? FOR UPDATE", [assessmentId]);
    if (!assessmentRows.length) {
      const error = new Error("Аттестация не найдена");
      error.status = 404;
      throw error;
    }

    const combinedBlocks = [
      ...requiredBlocks.map((block, idx) => ({ ...block, orderIndex: idx + 1, isRequired: 1 })),
      ...optionalBlocks.map((block, idx) => ({ ...block, orderIndex: requiredBlocks.length + idx + 1, isRequired: 0 })),
    ];

    const [draftRows] = await connection.execute(
      "SELECT id FROM assessment_theory_versions WHERE assessment_id = ? AND status = 'draft' LIMIT 1 FOR UPDATE",
      [assessmentId]
    );

    let draftId = null;
    if (draftRows.length) {
      draftId = draftRows[0].id;
      await connection.execute(
        `UPDATE assessment_theory_versions
            SET completion_required = ?, required_block_count = ?, optional_block_count = ?, metadata = ?, updated_at = UTC_TIMESTAMP()
          WHERE id = ?`,
        [requiredBlocks.length > 0 ? 1 : 0, requiredBlocks.length, optionalBlocks.length, serializeJson(metadata), draftId]
      );
      await connection.execute("DELETE FROM assessment_theory_blocks WHERE version_id = ?", [draftId]);
    } else {
      const [maxRows] = await connection.execute(
        "SELECT COALESCE(MAX(version_number), 0) AS max_version FROM assessment_theory_versions WHERE assessment_id = ? FOR UPDATE",
        [assessmentId]
      );
      const nextVersion = Number(maxRows[0].max_version || 0) + 1;
      const [insertResult] = await connection.execute(
        `INSERT INTO assessment_theory_versions
           (assessment_id, version_number, status, completion_required, required_block_count, optional_block_count, metadata, created_at, updated_at)
         VALUES (?, ?, 'draft', ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [assessmentId, nextVersion, requiredBlocks.length > 0 ? 1 : 0, requiredBlocks.length, optionalBlocks.length, serializeJson(metadata)]
      );
      draftId = insertResult.insertId;
    }

    if (combinedBlocks.length) {
      const values = combinedBlocks.map((block) => [
        draftId,
        block.orderIndex,
        block.title,
        block.type,
        block.content || null,
        block.videoUrl || null,
        block.externalUrl || null,
        serializeJson(block.metadata),
        block.isRequired ? 1 : 0,
      ]);
      await connection.query(
        `INSERT INTO assessment_theory_blocks
           (version_id, order_index, title, block_type, content, video_url, external_url, metadata, is_required)
         VALUES ?`,
        [values]
      );
    }

    await connection.commit();
    return getVersionDetail(draftId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function publishDraftVersion({ assessmentId, mode }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [assessmentRows] = await connection.execute("SELECT id, current_theory_version_id FROM assessments WHERE id = ? FOR UPDATE", [
      assessmentId,
    ]);

    if (!assessmentRows.length) {
      const error = new Error("Аттестация не найдена");
      error.status = 404;
      throw error;
    }

    const currentVersionId = assessmentRows[0].current_theory_version_id ? Number(assessmentRows[0].current_theory_version_id) : null;
    let currentVersionRow = null;
    if (currentVersionId) {
      const [currentRows] = await connection.execute("SELECT * FROM assessment_theory_versions WHERE id = ? AND status = 'published' FOR UPDATE", [
        currentVersionId,
      ]);
      if (currentRows.length) {
        currentVersionRow = currentRows[0];
      }
    }

    const [draftRows] = await connection.execute(
      "SELECT * FROM assessment_theory_versions WHERE assessment_id = ? AND status = 'draft' LIMIT 1 FOR UPDATE",
      [assessmentId]
    );

    if (!draftRows.length) {
      const error = new Error("Черновик теории не найден");
      error.status = 404;
      throw error;
    }

    const draftRow = draftRows[0];
    const draftVersionId = draftRow.id;
    const draftRequiredCount = Number(draftRow.required_block_count || 0);

    const [draftBlockRows] = await connection.execute("SELECT * FROM assessment_theory_blocks WHERE version_id = ? ORDER BY order_index ASC", [
      draftVersionId,
    ]);

    const allowOverwriteCurrent = mode === "current" && currentVersionId;
    const requiredCurrentCount = currentVersionRow ? Number(currentVersionRow.required_block_count || 0) : 0;
    const shouldCreateNew = !allowOverwriteCurrent || draftRequiredCount > requiredCurrentCount;

    if (shouldCreateNew) {
      await connection.execute(
        `UPDATE assessment_theory_versions
            SET status = 'published', published_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP()
          WHERE id = ?`,
        [draftVersionId]
      );
      await connection.execute("UPDATE assessments SET current_theory_version_id = ? WHERE id = ?", [draftVersionId, assessmentId]);
    } else {
      await connection.execute(
        `UPDATE assessment_theory_versions
            SET completion_required = ?, required_block_count = ?, optional_block_count = ?, metadata = ?, updated_at = UTC_TIMESTAMP(), published_at = UTC_TIMESTAMP()
          WHERE id = ?`,
        [draftRow.completion_required, draftRow.required_block_count, draftRow.optional_block_count, draftRow.metadata, currentVersionId]
      );
      await connection.execute("DELETE FROM assessment_theory_blocks WHERE version_id = ?", [currentVersionId]);

      if (draftBlockRows.length) {
        const values = draftBlockRows.map((block) => {
          const safeMeta = serializeJson(parseJson(block.metadata));
          return [
            currentVersionId,
            block.order_index,
            block.title,
            block.block_type,
            block.content,
            block.video_url,
            block.external_url,
            safeMeta,
            block.is_required,
          ];
        });
        await connection.query(
          `INSERT INTO assessment_theory_blocks
             (version_id, order_index, title, block_type, content, video_url, external_url, metadata, is_required)
           VALUES ?`,
          [values]
        );
      }

      await connection.execute("DELETE FROM assessment_theory_blocks WHERE version_id = ?", [draftVersionId]);
      await connection.execute("DELETE FROM assessment_theory_versions WHERE id = ?", [draftVersionId]);
    }

    await connection.commit();

    const versionId = shouldCreateNew ? draftVersionId : currentVersionId;
    const versionDetail = await getVersionDetail(versionId);
    return {
      version: versionDetail,
      createdNewVersion: shouldCreateNew,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getTheoryForUser,
  getCurrentTheoryMeta,
  userHasCompletion,
  getCompletionForVersion,
  saveCompletion,
  getTheoryForAdmin,
  saveDraftVersion,
  publishDraftVersion,
};
