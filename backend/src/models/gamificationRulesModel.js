const { pool } = require("../config/database");

async function listActiveRules(connection) {
  const executor = connection || pool;
  const now = new Date();
  const [rows] = await executor.query(
    `SELECT id, code, name, rule_type AS ruleType, condition_json AS conditionJson,
            formula_json AS formulaJson, scope_json AS scopeJson, priority, is_active AS isActive,
            active_from AS activeFrom, active_to AS activeTo
       FROM gamification_rules
      WHERE is_active = 1
        AND (active_from IS NULL OR active_from <= ?)
        AND (active_to IS NULL OR active_to >= ?)
      ORDER BY priority ASC, id ASC`,
    [now, now]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    code: r.code,
    name: r.name,
    ruleType: r.ruleType,
    condition: safeParse(r.conditionJson),
    formula: safeParse(r.formulaJson),
    scope: safeParse(r.scopeJson),
    priority: Number(r.priority),
    isActive: !!r.isActive,
    activeFrom: r.activeFrom,
    activeTo: r.activeTo,
  }));
}

function safeParse(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

module.exports = {
  listActiveRules,
  async listAll() {
    const [rows] = await pool.query(
      `SELECT id, code, name, rule_type AS ruleType, condition_json AS conditionJson,
              formula_json AS formulaJson, scope_json AS scopeJson, priority, is_active AS isActive,
              active_from AS activeFrom, active_to AS activeTo,
              created_at AS createdAt, updated_at AS updatedAt
         FROM gamification_rules
        ORDER BY priority ASC, id ASC`
    );
    return rows.map((r) => ({
      id: Number(r.id),
      code: r.code,
      name: r.name,
      ruleType: r.ruleType,
      condition: safeParse(r.conditionJson),
      formula: safeParse(r.formulaJson),
      scope: safeParse(r.scopeJson),
      priority: Number(r.priority),
      isActive: !!r.isActive,
      activeFrom: r.activeFrom,
      activeTo: r.activeTo,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  },
  async getById(id) {
    const [rows] = await pool.query(
      `SELECT id, code, name, rule_type AS ruleType, condition_json AS conditionJson,
              formula_json AS formulaJson, scope_json AS scopeJson, priority, is_active AS isActive,
              active_from AS activeFrom, active_to AS activeTo,
              created_at AS createdAt, updated_at AS updatedAt
         FROM gamification_rules WHERE id = ?`,
      [id]
    );
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: Number(r.id),
      code: r.code,
      name: r.name,
      ruleType: r.ruleType,
      condition: safeParse(r.conditionJson),
      formula: safeParse(r.formulaJson),
      scope: safeParse(r.scopeJson),
      priority: Number(r.priority),
      isActive: !!r.isActive,
      activeFrom: r.activeFrom,
      activeTo: r.activeTo,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  },
  async create({ code, name, ruleType, condition, formula, scope, priority = 100, isActive = 1, activeFrom = null, activeTo = null }, userId) {
    const [exists] = await pool.query("SELECT id FROM gamification_rules WHERE code = ?", [code]);
    if (exists.length) {
      const err = new Error("Правило с таким кодом уже существует");
      err.status = 400;
      throw err;
    }
    const [res] = await pool.query(
      `INSERT INTO gamification_rules (code, name, rule_type, condition_json, formula_json, scope_json, priority, is_active, active_from, active_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        name,
        ruleType,
        JSON.stringify(condition || {}),
        JSON.stringify(formula || {}),
        scope ? JSON.stringify(scope) : null,
        Number(priority) || 100,
        isActive ? 1 : 0,
        activeFrom || null,
        activeTo || null,
      ]
    );
    await pool.query(
      `INSERT INTO gamification_rule_history (rule_code, action, old_data, new_data, changed_by)
       VALUES (?, 'create', NULL, ?, ?)`,
      [code, JSON.stringify({ code, name, ruleType, condition, formula, scope, priority, isActive, activeFrom, activeTo }), userId || null]
    );
    return res.insertId;
  },
  async update(id, payload, userId) {
    const before = await this.getById(id);
    if (!before) {
      const err = new Error("Правило не найдено");
      err.status = 404;
      throw err;
    }
    const {
      code = before.code,
      name = before.name,
      ruleType = before.ruleType,
      condition = before.condition,
      formula = before.formula,
      scope = before.scope,
      priority = before.priority,
      isActive = before.isActive,
      activeFrom = before.activeFrom,
      activeTo = before.activeTo,
    } = payload || {};

    await pool.query(
      `UPDATE gamification_rules SET code = ?, name = ?, rule_type = ?, condition_json = ?, formula_json = ?, scope_json = ?, priority = ?, is_active = ?, active_from = ?, active_to = ? WHERE id = ?`,
      [
        code,
        name,
        ruleType,
        JSON.stringify(condition || {}),
        JSON.stringify(formula || {}),
        scope ? JSON.stringify(scope) : null,
        Number(priority) || 100,
        isActive ? 1 : 0,
        activeFrom || null,
        activeTo || null,
        id,
      ]
    );
    const after = await this.getById(id);
    await pool.query(
      `INSERT INTO gamification_rule_history (rule_code, action, old_data, new_data, changed_by)
       VALUES (?, 'update', ?, ?, ?)`,
      [after.code, JSON.stringify(before), JSON.stringify(after), userId || null]
    );
  },
  async remove(id, userId) {
    const before = await this.getById(id);
    if (!before) {
      const err = new Error("Правило не найдено");
      err.status = 404;
      throw err;
    }
    await pool.query("DELETE FROM gamification_rules WHERE id = ?", [id]);
    await pool.query(
      `INSERT INTO gamification_rule_history (rule_code, action, old_data, new_data, changed_by)
       VALUES (?, 'delete', ?, NULL, ?)`,
      [before.code, JSON.stringify(before), userId || null]
    );
  },
};
