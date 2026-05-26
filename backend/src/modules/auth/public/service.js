const { normalizeInviteCode } = require("../../../utils/inviteCode");
const { normalizePhoneToE164Ru } = require("../../../utils/phone");
const logger = require("../../../utils/logger");
const { buildAuditEntry, logAuditEvent } = require("../../../services/auditService");
const authRepository = require("./repository");
const settingsService = require("../../../services/settingsService");
const { FEATURE_FLAGS_SETTING_KEY, getDisabledModulesList } = require("../../../config/featureFlags");

const PHONE_MISMATCH_ERROR_MESSAGE = "Номер телефона не совпадает с приглашением";
const PHONE_CONFLICT_ERROR_MESSAGE = "Обнаружен конфликт профилей по номеру телефона. Обратитесь к администратору";
const INVITE_REQUIRED_ERROR_MESSAGE = "Пользователь с таким номером не найден. Нужна ссылка-приглашение от администратора";

function buildError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function maskPhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-4)}`;
}

function resolveInviteCode(context, inviteCodeFromPayload = null) {
  if (inviteCodeFromPayload) {
    return normalizeInviteCode(inviteCodeFromPayload);
  }

  const inviteCodeHeader = context.inviteCodeHeader;
  const inviteParam = context.startParam || context.startApp || context.startParamHash;
  const inviteCodeFromParam = (() => {
    if (!inviteParam) {
      return null;
    }
    const raw = String(inviteParam).trim().toLowerCase();
    if (!raw.startsWith("invite_") && !raw.startsWith("invite-") && !raw.startsWith("code-")) {
      return null;
    }
    return normalizeInviteCode(inviteParam);
  })();

  return inviteCodeHeader || inviteCodeFromParam || null;
}

function verifyInviteContact({ contact, platformUser, clientPlatform }) {
  logger.info("[invite-flow] verifyInviteContact:start", {
    platform: clientPlatform,
    hasContact: Boolean(contact),
    contactSource: contact?.source || null,
    hasPhone: Boolean(contact?.phoneNumber),
    contactPhoneMasked: maskPhone(contact?.phoneNumber),
    hasPlatformUser: Boolean(platformUser?.id),
  });

  if (!contact) {
    logger.warn("[invite-flow] verifyInviteContact:missing_contact", { platform: clientPlatform });
    throw buildError("Для активации по приглашению подтвердите номер телефона", 422);
  }

  if (!platformUser?.id) {
    throw buildError("Отсутствуют данные пользователя платформы", 400);
  }

  const expectedSource = clientPlatform === "max" ? "max_contact" : "telegram_contact";
  if (contact.source !== expectedSource) {
    logger.warn("[invite-flow] verifyInviteContact:invalid_source", {
      platform: clientPlatform,
      expectedSource,
      actualSource: contact.source || null,
    });
    throw buildError("Неподдерживаемый источник подтверждения телефона", 422);
  }

  if (String(contact.userId) !== String(platformUser.id)) {
    logger.warn("[invite-flow] verifyInviteContact:user_mismatch", {
      platform: clientPlatform,
      platformUserId: String(platformUser.id),
      contactUserId: String(contact.userId || ""),
    });
    throw buildError("Контактные данные не прошли проверку подлинности", 403);
  }

  const normalizedPhone = normalizePhoneToE164Ru(contact.phoneNumber);
  if (!normalizedPhone || !/^\+7\d{10}$/.test(normalizedPhone)) {
    logger.warn("[invite-flow] verifyInviteContact:invalid_phone", {
      platform: clientPlatform,
      contactPhoneMasked: maskPhone(contact.phoneNumber),
    });
    throw buildError("Телефон должен быть в формате +7XXXXXXXXXX", 422);
  }

  logger.info("[invite-flow] verifyInviteContact:ok", {
    platform: clientPlatform,
    normalizedPhoneMasked: maskPhone(normalizedPhone),
  });

  return {
    normalizedPhone,
    source: contact.source,
  };
}

async function getDisabledModules() {
  const rawValue = await settingsService.getSetting(FEATURE_FLAGS_SETTING_KEY, "[]");
  return getDisabledModulesList(rawValue);
}

async function getStatus(context) {
  const telegramUser = context.telegramUser;
  const inviteCode = resolveInviteCode(context);
  const hasInviteCode = Boolean(inviteCode && inviteCode.length >= 4);

  logger.info("[auth-flow] getStatus:entry", {
    platform: context.clientPlatform,
    platformUserId: telegramUser?.id ? String(telegramUser.id) : null,
    isLoggedIn: Boolean(context.currentUser),
    hasInviteCode,
  });

  if (context.currentUser) {
    logger.info("[auth-flow] getStatus:already_registered", {
      platform: context.clientPlatform,
      userId: context.currentUser.id,
    });
    const user = await authRepository.getDashboardData(context.currentUser.id);
    const disabledModules = await getDisabledModules();
    return {
      registered: true,
      user,
      disabledModules,
    };
  }

  let invitation = null;
  if (hasInviteCode) {
    invitation = await authRepository.findActiveInvitationByCode(inviteCode);
  }

  const disabledModules = await getDisabledModules();
  return {
    registered: false,
    defaults: {
      firstName: telegramUser?.first_name || "",
      lastName: telegramUser?.last_name || "",
      avatarUrl: telegramUser?.photo_url || null,
    },
    inviteFlow: {
      hasInviteCode,
      inviteCodeValid: Boolean(invitation),
      registrationByInvitationOnly: false,
    },
    invitation: invitation
      ? {
          code: invitation.code,
          roleId: invitation.role_id,
          roleName: invitation.role_name,
          branchId: invitation.branch_id,
          branchName: invitation.branch_name,
          positionId: invitation.position_id,
          positionName: invitation.position_name,
          phone: invitation.phone,
          firstName: invitation.first_name,
          lastName: invitation.last_name,
        }
      : null,
    disabledModules,
  };
}

async function register(context, payload) {
  if (context.currentUser) {
    logger.warn("[auth-flow] register:already_logged_in", {
      platform: context.clientPlatform,
      userId: context.currentUser.id,
    });
    throw buildError("User already registered", 400);
  }

  const platformUser = context.telegramUser;
  const clientPlatform = context.clientPlatform === "max" ? "max" : "telegram";
  if (!platformUser) {
    logger.warn("[auth-flow] register:missing_platform_user", { platform: clientPlatform });
    throw buildError("Missing platform user data", 400);
  }

  const platformUserId = String(platformUser.id);
  const avatarUrl = platformUser.photo_url || null;

  logger.info("[auth-flow] register:entry", {
    platform: clientPlatform,
    platformUserId,
    hasInviteCodeHeader: Boolean(context.inviteCodeHeader),
    hasStartParam: Boolean(context.startParam || context.startApp || context.startParamHash),
    hasContactPayload: Boolean(payload?.contact),
    hasInviteCodePayload: Boolean(payload?.inviteCode),
  });

  const existingUser = await authRepository.findUserByPlatformIdentity(clientPlatform, platformUserId);

  if (existingUser) {
    logger.warn("[auth-flow] register:already_registered", {
      platform: clientPlatform,
      platformUserId,
      existingUserId: existingUser.id,
    });
    throw buildError("Вы уже зарегистрированы в системе", 400);
  }

  const inviteCode = resolveInviteCode(context, payload.inviteCode);
  logger.info("[invite-flow] register:start", {
    platform: clientPlatform,
    platformUserId,
    hasInviteCode: Boolean(inviteCode),
    hasContactPayload: Boolean(payload?.contact),
  });

  if (inviteCode) {
    // Поток приглашения сотрудника
    const invitation = await authRepository.findActiveInvitationByCode(inviteCode);
    if (!invitation) {
      logger.warn("[invite-flow] register:invitation_not_found", { platform: clientPlatform, inviteCode });
      throw buildError("Приглашение недействительно или истекло", 400);
    }

    const verification = verifyInviteContact({
      contact: payload.contact,
      platformUser,
      clientPlatform,
    });

    const invitationPhone = normalizePhoneToE164Ru(invitation.phone);
    logger.info("[invite-flow] register:phone_compare", {
      platform: clientPlatform,
      inviteId: invitation.id,
      invitationPhoneMasked: maskPhone(invitationPhone),
      providedPhoneMasked: maskPhone(verification.normalizedPhone),
    });
    if (!invitationPhone || invitationPhone !== verification.normalizedPhone) {
      logger.warn("[invite-flow] register:phone_mismatch", {
        platform: clientPlatform,
        inviteId: invitation.id,
        invitationPhoneMasked: maskPhone(invitationPhone),
        providedPhoneMasked: maskPhone(verification.normalizedPhone),
      });
      if (invitation.invited_user_id) {
        await authRepository.markPhoneVerificationRejected(invitation.invited_user_id, {
          phoneE164: verification.normalizedPhone,
          source: verification.source,
        });
      }

      await logAuditEvent(
        buildAuditEntry({
          scope: "miniapp",
          action: "invite.phone_verification.failed",
          entity: "invitation",
          entityId: invitation.id,
          actor: {
            id: invitation.invited_user_id || null,
            role: null,
            name: `${invitation.first_name || ""} ${invitation.last_name || ""}`.trim() || null,
          },
          metadata: {
            platformUserId,
            platform: clientPlatform,
            inviteCode: invitation.code,
            invitationPhone,
            providedPhone: verification.normalizedPhone,
            reason: "phone_mismatch",
          },
          result: "failure",
        }),
      );

      throw buildError(PHONE_MISMATCH_ERROR_MESSAGE, 403);
    }

    const linkedUsers = await authRepository.findVerifiedActiveUsersByPhoneE164(verification.normalizedPhone);
    const linkCandidates = linkedUsers.filter((candidate) => Number(candidate.id) !== Number(invitation.invited_user_id || 0));
    logger.info("[invite-flow] register:auto_link_candidates", {
      platform: clientPlatform,
      inviteId: invitation.id,
      candidatesCount: linkCandidates.length,
      candidates: linkCandidates.map((candidate) => candidate.id),
    });

    if (linkCandidates.length > 1) {
      await logAuditEvent(
        buildAuditEntry({
          scope: "miniapp",
          action: "identity.auto_link.conflict",
          entity: "invitation",
          entityId: invitation.id,
          actor: {
            id: invitation.invited_user_id || null,
            role: null,
            name: `${invitation.first_name || ""} ${invitation.last_name || ""}`.trim() || null,
          },
          metadata: {
            platformUserId,
            platform: clientPlatform,
            inviteCode: invitation.code,
            phoneE164: verification.normalizedPhone,
            candidates: linkCandidates.map((candidate) => candidate.id),
          },
          result: "failure",
        }),
      );
      throw buildError(PHONE_CONFLICT_ERROR_MESSAGE, 409);
    }

    if (linkCandidates.length === 1) {
      const targetUserId = Number(linkCandidates[0].id);
      await authRepository.upsertPlatformIdentity({
        userId: targetUserId,
        platform: clientPlatform,
        platformUserId,
        platformUsername: platformUser.username || null,
        isVerified: true,
        verifiedAt: new Date(),
      });
      const usedRows = await authRepository.markInvitationUsed(invitation.id, targetUserId);
      if (usedRows === 0) {
        logger.warn("[invite-flow] register:invite_already_used_auto_link", {
          platform: clientPlatform,
          inviteId: invitation.id,
          targetUserId,
        });
        throw buildError("Приглашение уже использовано в другом сеансе", 409);
      }
      const user = await authRepository.getDashboardData(targetUserId);

      await logAuditEvent(
        buildAuditEntry({
          scope: "miniapp",
          action: "identity.auto_link.succeeded",
          entity: "invitation",
          entityId: invitation.id,
          actor: { id: user.id, role: user.roleName, name: `${user.firstName} ${user.lastName}` },
          metadata: {
            platformUserId,
            platform: clientPlatform,
            inviteCode: invitation.code,
            phoneE164: verification.normalizedPhone,
            source: verification.source,
          },
        }),
      );

      const disabledModules = await getDisabledModules();
      return { registered: true, user, disabledModules };
    }

    // Если у приглашения есть заранее созданный pending-профиль — активируем его
    if (invitation.invited_user_id) {
      const affectedRows = await authRepository.activatePendingUser(invitation.invited_user_id, {
        telegramId: clientPlatform === "telegram" ? platformUserId : null,
        avatarUrl,
      });
      if (affectedRows === 0) {
        logger.warn("[invite-flow] register:pending_already_activated", {
          platform: clientPlatform,
          inviteId: invitation.id,
          pendingUserId: invitation.invited_user_id,
        });
        throw buildError("Профиль уже активирован в другом сеансе", 409);
      }
      await authRepository.markPhoneVerified(invitation.invited_user_id, {
        phoneE164: verification.normalizedPhone,
        source: verification.source,
      });
      await authRepository.upsertPlatformIdentity({
        userId: invitation.invited_user_id,
        platform: clientPlatform,
        platformUserId,
        platformUsername: platformUser.username || null,
        isVerified: true,
        verifiedAt: new Date(),
      });
      logger.info("[invite-flow] register:pending_activated", {
        platform: clientPlatform,
        platformUserId,
        userId: invitation.invited_user_id,
        inviteId: invitation.id,
        phoneMasked: maskPhone(verification.normalizedPhone),
      });
      await authRepository.completeOnboarding(invitation.invited_user_id);
      await authRepository.assignUserToMatchingAssessments({
        userId: invitation.invited_user_id,
        branchId: invitation.branch_id ? Number(invitation.branch_id) : null,
        positionId: invitation.position_id ? Number(invitation.position_id) : null,
      });
      const usedRows = await authRepository.markInvitationUsed(invitation.id, invitation.invited_user_id);
      if (usedRows === 0) {
        logger.warn("[invite-flow] register:invite_already_used_pending", {
          platform: clientPlatform,
          inviteId: invitation.id,
          pendingUserId: invitation.invited_user_id,
        });
        throw buildError("Приглашение уже использовано в другом сеансе", 409);
      }
      const user = await authRepository.getDashboardData(invitation.invited_user_id);

      await logAuditEvent(
        buildAuditEntry({
          scope: "miniapp",
          action: "invite.phone_verification.succeeded",
          entity: "invitation",
          entityId: invitation.id,
          actor: { id: user.id, role: user.roleName, name: `${user.firstName} ${user.lastName}` },
          metadata: {
            platformUserId,
            platform: clientPlatform,
            inviteCode: invitation.code,
            phoneE164: verification.normalizedPhone,
            source: verification.source,
          },
        }),
      );

      const auditEntry = buildAuditEntry({
        scope: "miniapp",
        action: "user.registered",
        entity: "user",
        entityId: user.id,
        actor: { id: user.id, role: user.roleName, name: `${user.firstName} ${user.lastName}` },
        metadata: { branch: user.branchName, role: user.roleName, platformUserId, platform: clientPlatform, invitedBy: invitation.created_by },
      });
      await logAuditEvent(auditEntry);

      const disabledModules = await getDisabledModules();
      return { registered: true, user, disabledModules };
    }

    throw buildError("Приглашение не готово к активации: отсутствует pending-профиль", 409);
  }

  // Поток без приглашения: только подтверждение телефона и auto-link.
  logger.info("[auth-flow] register:no_invite_start", {
    platform: clientPlatform,
    platformUserId,
    hasContact: Boolean(payload?.contact),
    rawPhoneMasked: maskPhone(payload?.contact?.phoneNumber),
    contactSource: payload?.contact?.source || null,
  });

  if (!payload?.contact) {
    throw buildError("Для входа без приглашения подтвердите номер телефона", 422);
  }

  const verification = verifyInviteContact({
    contact: payload.contact,
    platformUser,
    clientPlatform,
  });

  const linkedUsers = await authRepository.findVerifiedActiveUsersByPhoneE164(verification.normalizedPhone);
  logger.info("[auth-flow] register:no_invite_auto_link_candidates", {
    platform: clientPlatform,
    normalizedPhoneMasked: maskPhone(verification.normalizedPhone),
    candidatesCount: linkedUsers.length,
    candidates: linkedUsers.map((candidate) => candidate.id),
  });

  if (linkedUsers.length > 1) {
    await logAuditEvent(
      buildAuditEntry({
        scope: "miniapp",
        action: "identity.auto_link.conflict",
        entity: "user",
        entityId: null,
        actor: {
          id: null,
          role: null,
          name: `${payload.firstName || ""} ${payload.lastName || ""}`.trim() || null,
        },
        metadata: {
          platformUserId,
          platform: clientPlatform,
          phoneE164: verification.normalizedPhone,
          candidates: linkedUsers.map((candidate) => candidate.id),
          reason: "no_invite",
        },
        result: "failure",
      }),
    );
    throw buildError(PHONE_CONFLICT_ERROR_MESSAGE, 409);
  }

  if (linkedUsers.length === 0) {
    await logAuditEvent(
      buildAuditEntry({
        scope: "miniapp",
        action: "identity.auto_link.not_found",
        entity: "user",
        entityId: null,
        actor: {
          id: null,
          role: null,
          name: `${payload.firstName || ""} ${payload.lastName || ""}`.trim() || null,
        },
        metadata: {
          platformUserId,
          platform: clientPlatform,
          phoneE164: verification.normalizedPhone,
          reason: "no_invite",
        },
        result: "failure",
      }),
    );
    throw buildError(INVITE_REQUIRED_ERROR_MESSAGE, 403);
  }

  const targetUserId = Number(linkedUsers[0].id);
  await authRepository.upsertPlatformIdentity({
    userId: targetUserId,
    platform: clientPlatform,
    platformUserId,
    platformUsername: platformUser.username || null,
    isVerified: true,
    verifiedAt: new Date(),
  });
  const user = await authRepository.getDashboardData(targetUserId);

  await logAuditEvent(
    buildAuditEntry({
      scope: "miniapp",
      action: "identity.auto_link.succeeded",
      entity: "user",
      entityId: targetUserId,
      actor: { id: user.id, role: user.roleName, name: `${user.firstName} ${user.lastName}` },
      metadata: {
        platformUserId,
        platform: clientPlatform,
        phoneE164: verification.normalizedPhone,
        source: verification.source,
        reason: "no_invite",
      },
    }),
  );

  const disabledModules = await getDisabledModules();
  return { registered: true, user, disabledModules };
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
  const [branches, positions, roles] = await Promise.all([authRepository.getBranches(), authRepository.getPositions(), authRepository.getRoles()]);

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
  getDisabledModules,
};
