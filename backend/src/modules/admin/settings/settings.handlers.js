const adminSettingsController = require("../../../controllers/adminSettingsController");

module.exports = {
  getSettings: adminSettingsController.getSettings,
  getSettingByKey: adminSettingsController.getSettingByKey,
  createSetting: adminSettingsController.createSetting,
  updateSetting: adminSettingsController.updateSetting,
  deleteSetting: adminSettingsController.deleteSetting,
};
