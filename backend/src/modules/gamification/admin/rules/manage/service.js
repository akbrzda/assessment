const rulesModel = require("../../../../../models/gamificationRulesModel");
const { createLog } = require("../../../../../services/adminLogService");
const rulesEngine = require("../../../../../services/gamificationRulesEngine");

exports.list = async (req, res, next) => {
  try {
    const rules = await rulesModel.listAll();
    res.json({ rules });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rule = await rulesModel.getById(id);
    if (!rule) return res.status(404).json({ error: "РџСЂР°РІРёР»Рѕ РЅРµ РЅР°Р№РґРµРЅРѕ" });
    res.json({ rule });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { code, name, ruleType, condition, formula, scope, priority, isActive, activeFrom, activeTo } = req.body || {};
    if (!code || !name || !ruleType) {
      return res.status(400).json({ error: "code, name, ruleType РѕР±СЏР·Р°С‚РµР»СЊРЅС‹" });
    }
    if (!["points", "badge"].includes(ruleType)) {
      return res.status(400).json({ error: "ruleType РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ 'points' РёР»Рё 'badge'" });
    }
    const id = await rulesModel.create(
      { code, name, ruleType, condition: condition || {}, formula: formula || {}, scope: scope || null, priority, isActive, activeFrom, activeTo },
      req.user?.id
    );
    rulesEngine.clearCache();
    await createLog(req.user.id, "CREATE", `РЎРѕР·РґР°РЅРѕ РїСЂР°РІРёР»Рѕ: ${name} (${code})`, "gamification_rule", id, req);
    res.status(201).json({ message: "РџСЂР°РІРёР»Рѕ СЃРѕР·РґР°РЅРѕ", id });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    await rulesModel.update(id, req.body || {}, req.user?.id);
    rulesEngine.clearCache();
    await createLog(req.user.id, "UPDATE", `РћР±РЅРѕРІР»РµРЅРѕ РїСЂР°РІРёР»Рѕ ID: ${id}`, "gamification_rule", id, req);
    res.json({ message: "РџСЂР°РІРёР»Рѕ РѕР±РЅРѕРІР»РµРЅРѕ" });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await rulesModel.remove(id, req.user?.id);
    rulesEngine.clearCache();
    await createLog(req.user.id, "DELETE", `РЈРґР°Р»РµРЅРѕ РїСЂР°РІРёР»Рѕ ID: ${id}`, "gamification_rule", id, req);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};



