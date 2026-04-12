function ensureCurrentUser(currentUser) {
  if (currentUser) {
    return currentUser;
  }

  const error = new Error("Требуется авторизация");
  error.status = 401;
  throw error;
}

module.exports = {
  ensureCurrentUser,
};
