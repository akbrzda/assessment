const branchService = require("./branches.service");
const {
  parseBranchId,
  parseUserId,
  normalizeSearch,
  normalizeBranchIds,
} = require("./branches.validators");

async function getBranches(req, res, next) {
  try {
    const branches = await branchService.getBranches({
      search: normalizeSearch(req.query.search),
    });
    res.json({ branches });
  } catch (error) {
    next(error);
  }
}

async function getBranchById(req, res, next) {
  try {
    const branchId = parseBranchId(req.params.id);
    const payload = await branchService.getBranchById(branchId);
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

async function createBranch(req, res, next) {
  try {
    const result = await branchService.createBranch(req.body, req);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function updateBranch(req, res, next) {
  try {
    const branchId = parseBranchId(req.params.id);
    const result = await branchService.updateBranch(branchId, req.body, req);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function deleteBranch(req, res, next) {
  try {
    const branchId = parseBranchId(req.params.id);
    await branchService.deleteBranch(branchId, req);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function assignManager(req, res, next) {
  try {
    const branchId = parseBranchId(req.params.id);
    const userId = parseUserId(req.body.userId);
    const result = await branchService.assignManager(branchId, userId, req);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function removeManager(req, res, next) {
  try {
    const branchId = parseBranchId(req.params.id);
    const userId = parseUserId(req.body.userId);
    const result = await branchService.removeManager(branchId, userId, req);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function assignManagerToBranches(req, res, next) {
  try {
    const userId = parseUserId(req.body.userId);
    const branchIds = normalizeBranchIds(req.body.branchIds);
    const result = await branchService.assignManagerToBranches(userId, branchIds, req);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getManagers(req, res, next) {
  try {
    const payload = await branchService.getManagers();
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  assignManager,
  removeManager,
  assignManagerToBranches,
  getManagers,
};
