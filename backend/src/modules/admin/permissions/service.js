const Joi = require("joi");
const { pool } = require("../../../config/database");
const { logAndSend } = require("../../../services/auditService");
const {
  hasDefaultModuleAccess,
  getDefaultModulesForRole,
  getDefaultModulesMap,
} = require("../../../config/roleModules");

const updatePermissionsSchema = Joi.object({
  modules: Joi.array()
    .items(
      Joi.object({
        moduleId: Joi.number().integer().positive().required(),
        hasAccess: Joi.boolean().required(),
      })
    )
    .required(),
});

async function getRoleNameByUserId(connection, userId) {
  const [roles] = await connection.query(
    "SELECT r.name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ? LIMIT 1",
    [userId]
  );
  return roles[0]?.name || null;
}

async function getSystemModules(req, res, next) {
  try {
    const [modules] = await pool.query(
      `SELECT id, code, name, description, is_active
       FROM system_modules
       WHERE is_active = 1
       ORDER BY name ASC`
    );

    res.json({ modules });
  } catch (error) {
    next(error);
  }
}

async function getDefaultModules(req, res, next) {
  try {
    res.json({ defaultModules: getDefaultModulesMap() });
  } catch (error) {
    next(error);
  }
}

async function getUserPermissions(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const currentUser = req.user;

    if (currentUser.role !== "superadmin" && currentUser.id !== userId) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }

    const [users] = await pool.query("SELECT id, role_id FROM users WHERE id = ?", [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    const user = users[0];

    const [modules] = await pool.query(
      `SELECT id, code, name, description
       FROM system_modules
       WHERE is_active = 1
       ORDER BY name ASC`
    );

    const [permissions] = await pool.query(
      `SELECT module_id, has_access, granted_by, granted_at
       FROM user_permissions
       WHERE user_id = ?`,
      [userId]
    );

    const permissionsMap = {};
    permissions.forEach((permission) => {
      permissionsMap[permission.module_id] = {
        hasAccess: Boolean(permission.has_access),
        grantedBy: permission.granted_by,
        grantedAt: permission.granted_at,
      };
    });

    const [roles] = await pool.query("SELECT name FROM roles WHERE id = ?", [user.role_id]);
    const roleName = roles[0]?.name || null;
    const defaultModules = getDefaultModulesForRole(roleName);

    const result = modules.map((module) => {
      const userPermission = permissionsMap[module.id];
      const defaultAccess = hasDefaultModuleAccess(roleName, module.code);

      return {
        moduleId: module.id,
        moduleCode: module.code,
        moduleName: module.name,
        moduleDescription: module.description,
        hasAccess: userPermission ? userPermission.hasAccess : defaultAccess,
        isCustom: Boolean(userPermission),
        grantedBy: userPermission?.grantedBy || null,
        grantedAt: userPermission?.grantedAt || null,
      };
    });

    res.json({
      permissions: result,
      roleName,
      defaultModules,
    });
  } catch (error) {
    next(error);
  }
}

async function updateUserPermissions(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const userId = Number(req.params.userId);
    const { error, value } = updatePermissionsSchema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    const [users] = await connection.query("SELECT id, first_name, last_name FROM users WHERE id = ?", [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    await connection.beginTransaction();

    await connection.query("DELETE FROM user_permissions WHERE user_id = ?", [userId]);

    if (value.modules.length > 0) {
      const grantedBy = req.user?.id || null;
      const userRole = await getRoleNameByUserId(connection, userId);

      const [allModules] = await connection.query("SELECT id, code FROM system_modules WHERE is_active = 1");
      const modulesMap = {};
      allModules.forEach((module) => {
        modulesMap[module.id] = module.code;
      });

      const insertValues = value.modules
        .filter((moduleAccess) => {
          const moduleCode = modulesMap[moduleAccess.moduleId];
          const defaultAccess = hasDefaultModuleAccess(userRole, moduleCode);
          return moduleAccess.hasAccess !== defaultAccess;
        })
        .map((moduleAccess) => [userId, moduleAccess.moduleId, moduleAccess.hasAccess ? 1 : 0, grantedBy]);

      if (insertValues.length > 0) {
        await connection.query(
          `INSERT INTO user_permissions (user_id, module_id, has_access, granted_by)
           VALUES ?`,
          [insertValues]
        );
      }
    }

    await connection.commit();

    await logAndSend({
      action: "update_user_permissions",
      entityType: "user",
      entityId: userId,
      changes: {
        modules: value.modules,
      },
      metadata: {
        changedBy: req.user?.id || null,
        userName: `${users[0].first_name} ${users[0].last_name}`,
      },
    });

    res.json({ message: "Права доступа успешно обновлены" });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

async function checkUserAccess(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const { moduleCode } = req.query;
    const currentUser = req.user;

    if (currentUser.role !== "superadmin" && currentUser.id !== userId) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }

    if (!moduleCode) {
      return res.status(400).json({ error: "Не указан код модуля" });
    }

    const [users] = await pool.query(
      `SELECT u.id, r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    const roleName = users[0].role_name;

    if (roleName === "superadmin") {
      return res.json({ hasAccess: true, reason: "superadmin" });
    }

    const [modules] = await pool.query("SELECT id FROM system_modules WHERE code = ? AND is_active = 1", [moduleCode]);

    if (modules.length === 0) {
      return res.status(404).json({ error: "Модуль не найден" });
    }

    const moduleId = modules[0].id;

    const [permissions] = await pool.query(
      "SELECT has_access FROM user_permissions WHERE user_id = ? AND module_id = ?",
      [userId, moduleId]
    );

    if (permissions.length > 0) {
      return res.json({
        hasAccess: Boolean(permissions[0].has_access),
        reason: "custom",
      });
    }

    const defaultAccess = hasDefaultModuleAccess(roleName, moduleCode);

    res.json({
      hasAccess: defaultAccess,
      reason: "default",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSystemModules,
  getDefaultModules,
  getUserPermissions,
  updateUserPermissions,
  checkUserAccess,
};
