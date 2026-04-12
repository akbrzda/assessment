async function createAdminLog() {
  // Временный адаптер для сохранения текущего поведения без legacy-контроллера.
  return Promise.resolve();
}

module.exports = {
  createAdminLog,
};
