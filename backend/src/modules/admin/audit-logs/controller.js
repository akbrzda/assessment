const service = require("./service");

async function listAuditLogs(req, res, next) {
  try {
    const result = await service.listAuditLogs(req.query);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    res.json({
      success: true,
      data: {
        items: result.items,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: Math.ceil(result.total / limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getAuditLogById(req, res, next) {
  try {
    const record = await service.getAuditLogById(req.params.id);
    res.json({ success: true, data: record });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = {
  listAuditLogs,
  getAuditLogById,
};
