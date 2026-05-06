const referencesService = require("./service");

async function getReferences(req, res, next) {
  try {
    const payload = await referencesService.getAdminReferences(req.user || {});
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getReferences,
};
