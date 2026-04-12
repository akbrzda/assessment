const invitationController = require("../../../controllers/adminInvitationController");

module.exports = {
  listInvitations: invitationController.listInvitations,
  createInvitation: invitationController.createInvitation,
  updateInvitation: invitationController.updateInvitation,
  extendInvitation: invitationController.extendInvitation,
  deleteInvitation: invitationController.deleteInvitation,
};
