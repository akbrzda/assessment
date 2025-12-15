const rulesModel = require("../models/gamificationRulesModel");
const { createLog } = require("./adminLogsController");
const rulesEngine = require("../services/gamificationRulesEngine");

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
    if (!rule) return res.status(404).json({ error: "Правило не найдено" });
    res.json({ rule });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { code, name, ruleType, condition, formula, scope, priority, isActive, activeFrom, activeTo } = req.body || {};
    if (!code || !name || !ruleType) {
      return res.status(400).json({ error: "code, name, ruleType обязательны" });
    }
    if (!["points", "badge"].includes(ruleType)) {
      return res.status(400).json({ error: "ruleType должен быть 'points' или 'badge'" });
    }
    const id = await rulesModel.create(
      { code, name, ruleType, condition: condition || {}, formula: formula || {}, scope: scope || null, priority, isActive, activeFrom, activeTo },
      req.user?.id
    );
    rulesEngine.clearCache();
    await createLog(req.user.id, "CREATE", `Создано правило: ${name} (${code})`, "gamification_rule", id, req);
    res.status(201).json({ message: "Правило создано", id });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    await rulesModel.update(id, req.body || {}, req.user?.id);
    rulesEngine.clearCache();
    await createLog(req.user.id, "UPDATE", `Обновлено правило ID: ${id}`, "gamification_rule", id, req);
    res.json({ message: "Правило обновлено" });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await rulesModel.remove(id, req.user?.id);
    rulesEngine.clearCache();
    await createLog(req.user.id, "DELETE", `Удалено правило ID: ${id}`, "gamification_rule", id, req);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
