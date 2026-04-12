const config = require("../../../config/env");
const { generateInviteCode } = require("../../../utils/tokenGenerator");
const { createLog } = require("../../../services/adminLogService");
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

function ensureAccess(actor, invitation) {
  if (actor.role !== "superadmin" && invitation.created_by !== actor.id) {
    throw buildError("Access denied", 403);
  }
}

function ensureUnused(invitation, action) {
  if (invitation.used_by) {
    throw buildError(`Cannot ${action} used invitation`, 400);
  }
}

async function listInvitations(actor) {
  if (actor.role === "superadmin") {
    return invitationsRepository.findAll();
  }

  if (actor.role === "manager") {
    return invitationsRepository.findByCreator(actor.id);
  }

  throw buildError("Access denied", 403);
}

async function createInvitation(payload, actor, req) {
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

  await createLog(
    actor.id,
    "CREATE",
    `Создано приглашение для ${payload.firstName} ${payload.lastName} (код: ${code})`,
    "invitation",
    invitationId,
    req
  );

  const invitation = await invitationsRepository.findById(invitationId);
  return { invitation, message: "Приглашение создано успешно" };
}

async function updateInvitation(invitationId, payload, actor, req) {
  const invitation = await invitationsRepository.findById(invitationId);
  if (!invitation) {
    throw buildError("Invitation not found", 404);
  }

  ensureAccess(actor, invitation);
  ensureUnused(invitation, "update");

  await invitationsRepository.updateInvitation(invitationId, {
    firstName: payload.firstName,
    lastName: payload.lastName,
    branchId: payload.branchId,
  });

  await createLog(
    actor.id,
    "UPDATE",
    `Обновлено приглашение: ${payload.firstName} ${payload.lastName} (код: ${invitation.code})`,
    "invitation",
    invitationId,
    req
  );

  const updated = await invitationsRepository.findById(invitationId);
  return { invitation: updated, message: "Приглашение обновлено успешно" };
}

async function extendInvitation(invitationId, days, actor, req) {
  const invitation = await invitationsRepository.findById(invitationId);
  if (!invitation) {
    throw buildError("Invitation not found", 404);
  }

  ensureAccess(actor, invitation);
  ensureUnused(invitation, "extend");

  const expiresAt = new Date(invitation.expires_at);
  expiresAt.setDate(expiresAt.getDate() + days);
  await invitationsRepository.updateExpiration(invitationId, expiresAt);

  await createLog(
    actor.id,
    "UPDATE",
    `Продлено приглашение на ${days} дней (код: ${invitation.code})`,
    "invitation",
    invitationId,
    req
  );

  const updated = await invitationsRepository.findById(invitationId);
  return { invitation: updated, message: "Приглашение продлено успешно" };
}

async function deleteInvitation(invitationId, actor, req) {
  const invitation = await invitationsRepository.findById(invitationId);
  if (!invitation) {
    throw buildError("Invitation not found", 404);
  }

  ensureAccess(actor, invitation);
  ensureUnused(invitation, "delete");

  await invitationsRepository.removeInvitation(invitationId);

  await createLog(
    actor.id,
    "DELETE",
    `Удалено приглашение: ${invitation.first_name} ${invitation.last_name} (код: ${invitation.code})`,
    "invitation",
    invitationId,
    req
  );
}

module.exports = {
  listInvitations,
  createInvitation,
  updateInvitation,
  extendInvitation,
  deleteInvitation,
};

