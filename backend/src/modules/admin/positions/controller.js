const positionsService = require("./service");
const { parsePositionId, parseSearch } = require("./validators");

async function getPositions(req, res, next) {
  try {
    const positions = await positionsService.getPositions({
      search: parseSearch(req.query.search),
    });
    res.json({ positions });
  } catch (error) {
    next(error);
  }
}

async function getPositionById(req, res, next) {
  try {
    const positionId = parsePositionId(req.params.id);
    const position = await positionsService.getPositionById(positionId);
    res.json({ position });
  } catch (error) {
    next(error);
  }
}

async function createPosition(req, res, next) {
  try {
    const result = await positionsService.createPosition(req.body, req);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function updatePosition(req, res, next) {
  try {
    const positionId = parsePositionId(req.params.id);
    const result = await positionsService.updatePosition(positionId, req.body, req);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function deletePosition(req, res, next) {
  try {
    const positionId = parsePositionId(req.params.id);
    await positionsService.deletePosition(positionId, req);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPositions,
  getPositionById,
  createPosition,
  updatePosition,
  deletePosition,
};

