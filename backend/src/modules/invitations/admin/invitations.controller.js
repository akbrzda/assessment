const handlers = require("./invitations.handlers");

async function listInvitations(req, res, next) {
  try {
    return await handlers.listInvitations(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function createInvitation(req, res, next) {
  try {
    return await handlers.createInvitation(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function updateInvitation(req, res, next) {
  try {
    return await handlers.updateInvitation(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function extendInvitation(req, res, next) {
  try {
    return await handlers.extendInvitation(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function deleteInvitation(req, res, next) {
  try {
    return await handlers.deleteInvitation(req, res, next);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listInvitations,
  createInvitation,
  updateInvitation,
  extendInvitation,
  deleteInvitation,
};
