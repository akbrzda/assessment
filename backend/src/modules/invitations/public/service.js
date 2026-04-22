const config = require("../../../config/env");
const { generateInviteCode } = require("../../../utils/tokenGenerator");
const invitationsRepository = require("./repository");

function buildError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function ensureUniqueCode() {
  for (let index = 0; index < 5; index += 1) {
    const code = generateInviteCode();
    const existing = await invitationsRepository.findActiveByCode(code);
    if (!existing) {
      return code;
    }
  }

  throw buildError("Unable to generate unique invitation code", 500);
}

async function createInvitation(payload, actor) {
  const managerRole = await invitationsRepository.findManagerRole();
  if (!managerRole) {
    throw buildError("Manager role not configured", 500);
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.inviteExpirationDays);

  const code = await ensureUniqueCode();
  const invitationId = await invitationsRepository.createInvitation({
    code,
    roleId: managerRole.id,
    branchId: payload.branchId,
    firstName: payload.firstName,
    lastName: payload.lastName,
    expiresAt,
    createdBy: actor.id,
  });

  return invitationsRepository.findById(invitationId);
}

async function listInvitations(actor) {
  return invitationsRepository.listByCreator(actor.id);
}

async function extendInvitation(invitationId, days, actor) {
  const invitation = await invitationsRepository.findById(invitationId);
  if (!invitation || invitation.created_by !== actor.id) {
    throw buildError("Invitation not found", 404);
  }

  if (invitation.used_by) {
    throw buildError("Invitation already used", 400);
  }

  const expiresAt = new Date(invitation.expires_at);
  expiresAt.setDate(expiresAt.getDate() + days);
  await invitationsRepository.updateExpiration(invitationId, expiresAt);

  return invitationsRepository.findById(invitationId);
}

async function removeInvitation(invitationId, actor) {
  const invitation = await invitationsRepository.findById(invitationId);
  if (!invitation || invitation.created_by !== actor.id) {
    throw buildError("Invitation not found", 404);
  }

  if (invitation.used_by) {
    throw buildError("Used invitation cannot be deleted", 400);
  }

  await invitationsRepository.deleteInvitation(invitationId);
}

async function updateInvitation(invitationId, payload, actor) {
  const invitation = await invitationsRepository.findById(invitationId);
  if (!invitation || invitation.created_by !== actor.id) {
    throw buildError("Invitation not found", 404);
  }

  if (invitation.used_by) {
    throw buildError("Used invitation cannot be edited", 400);
  }

  await invitationsRepository.updateInvitation(invitationId, {
    firstName: payload.firstName,
    lastName: payload.lastName,
    branchId: payload.branchId,
  });

  return invitationsRepository.findById(invitationId);
}

module.exports = {
  createInvitation,
  listInvitations,
  extendInvitation,
  removeInvitation,
  updateInvitation,
};


