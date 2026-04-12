const invitationsService = require("./service");
const {
  parseInvitationId,
  validateCreatePayload,
  validateExtendPayload,
  validateUpdatePayload,
} = require("./validators");

function formatErrorPayload(error) {
  return { error: error.message };
}

function ensureInvitationId(rawId) {
  const invitationId = parseInvitationId(rawId);
  if (invitationId) {
    return invitationId;
  }

  const error = new Error("Invitation not found");
  error.status = 404;
  throw error;
}

async function create(req, res, next) {
  try {
    const payload = validateCreatePayload(req.body);
    const invitation = await invitationsService.createInvitation(payload, req.currentUser);
    res.status(201).json({ invitation });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json(formatErrorPayload(error));
    }
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const invitations = await invitationsService.listInvitations(req.currentUser);
    res.json({ invitations });
  } catch (error) {
    next(error);
  }
}

async function extend(req, res, next) {
  try {
    const invitationId = ensureInvitationId(req.params.id);
    const payload = validateExtendPayload(req.body);
    const invitation = await invitationsService.extendInvitation(
      invitationId,
      payload.days,
      req.currentUser
    );
    res.json({ invitation });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json(formatErrorPayload(error));
    }
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const invitationId = ensureInvitationId(req.params.id);
    await invitationsService.removeInvitation(invitationId, req.currentUser);
    res.status(204).send();
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json(formatErrorPayload(error));
    }
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const invitationId = ensureInvitationId(req.params.id);
    const payload = validateUpdatePayload(req.body);
    const invitation = await invitationsService.updateInvitation(
      invitationId,
      payload,
      req.currentUser
    );
    res.json({ invitation });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json(formatErrorPayload(error));
    }
    next(error);
  }
}

module.exports = {
  create,
  list,
  extend,
  remove,
  update,
};
