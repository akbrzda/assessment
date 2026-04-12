const badgesController = require("../../../controllers/badgesController");

module.exports = {
  getBadges: badgesController.getBadges,
  getBadgeById: badgesController.getBadgeById,
  createBadge: badgesController.createBadge,
  updateBadge: badgesController.updateBadge,
  uploadBadgeIcon: badgesController.uploadBadgeIcon,
  deleteBadge: badgesController.deleteBadge,
  reorderBadges: badgesController.reorderBadges,
};
