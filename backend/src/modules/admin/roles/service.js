const Joi = require("joi");
const { pool } = require("../../../config/database");
const { logAndSend, buildActorFromRequest } = require("../../../services/auditService");

const updateRolePermissionsSchema = Joi.object({
  permissions: Joi.array()
    .items(
      Joi.object({
        permissionId: Joi.number().integer().positive().required(),
        effect: Joi.string().valid("allow", "deny").required(),
        conditions: Joi.object().allow(null).optional(),
        expiresAt: Joi.date().iso().allow(null).optional(),
      }),
    )
    .required(),
});

function parsePagination(query) {
  const rawPage = Number(query?.page);
  const rawLimit = Number(query?.limit);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.trunc(rawPage) : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.trunc(rawLimit), 100) : 20;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function toMySqlDateTime(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 19).replace("T", " ");
}

async function list(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const [[countRow]] = await pool.query("SELECT COUNT(*) AS total FROM roles");
    const [roles] = await pool.query(
      `SELECT
         r.id,
         r.name AS code,
         r.name,
         NULL AS description,
         COALESCE(r.priority, 0) AS priority,
         COALESCE(r.is_system, 0) AS is_system,
         COALESCE(r.is_active, 1) AS is_active,
         (
           SELECT COUNT(*)
           FROM role_permissions rp
           WHERE rp.role_id = r.id
             AND (rp.expires_at IS NULL OR rp.expires_at > UTC_TIMESTAMP())
         ) AS permissions_count,
         (
           SELECT COUNT(*)
           FROM user_roles ur
           WHERE ur.role_id = r.id
             AND ur.is_active = 1
             AND (ur.expires_at IS NULL OR ur.expires_at > UTC_TIMESTAMP())
         ) AS users_count
       FROM roles r
       ORDER BY r.id ASC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    );

    return res.json({
      roles,
      total: Number(countRow?.total || 0),
      page,
      limit,
    });
  } catch (error) {
    return next(error);
  }
}

async function getById(req, res, next) {
  try {
    const roleId = Number(req.params.id);
    if (!Number.isInteger(roleId) || roleId <= 0) {
      return res.status(400).json({ error: "Некорректный идентификатор роли" });
    }

    const [roles] = await pool.query(
      `SELECT
         r.id,
         r.name AS code,
         r.name,
         NULL AS description,
         COALESCE(r.priority, 0) AS priority,
         COALESCE(r.is_system, 0) AS is_system,
         COALESCE(r.is_active, 1) AS is_active
       FROM roles r
       WHERE r.id = ?
       LIMIT 1`,
      [roleId],
    );
    if (!roles.length) {
      return res.status(404).json({ error: "Роль не найдена" });
    }

    const [permissions] = await pool.query(
      `SELECT
         rp.id,
         rp.permission_id AS permissionId,
         p.module_code AS moduleCode,
         p.entity_code AS entityCode,
         p.action_code AS actionCode,
         rp.effect,
         rp.conditions_json AS conditions,
         rp.expires_at AS expiresAt
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = ?
       ORDER BY rp.id ASC`,
      [roleId],
    );

    const [availablePermissions] = await pool.query(
      `SELECT
         p.id AS permissionId,
         p.module_code AS moduleCode,
         p.entity_code AS entityCode,
         p.action_code AS actionCode
       FROM permissions p
       WHERE p.is_active = 1
       ORDER BY p.module_code, p.entity_code, p.action_code`,
    );

    const [users] = await pool.query(
      `SELECT
         u.id,
         u.first_name AS firstName,
         u.last_name AS lastName,
         ur.assigned_at AS assignedAt,
         ur.expires_at AS expiresAt,
         ur.is_active AS isActive
       FROM user_roles ur
       JOIN users u ON u.id = ur.user_id
       WHERE ur.role_id = ?
       ORDER BY ur.assigned_at DESC`,
      [roleId],
    );

    return res.json({
      role: roles[0],
      permissions,
      availablePermissions,
      users,
    });
  } catch (error) {
    return next(error);
  }
}

async function updatePermissions(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const roleId = Number(req.params.id);
    if (!Number.isInteger(roleId) || roleId <= 0) {
      return res.status(400).json({ error: "Некорректный идентификатор роли" });
    }

    const { error, value } = updateRolePermissionsSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    const [roles] = await connection.query("SELECT id, name FROM roles WHERE id = ? LIMIT 1", [roleId]);
    if (!roles.length) {
      return res.status(404).json({ error: "Роль не найдена" });
    }

    await connection.beginTransaction();
    await connection.query("DELETE FROM role_permissions WHERE role_id = ?", [roleId]);

    if (value.permissions.length > 0) {
      const payload = value.permissions.map((item) => [
        roleId,
        item.permissionId,
        item.effect,
        item.conditions ? JSON.stringify(item.conditions) : null,
        toMySqlDateTime(item.expiresAt),
      ]);

      await connection.query(
        `INSERT INTO role_permissions (role_id, permission_id, effect, conditions_json, expires_at)
         VALUES ?`,
        [payload],
      );
    }

    await connection.commit();

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      action: "role.permissions.updated",
      entity: "role",
      entityId: roleId,
      metadata: { permissionsCount: value.permissions.length },
    });

    return res.json({
      role: { id: roleId, name: roles[0].name },
      permissions: value.permissions,
    });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
}

module.exports = {
  list,
  getById,
  updatePermissions,
};
