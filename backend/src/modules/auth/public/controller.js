const authService = require("./service");
const {
  validateProfilePayload,
  validateRegistrationPayload,
  validateTimezonePayload,
} = require("./validators");

function handleKnownError(error, res, next) {
  if (error.status) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  next(error);
}

function createAuthContext(req) {
  return {
    inviteCodeHeader: req.headers["x-invite-code"] || null,
    startParam: req.telegramInitData?.start_param || null,
    startApp: req.telegramInitData?.startapp || null,
    startParamHash: req.telegramInitData?.start_param_hash || null,
    telegramUser: req.telegramInitData?.user || null,
    currentUser: req.currentUser || null,
  };
}

async function getStatus(req, res, next) {
  try {
    const payload = await authService.getStatus(createAuthContext(req));
    res.json(payload);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function register(req, res, next) {
  try {
    const payload = validateRegistrationPayload(req.body);
    const result = await authService.register(createAuthContext(req), payload);
    res.status(201).json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getProfile(req, res, next) {
  try {
    const user = await authService.getProfile(req.currentUser);
    res.json({ user });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function updateProfile(req, res, next) {
  try {
    const payload = validateProfilePayload(req.body);
    const user = await authService.updateProfile(req.currentUser, payload);
    res.json({ user });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function updateTimezone(req, res, next) {
  try {
    const payload = validateTimezonePayload(req.body);
    const result = await authService.updateTimezone(req.currentUser, payload.timezone);
    res.json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getReferences(req, res, next) {
  try {
    const payload = await authService.getReferences();
    res.json(payload);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = {
  getStatus,
  register,
  getProfile,
  updateProfile,
  updateTimezone,
  getReferences,
};
