const authService = require("./service");
const { validateLoginPayload } = require("./validators");

function handleKnownError(error, res, next) {
  if (error.status) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  next(error);
}

async function login(req, res, next) {
  try {
    const payload = validateLoginPayload(req.body);
    const response = await authService.login(payload, req, res);
    res.json(response);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function refresh(req, res, next) {
  try {
    const response = await authService.refresh(req.body, req, res);
    res.json(response);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function logout(req, res, next) {
  try {
    const response = await authService.logout(req.user, res);
    res.json(response);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = {
  login,
  refresh,
  logout,
};
