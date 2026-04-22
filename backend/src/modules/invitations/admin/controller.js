const invitationsService = require("./service");
const {
  parseInvitationId,
  validateCreatePayload,
  validateUpdatePayload,
  validateExtendPayload,
} = require("./validators");

function handleKnownError(error, res, next) {
  if (error.status) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  next(error);
}

async function listInvitations(req, res, next) {
  try {
    const invitations = await invitationsService.listInvitations(req.user);
    res.json({ invitations });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function createInvitation(req, res, next) {
  try {
    const payload = validateCreatePayload(req.body);
    const result = await invitationsService.createInvitation(payload, req.user, req);
    res.status(201).json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function updateInvitation(req, res, next) {
  try {
    const invitationId = parseInvitationId(req.params.id);
    const payload = validateUpdatePayload(req.body);
    const result = await invitationsService.updateInvitation(
      invitationId,
      payload,
      req.user,
      req
    );
    res.json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function extendInvitation(req, res, next) {
  try {
    const invitationId = parseInvitationId(req.params.id);
    const payload = validateExtendPayload(req.body);
    const result = await invitationsService.extendInvitation(
      invitationId,
      payload.days,
      req.user,
      req
    );
    res.json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function deleteInvitation(req, res, next) {
  try {
    const invitationId = parseInvitationId(req.params.id);
    await invitationsService.deleteInvitation(invitationId, req.user, req);
    res.status(204).send();
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = {
  listInvitations,
  createInvitation,
  updateInvitation,
  extendInvitation,
  deleteInvitation,
};
