function buildValidationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function validateLoginPayload(payload) {
  const login = payload?.login;
  const password = payload?.password;

  if (!login || !password) {
    throw buildValidationError("Логин и пароль обязательны");
  }

  return { login, password };
}

module.exports = {
  validateLoginPayload,
};
