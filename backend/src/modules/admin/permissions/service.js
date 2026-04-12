const Joi = require("joi");
const { pool } = require("../../../config/database");
const { logAndSend, buildActorFromRequest } = require("../../../services/auditService");

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
 * РџРѕР»СѓС‡РёС‚СЊ СЃРїРёСЃРѕРє РІСЃРµС… РјРѕРґСѓР»РµР№ СЃРёСЃС‚РµРјС‹
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
 * РџРѕР»СѓС‡РёС‚СЊ РїСЂР°РІР° РґРѕСЃС‚СѓРїР° РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
 */
async function getUserPermissions(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const currentUser = req.user;

    // РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РјРѕР¶РµС‚ Р·Р°РіСЂСѓР¶Р°С‚СЊ С‚РѕР»СЊРєРѕ СЃРІРѕРё РїСЂР°РІР°, superadmin - Р»СЋР±С‹Рµ
    if (currentUser.role !== "superadmin" && currentUser.id !== userId) {
      return res.status(403).json({ error: "Р”РѕСЃС‚СѓРї Р·Р°РїСЂРµС‰С‘РЅ" });
    }

    // РџСЂРѕРІРµСЂСЏРµРј СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
    const [users] = await pool.query("SELECT id, role_id FROM users WHERE id = ?", [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    const user = users[0];

    // РџРѕР»СѓС‡Р°РµРј РІСЃРµ РјРѕРґСѓР»Рё
    const [modules] = await pool.query(
      `SELECT id, code, name, description 
       FROM system_modules 
       WHERE is_active = 1 
       ORDER BY name ASC`
    );

    // РџРѕР»СѓС‡Р°РµРј РїСЂР°РІР° РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
    const [permissions] = await pool.query(
      `SELECT module_id, has_access, granted_by, granted_at 
       FROM user_permissions 
       WHERE user_id = ?`,
      [userId]
    );

    // Р¤РѕСЂРјРёСЂСѓРµРј РєР°СЂС‚Сѓ РїСЂР°РІ
    const permissionsMap = {};
    permissions.forEach((p) => {
      permissionsMap[p.module_id] = {
        hasAccess: Boolean(p.has_access),
        grantedBy: p.granted_by,
        grantedAt: p.granted_at,
      };
    });

    // РџРѕР»СѓС‡Р°РµРј СЂРѕР»СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РґР»СЏ РѕРїСЂРµРґРµР»РµРЅРёСЏ РїСЂР°РІ РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ
    const [roles] = await pool.query("SELECT name FROM roles WHERE id = ?", [user.role_id]);
    const roleName = roles[0]?.name;

    // Р¤РѕСЂРјРёСЂСѓРµРј СЂРµР·СѓР»СЊС‚Р°С‚
    const result = modules.map((module) => {
      const userPermission = permissionsMap[module.id];

      // РћРїСЂРµРґРµР»СЏРµРј РґРѕСЃС‚СѓРї РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ РЅР° РѕСЃРЅРѕРІРµ СЂРѕР»Рё
      let defaultAccess = false;
      if (roleName === "superadmin") {
        defaultAccess = true; // РЎСѓРїРµСЂР°РґРјРёРЅ РёРјРµРµС‚ РґРѕСЃС‚СѓРї РєРѕ РІСЃРµРј РјРѕРґСѓР»СЏРј
      } else if (roleName === "manager") {
        // РњРµРЅРµРґР¶РµСЂ РёРјРµРµС‚ РґРѕСЃС‚СѓРї Рє РЅРµРєРѕС‚РѕСЂС‹Рј РјРѕРґСѓР»СЏРј РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ
        const managerModules = ["assessments", "analytics", "users", "questions"];
        defaultAccess = managerModules.includes(module.code);
      }

      return {
        moduleId: module.id,
        moduleCode: module.code,
        moduleName: module.name,
        moduleDescription: module.description,
        hasAccess: userPermission ? userPermission.hasAccess : defaultAccess,
        isCustom: Boolean(userPermission), // Р•СЃС‚СЊ Р»Рё РєР°СЃС‚РѕРјРЅР°СЏ РЅР°СЃС‚СЂРѕР№РєР°
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
 * РћР±РЅРѕРІРёС‚СЊ РїСЂР°РІР° РґРѕСЃС‚СѓРїР° РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
 */
async function updateUserPermissions(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const userId = Number(req.params.userId);
    const { error, value } = updatePermissionsSchema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    // РџСЂРѕРІРµСЂСЏРµРј СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
    const [users] = await connection.query("SELECT id, first_name, last_name FROM users WHERE id = ?", [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    await connection.beginTransaction();

    // РЈРґР°Р»СЏРµРј СЃС‚Р°СЂС‹Рµ РїСЂР°РІР°
    await connection.query("DELETE FROM user_permissions WHERE user_id = ?", [userId]);

    // Р”РѕР±Р°РІР»СЏРµРј РЅРѕРІС‹Рµ РїСЂР°РІР° (С‚РѕР»СЊРєРѕ РµСЃР»Рё РѕРЅРё РѕС‚Р»РёС‡Р°СЋС‚СЃСЏ РѕС‚ СѓРјРѕР»С‡Р°РЅРёСЏ)
    if (value.modules.length > 0) {
      const grantedBy = req.user?.id || null;

      // РџРѕР»СѓС‡Р°РµРј СЂРѕР»СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РґР»СЏ РѕРїСЂРµРґРµР»РµРЅРёСЏ РґРµС„РѕР»С‚РЅС‹С… РїСЂР°РІ
      const [userRoles] = await connection.query("SELECT r.name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?", [userId]);
      const userRole = userRoles[0]?.name;

      // РџРѕР»СѓС‡Р°РµРј РІСЃРµ РјРѕРґСѓР»Рё РґР»СЏ РѕРїСЂРµРґРµР»РµРЅРёСЏ РґРµС„РѕР»С‚РЅС‹С… РїСЂР°РІ
      const [allModules] = await connection.query("SELECT id, code FROM system_modules WHERE is_active = 1");
      const modulesMap = {};
      allModules.forEach((m) => {
        modulesMap[m.id] = m.code;
      });

      // Р¤РёР»СЊС‚СЂСѓРµРј С‚РѕР»СЊРєРѕ С‚Рµ РїСЂР°РІР°, РєРѕС‚РѕСЂС‹Рµ РѕС‚Р»РёС‡Р°СЋС‚СЃСЏ РѕС‚ РґРµС„РѕР»С‚РЅС‹С…
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

          // Р”РѕР±Р°РІР»СЏРµРј С‚РѕР»СЊРєРѕ РµСЃР»Рё РїСЂР°РІРѕ РѕС‚Р»РёС‡Р°РµС‚СЃСЏ РѕС‚ РґРµС„РѕР»С‚РЅРѕРіРѕ
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

    // Р›РѕРіРёСЂСѓРµРј РґРµР№СЃС‚РІРёРµ
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

    res.json({ message: "РџСЂР°РІР° РґРѕСЃС‚СѓРїР° СѓСЃРїРµС€РЅРѕ РѕР±РЅРѕРІР»РµРЅС‹" });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

/**
 * РџСЂРѕРІРµСЂРёС‚СЊ РґРѕСЃС‚СѓРї РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ Рє РјРѕРґСѓР»СЋ
 */
async function checkUserAccess(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const { moduleCode } = req.query;
    const currentUser = req.user;

    // РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РјРѕР¶РµС‚ РїСЂРѕРІРµСЂСЏС‚СЊ С‚РѕР»СЊРєРѕ СЃРІРѕР№ РґРѕСЃС‚СѓРї, superadmin - Р»СЋР±РѕР№
    if (currentUser.role !== "superadmin" && currentUser.id !== userId) {
      return res.status(403).json({ error: "Р”РѕСЃС‚СѓРї Р·Р°РїСЂРµС‰С‘РЅ" });
    }

    if (!moduleCode) {
      return res.status(400).json({ error: "РќРµ СѓРєР°Р·Р°РЅ РєРѕРґ РјРѕРґСѓР»СЏ" });
    }

    // РџРѕР»СѓС‡Р°РµРј РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ СЃ РµРіРѕ СЂРѕР»СЊСЋ
    const [users] = await pool.query(
      `SELECT u.id, u.role_id, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    const user = users[0];

    // РЎСѓРїРµСЂР°РґРјРёРЅ РёРјРµРµС‚ РґРѕСЃС‚СѓРї РєРѕ РІСЃРµРјСѓ
    if (user.role_name === "superadmin") {
      return res.json({ hasAccess: true, reason: "superadmin" });
    }

    // РџРѕР»СѓС‡Р°РµРј РјРѕРґСѓР»СЊ
    const [modules] = await pool.query("SELECT id FROM system_modules WHERE code = ? AND is_active = 1", [moduleCode]);

    if (modules.length === 0) {
      return res.status(404).json({ error: "РњРѕРґСѓР»СЊ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    const moduleId = modules[0].id;

    // РџСЂРѕРІРµСЂСЏРµРј РєР°СЃС‚РѕРјРЅС‹Рµ РїСЂР°РІР°
    const [permissions] = await pool.query("SELECT has_access FROM user_permissions WHERE user_id = ? AND module_id = ?", [userId, moduleId]);

    if (permissions.length > 0) {
      return res.json({
        hasAccess: Boolean(permissions[0].has_access),
        reason: "custom",
      });
    }

    // РџСЂРѕРІРµСЂСЏРµРј РїСЂР°РІР° РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ РґР»СЏ СЂРѕР»Рё
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

