const Joi = require("joi");
const userModel = require("../models/userModel");
const assessmentModel = require("../models/assessmentModel");
const referenceModel = require("../models/referenceModel");
const invitationModel = require("../models/invitationModel");
const { normalizeInviteCode } = require("../utils/inviteCode");
const { buildAuditEntry, logAuditEvent } = require("../services/auditService");
const config = require("../config/env");

const registrationSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(64).required(),
  lastName: Joi.string().trim().min(2).max(64).required(),
  positionId: Joi.number().integer().positive().optional().allow(null),
  branchId: Joi.number().integer().positive().required(),
  inviteCode: Joi.string().trim().allow("", null),
});

const profileUpdateSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(64).required(),
  lastName: Joi.string().trim().min(2).max(64).required(),
});

async function getStatus(req, res, next) {
  try {
    const telegramUser = req.telegramInitData?.user;

    // Проверяем код приглашения в разных местах:
    // 1. Из заголовка x-invite-code (для startapp)
    // 2. Из initData (для start параметра)
    const inviteCodeHeader = req.headers["x-invite-code"];
    const inviteParam = req.telegramInitData?.start_param || req.telegramInitData?.startapp || req.telegramInitData?.start_param_hash;
    const inviteCodeFromParam = normalizeInviteCode(inviteParam);
    const inviteCode = inviteCodeHeader || inviteCodeFromParam;

    console.log("🔍 authController.getStatus - Проверка параметров:", {
      telegramUserId: telegramUser?.id,
      inviteCodeHeader,
      inviteParam,
      inviteCodeFromParam,
      finalInviteCode: inviteCode,
      initDataKeys: Object.keys(req.telegramInitData || {}),
    });

    if (req.currentUser) {
      const dashboard = await userModel.getDashboardData(req.currentUser.id);
      return res.json({
        registered: true,
        user: dashboard,
      });
    }

    let invitation = null;
    if (inviteCode && inviteCode.length >= 4) {
      invitation = await invitationModel.findActiveByCode(inviteCode);
      console.log("📩 Найдено приглашение:", invitation ? `код ${invitation.code}` : "не найдено");
    }

    res.json({
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
    });
  } catch (error) {
    next(error);
  }
}

async function register(req, res, next) {
  try {
    if (req.currentUser) {
      return res.status(400).json({ error: "User already registered" });
    }

    const { error, value } = registrationSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    const telegramUser = req.telegramInitData?.user;
    if (!telegramUser) {
      return res.status(400).json({ error: "Missing Telegram user data" });
    }

    const telegramId = String(telegramUser.id);
    const avatarUrl = telegramUser.photo_url || null;

    const existing = await userModel.findByTelegramId(telegramId);
    if (existing) {
      return res.status(400).json({ error: "User already registered" });
    }

    let targetRoleId;
    let targetBranchId = value.branchId;
    let targetPositionId = value.positionId ? Number(value.positionId) : null;
    let invitation = null;

    let managerPosition = null;

    if (value.inviteCode) {
      const code = normalizeInviteCode(value.inviteCode);
      invitation = await invitationModel.findActiveByCode(code);
      if (!invitation) {
        return res.status(400).json({ error: "Invitation code is invalid or expired" });
      }
      targetRoleId = invitation.role_id;
      if (invitation.branch_id) {
        targetBranchId = invitation.branch_id;
      }
      managerPosition = await referenceModel.getPositionByName("Управляющий");
      if (!managerPosition) {
        return res.status(500).json({ error: "Manager position not configured" });
      }
      targetPositionId = managerPosition.id;
    } else {
      const inviteParam = req.telegramInitData?.start_param || req.telegramInitData?.startapp || req.telegramInitData?.start_param_hash;
      const code = normalizeInviteCode(inviteParam);
      if (code) {
        invitation = await invitationModel.findActiveByCode(code);
        if (!invitation) {
          return res.status(400).json({ error: "Invitation code is invalid or expired" });
        }
        targetRoleId = invitation.role_id;
        if (invitation.branch_id) {
          targetBranchId = invitation.branch_id;
        }
        managerPosition = managerPosition || (await referenceModel.getPositionByName("Управляющий"));
        if (!managerPosition) {
          return res.status(500).json({ error: "Manager position not configured" });
        }
        targetPositionId = managerPosition.id;
      }
    }

    // Если нет приглашения и не указана должность - ошибка
    if (!invitation && !targetPositionId) {
      return res.status(422).json({ error: "Position is required for registration without invitation" });
    }

    const superAdminIds = config.superAdminIds || [];

    if (!targetRoleId && superAdminIds.includes(telegramId)) {
      const superRole = await referenceModel.getRoleByName("superadmin");
      if (!superRole) {
        return res.status(500).json({ error: "Superadmin role not configured" });
      }
      targetRoleId = superRole.id;
    }

    if (!targetRoleId) {
      const defaultRole = await referenceModel.getRoleByName("employee");
      if (!defaultRole) {
        return res.status(500).json({ error: "Default role not configured" });
      }
      targetRoleId = defaultRole.id;
    }

    const branchRecord = await referenceModel.getBranchById(targetBranchId);
    if (!branchRecord) {
      return res.status(400).json({ error: "Branch does not exist" });
    }

    const positionRecord = await referenceModel.getPositionById(targetPositionId);
    if (!positionRecord) {
      return res.status(400).json({ error: "Position does not exist" });
    }

    const roleRecord = await referenceModel.getRoleById(targetRoleId);
    if (!roleRecord) {
      return res.status(400).json({ error: "Role does not exist" });
    }

    const userId = await userModel.createUser({
      telegramId,
      firstName: value.firstName,
      lastName: value.lastName,
      avatarUrl,
      positionId: Number(targetPositionId),
      branchId: targetBranchId,
      roleId: targetRoleId,
    });

    await assessmentModel.assignUserToMatchingAssessments({
      userId,
      branchId: targetBranchId ? Number(targetBranchId) : null,
      positionId: targetPositionId ? Number(targetPositionId) : null,
    });

    if (invitation) {
      await invitationModel.markUsed(invitation.id, userId);
    }

    const dashboard = await userModel.getDashboardData(userId);

    const auditEntry = buildAuditEntry({
      scope: "miniapp",
      action: "user.registered",
      entity: "user",
      entityId: dashboard.id,
      actor: {
        id: dashboard.id,
        role: dashboard.roleName,
        name: `${dashboard.firstName} ${dashboard.lastName}`,
      },
      metadata: {
        branch: dashboard.branchName,
        role: dashboard.roleName,
        telegramId,
        invitedBy: invitation ? invitation.created_by : null,
      },
    });
    await logAuditEvent(auditEntry);

    res.status(201).json({
      registered: true,
      user: dashboard,
    });
  } catch (error) {
    next(error);
  }
}

async function getProfile(req, res, next) {
  try {
    if (!req.currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const dashboard = await userModel.getDashboardData(req.currentUser.id);
    res.json({ user: dashboard });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    if (!req.currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const { error, value } = profileUpdateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    await userModel.updateProfile(req.currentUser.id, value);

    const dashboard = await userModel.getDashboardData(req.currentUser.id);

    const auditEntry = buildAuditEntry({
      scope: "miniapp",
      action: "user.profile.updated",
      entity: "user",
      entityId: req.currentUser.id,
      actor: {
        id: req.currentUser.id,
        role: dashboard.roleName,
        name: `${dashboard.firstName} ${dashboard.lastName}`,
      },
      metadata: {
        telegramId: req.currentUser.telegramId,
      },
    });
    await logAuditEvent(auditEntry);

    res.json({ user: dashboard });
  } catch (error) {
    next(error);
  }
}

async function getReferences(req, res, next) {
  try {
    const [branches, positions, roles] = await Promise.all([
      referenceModel.getBranches(),
      referenceModel.getPositions(),
      referenceModel.getRoles(),
    ]);

    res.json({ branches, positions, roles });
  } catch (error) {
    next(error);
  }
}

async function getAdminReferences(req, res, next) {
  try {
    const [branches, positions, roles] = await Promise.all([
      referenceModel.getAllBranches(),
      referenceModel.getAllPositions(),
      referenceModel.getRoles(),
    ]);

    res.json({ branches, positions, roles });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStatus,
  register,
  getProfile,
  updateProfile,
  getReferences,
  getAdminReferences,
};
