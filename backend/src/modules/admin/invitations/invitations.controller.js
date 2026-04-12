const invitationsService = require("./invitations.service");
const { sendLegacyResult } = require("../shared/legacy-handler-adapter");

async function listInvitations(req, res, next) {
  try {
    const result = await invitationsService.listInvitations(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function createInvitation(req, res, next) {
  try {
    const result = await invitationsService.createInvitation(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function updateInvitation(req, res, next) {
  try {
    const result = await invitationsService.updateInvitation(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function extendInvitation(req, res, next) {
  try {
    const result = await invitationsService.extendInvitation(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function deleteInvitation(req, res, next) {
  try {
    const result = await invitationsService.deleteInvitation(req);
    return sendLegacyResult(res, result);
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
