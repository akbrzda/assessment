const Joi = require("joi");
const { pool } = require("../config/database");
const { logAndSend, buildActorFromRequest } = require("../services/auditService");

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

/**
 * Получить список всех модулей системы
 */
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

/**
 * Получить права доступа пользователя
 */
async function getUserPermissions(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const currentUser = req.user;

    // Пользователь может загружать только свои права, superadmin - любые
    if (currentUser.role !== "superadmin" && currentUser.id !== userId) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }

    // Проверяем существование пользователя
    const [users] = await pool.query("SELECT id, role_id FROM users WHERE id = ?", [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    const user = users[0];

    // Получаем все модули
    const [modules] = await pool.query(
      `SELECT id, code, name, description 
       FROM system_modules 
       WHERE is_active = 1 
       ORDER BY name ASC`
    );

    // Получаем права пользователя
    const [permissions] = await pool.query(
      `SELECT module_id, has_access, granted_by, granted_at 
       FROM user_permissions 
       WHERE user_id = ?`,
      [userId]
    );

    // Формируем карту прав
    const permissionsMap = {};
    permissions.forEach((p) => {
      permissionsMap[p.module_id] = {
        hasAccess: Boolean(p.has_access),
        grantedBy: p.granted_by,
        grantedAt: p.granted_at,
      };
    });

    // Получаем роль пользователя для определения прав по умолчанию
    const [roles] = await pool.query("SELECT name FROM roles WHERE id = ?", [user.role_id]);
    const roleName = roles[0]?.name;

    // Формируем результат
    const result = modules.map((module) => {
      const userPermission = permissionsMap[module.id];

      // Определяем доступ по умолчанию на основе роли
      let defaultAccess = false;
      if (roleName === "superadmin") {
        defaultAccess = true; // Суперадмин имеет доступ ко всем модулям
      } else if (roleName === "manager") {
        // Менеджер имеет доступ к некоторым модулям по умолчанию
        const managerModules = ["assessments", "analytics", "users", "questions"];
        defaultAccess = managerModules.includes(module.code);
      }

      return {
        moduleId: module.id,
        moduleCode: module.code,
        moduleName: module.name,
        moduleDescription: module.description,
        hasAccess: userPermission ? userPermission.hasAccess : defaultAccess,
        isCustom: Boolean(userPermission), // Есть ли кастомная настройка
        grantedBy: userPermission?.grantedBy || null,
        grantedAt: userPermission?.grantedAt || null,
      };
    });

    res.json({ permissions: result });
  } catch (error) {
    next(error);
  }
}

/**
 * Обновить права доступа пользователя
 */
async function updateUserPermissions(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const userId = Number(req.params.userId);
    const { error, value } = updatePermissionsSchema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    // Проверяем существование пользователя
    const [users] = await connection.query("SELECT id, first_name, last_name FROM users WHERE id = ?", [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    await connection.beginTransaction();

    // Удаляем старые права
    await connection.query("DELETE FROM user_permissions WHERE user_id = ?", [userId]);

    // Добавляем новые права (только если они отличаются от умолчания)
    if (value.modules.length > 0) {
      const grantedBy = req.user?.id || null;

      // Получаем роль пользователя для определения дефолтных прав
      const [userRoles] = await connection.query("SELECT r.name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?", [userId]);
      const userRole = userRoles[0]?.name;

      // Получаем все модули для определения дефолтных прав
      const [allModules] = await connection.query("SELECT id, code FROM system_modules WHERE is_active = 1");
      const modulesMap = {};
      allModules.forEach((m) => {
        modulesMap[m.id] = m.code;
      });

      // Фильтруем только те права, которые отличаются от дефолтных
      const insertValues = value.modules
        .filter((m) => {
          const moduleCode = modulesMap[m.moduleId];
          let defaultAccess = false;

          if (userRole === "superadmin") {
            defaultAccess = true;
          } else if (userRole === "manager") {
            const managerModules = ["assessments", "analytics", "users", "questions"];
            defaultAccess = managerModules.includes(moduleCode);
          }

          // Добавляем только если право отличается от дефолтного
          return m.hasAccess !== defaultAccess;
        })
        .map((m) => [userId, m.moduleId, m.hasAccess ? 1 : 0, grantedBy]);

      if (insertValues.length > 0) {
        await connection.query(
          `INSERT INTO user_permissions (user_id, module_id, has_access, granted_by) 
           VALUES ?`,
          [insertValues]
        );
      }
    }

    await connection.commit();

    // Логируем действие
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

/**
 * Проверить доступ пользователя к модулю
 */
async function checkUserAccess(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const { moduleCode } = req.query;
    const currentUser = req.user;

    // Пользователь может проверять только свой доступ, superadmin - любой
    if (currentUser.role !== "superadmin" && currentUser.id !== userId) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }

    if (!moduleCode) {
      return res.status(400).json({ error: "Не указан код модуля" });
    }

    // Получаем пользователя с его ролью
    const [users] = await pool.query(
      `SELECT u.id, u.role_id, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    const user = users[0];

    // Суперадмин имеет доступ ко всему
    if (user.role_name === "superadmin") {
      return res.json({ hasAccess: true, reason: "superadmin" });
    }

    // Получаем модуль
    const [modules] = await pool.query("SELECT id FROM system_modules WHERE code = ? AND is_active = 1", [moduleCode]);

    if (modules.length === 0) {
      return res.status(404).json({ error: "Модуль не найден" });
    }

    const moduleId = modules[0].id;

    // Проверяем кастомные права
    const [permissions] = await pool.query("SELECT has_access FROM user_permissions WHERE user_id = ? AND module_id = ?", [userId, moduleId]);

    if (permissions.length > 0) {
      return res.json({
        hasAccess: Boolean(permissions[0].has_access),
        reason: "custom",
      });
    }

    // Проверяем права по умолчанию для роли
    const managerModules = ["assessments", "analytics", "users", "questions"];
    const defaultAccess = user.role_name === "manager" && managerModules.includes(moduleCode);

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
  getUserPermissions,
  updateUserPermissions,
  checkUserAccess,
};
