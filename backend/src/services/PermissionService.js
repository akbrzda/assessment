const { pool } = require("../config/database");

const SUPERADMIN_ROLES = new Set(["superadmin"]);

class PermissionService {
  async can(user, moduleCode, entityCode, actionCode, context = {}) {
    if (!user?.id) {
      return { allowed: false, reason: "no_user", source: "system" };
    }

    const isActive = user.is_active == null ? true : Boolean(user.is_active);
    if (!isActive) {
      return { allowed: false, reason: "user_inactive", source: "system" };
    }

    const roleName = String(user.role || user.roleName || "").toLowerCase();
    if (SUPERADMIN_ROLES.has(roleName)) {
      return { allowed: true, reason: "superadmin", source: "role" };
    }

    const permissionId = await this.getPermissionId(moduleCode, entityCode, actionCode);
    if (!permissionId) {
      return { allowed: false, reason: "permission_not_found", source: "system" };
    }

    const override = await this.getUserOverride(user.id, permissionId);
    if (override) {
      const overrideConditionsMet = await this.evaluateConditions(override.conditionsJson, context);
      if (overrideConditionsMet) {
        if (override.effect === "deny") {
          return { allowed: false, reason: "user_explicit_deny", source: "override" };
        }
        if (override.effect === "allow") {
          return { allowed: true, reason: "user_explicit_allow", source: "override" };
        }
      }
    }

    const rolePermissions = await this.getRolePermissions(user.id, permissionId);

    for (const permission of rolePermissions) {
      if (permission.effect !== "deny") {
        continue;
      }
      const denyConditionsMet = await this.evaluateConditions(permission.conditionsJson, context);
      if (denyConditionsMet) {
        return { allowed: false, reason: "role_deny", source: "role" };
      }
    }

    for (const permission of rolePermissions) {
      if (permission.effect !== "allow") {
        continue;
      }
      const allowConditionsMet = await this.evaluateConditions(permission.conditionsJson, context);
      if (allowConditionsMet) {
        return { allowed: true, reason: "role_allow", source: "role" };
      }
    }

    return { allowed: false, reason: "default_deny", source: "system" };
  }

  async getEffectivePermissions(userId) {
    const inherited = await this.getInheritedPermissions(userId);
    const overrides = await this.getOverrides(userId);
    const roles = await this.getUserRoles(userId);
    const byPermissionId = new Map();

    for (const item of inherited) {
      byPermissionId.set(item.permissionId, {
        permissionId: item.permissionId,
        moduleCode: item.moduleCode,
        entityCode: item.entityCode,
        actionCode: item.actionCode,
        effect: item.effect,
        source: "role",
      });
    }

    for (const item of overrides) {
      byPermissionId.set(item.permissionId, {
        permissionId: item.permissionId,
        moduleCode: item.moduleCode,
        entityCode: item.entityCode,
        actionCode: item.actionCode,
        effect: item.effect,
        source: "override",
      });
    }

    return {
      effective: Array.from(byPermissionId.values()),
      inherited,
      overrides,
      roles,
    };
  }

  async evaluateConditions(conditions, context = {}) {
    if (!conditions || (typeof conditions === "object" && Object.keys(conditions).length === 0)) {
      return true;
    }

    let parsed = conditions;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        return false;
      }
    }

    if (!parsed || typeof parsed !== "object") {
      return false;
    }

    if (parsed.branchId != null && Number(parsed.branchId) !== Number(context.branchId)) {
      return false;
    }

    if (parsed.ownerId != null && Number(parsed.ownerId) !== Number(context.ownerId)) {
      return false;
    }

    if (parsed.status != null) {
      const statuses = Array.isArray(parsed.status) ? parsed.status : [parsed.status];
      if (!statuses.map(String).includes(String(context.status))) {
        return false;
      }
    }

    return true;
  }

  async getPermissionId(moduleCode, entityCode, actionCode) {
    const [rows] = await pool.query(
      `SELECT id
       FROM permissions
       WHERE module_code = ?
         AND entity_code = ?
         AND action_code = ?
         AND is_active = 1
       LIMIT 1`,
      [moduleCode, entityCode, actionCode],
    );

    return rows[0]?.id || null;
  }

  async getUserOverride(userId, permissionId) {
    const [rows] = await pool.query(
      `SELECT effect, conditions_json AS conditionsJson
       FROM user_permission_overrides
       WHERE user_id = ?
         AND permission_id = ?
         AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP())
       LIMIT 1`,
      [userId, permissionId],
    );

    return rows[0] || null;
  }

  async getRolePermissions(userId, permissionId) {
    const [rows] = await pool.query(
      `SELECT rp.effect, rp.conditions_json AS conditionsJson
       FROM role_permissions rp
       JOIN user_roles ur ON ur.role_id = rp.role_id
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = ?
         AND ur.is_active = 1
         AND (ur.expires_at IS NULL OR ur.expires_at > UTC_TIMESTAMP())
         AND r.is_active = 1
         AND rp.permission_id = ?
         AND (rp.expires_at IS NULL OR rp.expires_at > UTC_TIMESTAMP())
       ORDER BY r.priority DESC, rp.id ASC`,
      [userId, permissionId],
    );

    return rows;
  }

  async getInheritedPermissions(userId) {
    const [rows] = await pool.query(
      `SELECT
         p.id AS permissionId,
         p.module_code AS moduleCode,
         p.entity_code AS entityCode,
         p.action_code AS actionCode,
         rp.effect
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       JOIN user_roles ur ON ur.role_id = rp.role_id
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = ?
         AND ur.is_active = 1
         AND (ur.expires_at IS NULL OR ur.expires_at > UTC_TIMESTAMP())
         AND r.is_active = 1
         AND p.is_active = 1
         AND (rp.expires_at IS NULL OR rp.expires_at > UTC_TIMESTAMP())`,
      [userId],
    );
    return rows;
  }

  async getOverrides(userId) {
    const [rows] = await pool.query(
      `SELECT
         upo.id,
         p.id AS permissionId,
         p.module_code AS moduleCode,
         p.entity_code AS entityCode,
         p.action_code AS actionCode,
         upo.effect,
         upo.reason,
         upo.expires_at AS expiresAt
       FROM user_permission_overrides upo
       JOIN permissions p ON p.id = upo.permission_id
       WHERE upo.user_id = ?
         AND p.is_active = 1
         AND (upo.expires_at IS NULL OR upo.expires_at > UTC_TIMESTAMP())`,
      [userId],
    );
    return rows;
  }

  async getUserRoles(userId) {
    const [rows] = await pool.query(
      `SELECT
         ur.id,
         ur.role_id AS roleId,
         r.name AS roleName,
         ur.assigned_at AS assignedAt,
         ur.expires_at AS expiresAt,
         ur.assigned_by AS assignedBy
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = ?
         AND ur.is_active = 1
         AND (ur.expires_at IS NULL OR ur.expires_at > UTC_TIMESTAMP())
       ORDER BY ur.assigned_at DESC`,
      [userId],
    );
    return rows;
  }
}

module.exports = new PermissionService();
