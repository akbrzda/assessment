const config = require("../../../config/env");
const { normalizeInviteCode } = require("../../../utils/inviteCode");
const { buildAuditEntry, logAuditEvent } = require("../../../services/auditService");
const authRepository = require("./repository");

function buildError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function resolveInviteCode(context, fallbackInviteCode = null) {
  if (fallbackInviteCode) {
    return normalizeInviteCode(fallbackInviteCode);
  }

  const inviteCodeHeader = context.inviteCodeHeader;
  const inviteParam = context.startParam || context.startApp || context.startParamHash;
  const inviteCodeFromParam = normalizeInviteCode(inviteParam);

  return inviteCodeHeader || inviteCodeFromParam || null;
}

async function getStatus(context) {
  const telegramUser = context.telegramUser;
  const inviteCode = resolveInviteCode(context);

  if (context.currentUser) {
    const user = await authRepository.getDashboardData(context.currentUser.id);
    return {
      registered: true,
      user,
    };
  }

  let invitation = null;
  if (inviteCode && inviteCode.length >= 4) {
    invitation = await authRepository.findActiveInvitationByCode(inviteCode);
  }

  return {
    registered: false,
    defaults: {
      firstName: telegramUser?.first_name || "",
      lastName: telegramUser?.last_name || "",
      avatarUrl: telegramUser?.photo_url || null,
    },
    invitation: invitation
      ? {
          code: invitation.code,
          roleId: invitation.role_id,
          roleName: invitation.role_name,
          branchId: invitation.branch_id,
          branchName: invitation.branch_name,
          firstName: invitation.first_name,
          lastName: invitation.last_name,
          expiresAt: invitation.expires_at,
        }
      : null,
  };
}

async function register(context, payload) {
  if (context.currentUser) {
    throw buildError("User already registered", 400);
  }

  const telegramUser = context.telegramUser;
  if (!telegramUser) {
    throw buildError("Missing Telegram user data", 400);
  }

  const telegramId = String(telegramUser.id);
  const avatarUrl = telegramUser.photo_url || null;
  const existingUser = await authRepository.findUserByTelegramId(telegramId);

  if (existingUser) {
    throw buildError("User already registered", 400);
  }

  let targetRoleId;
  let targetBranchId = payload.branchId;
  let targetPositionId = payload.positionId ? Number(payload.positionId) : null;
  let invitation = null;
  let managerPosition = null;

  const inviteCode = resolveInviteCode(context, payload.inviteCode);
  if (inviteCode) {
    invitation = await authRepository.findActiveInvitationByCode(inviteCode);
    if (!invitation) {
      throw buildError("Invitation code is invalid or expired", 400);
    }

    targetRoleId = invitation.role_id;
    if (invitation.branch_id) {
      targetBranchId = invitation.branch_id;
    }

    managerPosition = await authRepository.getPositionByName("Управляющий");
    if (!managerPosition) {
      throw buildError("Manager position not configured", 500);
    }

    targetPositionId = managerPosition.id;
  }

  if (!invitation && !targetPositionId) {
    throw buildError("Position is required for registration without invitation", 422);
  }

  const superAdminIds = config.superAdminIds || [];
  if (!targetRoleId && superAdminIds.includes(telegramId)) {
    const superRole = await authRepository.getRoleByName("superadmin");
    if (!superRole) {
      throw buildError("Superadmin role not configured", 500);
    }
    targetRoleId = superRole.id;
  }

  if (!targetRoleId) {
    const defaultRole = await authRepository.getRoleByName("employee");
    if (!defaultRole) {
      throw buildError("Default role not configured", 500);
    }
    targetRoleId = defaultRole.id;
  }

  const [branchRecord, positionRecord, roleRecord] = await Promise.all([
    authRepository.getBranchById(targetBranchId),
    authRepository.getPositionById(targetPositionId),
    authRepository.getRoleById(targetRoleId),
  ]);

  if (!branchRecord) {
    throw buildError("Branch does not exist", 400);
  }

  if (!positionRecord) {
    throw buildError("Position does not exist", 400);
  }

  if (!roleRecord) {
    throw buildError("Role does not exist", 400);
  }

  const userId = await authRepository.createUser({
    telegramId,
    firstName: payload.firstName,
    lastName: payload.lastName,
    avatarUrl,
    positionId: Number(targetPositionId),
    branchId: targetBranchId,
    roleId: targetRoleId,
  });

  await authRepository.assignUserToMatchingAssessments({
    userId,
    branchId: targetBranchId ? Number(targetBranchId) : null,
    positionId: targetPositionId ? Number(targetPositionId) : null,
  });

  if (invitation) {
    await authRepository.markInvitationUsed(invitation.id, userId);
  }

  const user = await authRepository.getDashboardData(userId);

  const auditEntry = buildAuditEntry({
    scope: "miniapp",
    action: "user.registered",
    entity: "user",
    entityId: user.id,
    actor: {
      id: user.id,
      role: user.roleName,
      name: `${user.firstName} ${user.lastName}`,
    },
    metadata: {
      branch: user.branchName,
      role: user.roleName,
      telegramId,
      invitedBy: invitation ? invitation.created_by : null,
    },
  });
  await logAuditEvent(auditEntry);

  return {
    registered: true,
    user,
  };
}

async function getProfile(currentUser) {
  if (!currentUser) {
    throw buildError("User not found", 404);
  }

  return authRepository.getDashboardData(currentUser.id);
}

async function updateProfile(currentUser, payload) {
  if (!currentUser) {
    throw buildError("User not found", 404);
  }

  await authRepository.updateProfile(currentUser.id, payload);
  const user = await authRepository.getDashboardData(currentUser.id);

  const auditEntry = buildAuditEntry({
    scope: "miniapp",
    action: "user.profile.updated",
    entity: "user",
    entityId: currentUser.id,
    actor: {
      id: currentUser.id,
      role: user.roleName,
      name: `${user.firstName} ${user.lastName}`,
    },
    metadata: {
      telegramId: currentUser.telegramId,
    },
  });
  await logAuditEvent(auditEntry);

  return user;
}

async function updateTimezone(currentUser, timezone) {
  if (!currentUser) {
    throw buildError("User not found", 404);
  }

  await authRepository.updateTimezone(currentUser.id, timezone);
  return { success: true };
}

async function completeOnboarding(currentUser) {
  if (!currentUser) {
    throw buildError("User not found", 404);
  }

  await authRepository.completeOnboarding(currentUser.id);
  const user = await authRepository.getDashboardData(currentUser.id);

  return {
    success: true,
    onboardingCompletedAt: user?.onboardingCompletedAt || null,
  };
}

async function getReferences() {
  const [branches, positions, roles] = await Promise.all([
    authRepository.getBranches(),
    authRepository.getPositions(),
    authRepository.getRoles(),
  ]);

  return { branches, positions, roles };
}

module.exports = {
  getStatus,
  register,
  getProfile,
  updateProfile,
  updateTimezone,
  completeOnboarding,
  getReferences,
};
