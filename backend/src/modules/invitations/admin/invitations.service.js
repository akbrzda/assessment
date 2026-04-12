const handlers = require("./invitations.handlers.js");

async function listInvitations(req, res, next) {
  return handlers.listInvitations(req, res, next);
}

async function createInvitation(req, res, next) {
  return handlers.createInvitation(req, res, next);
}

async function updateInvitation(req, res, next) {
  return handlers.updateInvitation(req, res, next);
}

async function extendInvitation(req, res, next) {
  return handlers.extendInvitation(req, res, next);
}

async function deleteInvitation(req, res, next) {
  return handlers.deleteInvitation(req, res, next);
}

module.exports = {
  listInvitations,
  createInvitation,
  updateInvitation,
  extendInvitation,
  deleteInvitation,
};
