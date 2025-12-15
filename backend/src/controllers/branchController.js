const Joi = require("joi");
const { pool } = require("../config/database");
const { logAuditEvent, buildAuditEntry, buildActorFromRequest } = require("../services/auditService");

const branchSchema = Joi.object({
  name: Joi.string().trim().min(2).max(128).required(),
  city: Joi.string().trim().max(64).optional().allow("", null),
  isActive: Joi.boolean().optional(),
});

async function listBranches(req, res, next) {
  try {
    const [branches] = await pool.execute(`
      SELECT 
        b.id,
        b.name,
        b.city,
        b.created_at as createdAt,
        b.updated_at as updatedAt,
        COUNT(DISTINCT u.id) as usersCount
      FROM branches b
      LEFT JOIN users u ON u.branch_id = b.id
      GROUP BY b.id
      ORDER BY b.name ASC
    `);

    res.json({ branches });
  } catch (error) {
    next(error);
  }
}

async function createBranch(req, res, next) {
  try {
    const { error, value } = branchSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    const [result] = await pool.execute("INSERT INTO branches (name, city) VALUES (?, ?)", [value.name, value.city || null]);

    const [branches] = await pool.execute("SELECT * FROM branches WHERE id = ?", [result.insertId]);

    const auditEntry = buildAuditEntry({
      scope: "admin_panel",
      action: "branch.created",
      entity: "branch",
      entityId: result.insertId,
      actor: buildActorFromRequest(req),
      metadata: {
        name: value.name,
        city: value.city || null,
      },
    });
    await logAuditEvent(auditEntry);

    res.status(201).json({ branch: branches[0] });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Филиал с таким названием уже существует" });
    }
    next(error);
  }
}

async function updateBranch(req, res, next) {
  try {
    const branchId = Number(req.params.id);
    const { error, value } = branchSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    const [existing] = await pool.execute("SELECT * FROM branches WHERE id = ?", [branchId]);
    if (!existing.length) {
      return res.status(404).json({ error: "Филиал не найден" });
    }

    await pool.execute("UPDATE branches SET name = ?, city = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [
      value.name,
      value.city || null,
      branchId,
    ]);

    const [branches] = await pool.execute("SELECT * FROM branches WHERE id = ?", [branchId]);

    const auditEntry = buildAuditEntry({
      scope: "admin_panel",
      action: "branch.updated",
      entity: "branch",
      entityId: branchId,
      actor: buildActorFromRequest(req),
      metadata: {
        previousName: existing[0].name,
        name: value.name,
        previousCity: existing[0].city,
        city: value.city || null,
      },
    });
    await logAuditEvent(auditEntry);

    res.json({ branch: branches[0] });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Филиал с таким названием уже существует" });
    }
    next(error);
  }
}

async function deleteBranch(req, res, next) {
  try {
    const branchId = Number(req.params.id);

    const [existing] = await pool.execute("SELECT * FROM branches WHERE id = ?", [branchId]);
    if (!existing.length) {
      return res.status(404).json({ error: "Филиал не найден" });
    }

    // Проверяем, есть ли пользователи в этом филиале
    const [users] = await pool.execute("SELECT COUNT(*) as count FROM users WHERE branch_id = ?", [branchId]);

    if (users[0].count > 0) {
      return res.status(400).json({
        error: `Невозможно удалить филиал. В нём ${users[0].count} сотрудников. Сначала переместите их в другой филиал.`,
      });
    }

    await pool.execute("DELETE FROM branches WHERE id = ?", [branchId]);

    const auditEntry = buildAuditEntry({
      scope: "admin_panel",
      action: "branch.deleted",
      entity: "branch",
      entityId: branchId,
      actor: buildActorFromRequest(req),
      metadata: {
        name: existing[0].name,
      },
    });
    await logAuditEvent(auditEntry);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
};
