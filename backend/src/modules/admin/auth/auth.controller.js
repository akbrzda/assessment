const authService = require("./auth.service");
const { sendLegacyResult } = require("../shared/legacy-handler-adapter");

async function login(req, res, next) {
  try {
    const result = await authService.login(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const result = await authService.refresh(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    const result = await authService.logout(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  refresh,
  logout,
};
