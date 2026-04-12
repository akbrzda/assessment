const handlers = require("./invitations.handlers.js");
const { runLegacyHandler } = require("../shared/legacy-handler-adapter");

async function listInvitations(req) {
  return runLegacyHandler(handlers.listInvitations, req);
}

async function createInvitation(req) {
  return runLegacyHandler(handlers.createInvitation, req);
}

async function updateInvitation(req) {
  return runLegacyHandler(handlers.updateInvitation, req);
}

async function extendInvitation(req) {
  return runLegacyHandler(handlers.extendInvitation, req);
}

async function deleteInvitation(req) {
  return runLegacyHandler(handlers.deleteInvitation, req);
}

module.exports = {
  listInvitations,
  createInvitation,
  updateInvitation,
  extendInvitation,
  deleteInvitation,
};
