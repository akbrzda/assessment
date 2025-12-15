const Joi = require("joi");
const invitationModel = require("../models/invitationModel");
const referenceModel = require("../models/referenceModel");
const { generateInviteCode } = require("../utils/tokenGenerator");
const { createLog } = require("./adminLogsController");
const config = require("../config/env");

const createSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(64).required(),
  lastName: Joi.string().trim().min(2).max(64).required(),
  branchId: Joi.number().integer().positive().required(),
});

const updateSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(64).required(),
  lastName: Joi.string().trim().min(2).max(64).required(),
  branchId: Joi.number().integer().positive().required(),
});

const extendSchema = Joi.object({
  days: Joi.number().integer().min(1).max(30).required(),
});

/**
 * Генерация уникального кода приглашения
 */
async function ensureUniqueCode() {
  for (let i = 0; i < 5; i += 1) {
    const code = generateInviteCode();
    const existing = await invitationModel.findActiveByCode(code);
    if (!existing) {
      return code;
    }
  }
  throw new Error("Unable to generate unique invitation code");
}

/**
 * Получить список приглашений
 */
exports.listInvitations = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    let invitations;
    if (userRole === "superadmin") {
      invitations = await invitationModel.findAll();
    } else if (userRole === "manager") {
      invitations = await invitationModel.findByCreator(userId);
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ invitations });
  } catch (error) {
    console.error("List invitations error:", error);
    next(error);
  }
};

/**
 * Создать приглашение
 */
exports.createInvitation = async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    const managerRole = await referenceModel.getRoleByName("manager");
    if (!managerRole) {
      return res.status(500).json({ error: "Manager role not configured" });
    }

    const expirationDays = config.inviteExpirationDays;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    const code = await ensureUniqueCode();

    const invitationId = await invitationModel.createInvitation({
      code,
      roleId: managerRole.id,
      branchId: value.branchId,
      firstName: value.firstName,
      lastName: value.lastName,
      expiresAt,
      createdBy: req.user.id,
    });

    const invitation = await invitationModel.findById(invitationId);

    // Логирование действия
    await createLog(
      req.user.id,
      "CREATE",
      `Создано приглашение для ${value.firstName} ${value.lastName} (код: ${code})`,
      "invitation",
      invitationId,
      req
    );

    res.status(201).json({ invitation, message: "Приглашение создано успешно" });
  } catch (error) {
    console.error("Create invitation error:", error);
    next(error);
  }
};

/**
 * Обновить приглашение
 */
exports.updateInvitation = async (req, res, next) => {
  try {
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    const invitationId = Number(req.params.id);
    const invitation = await invitationModel.findById(invitationId);

    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found" });
    }

    // Проверка прав доступа
    if (req.user.role !== "superadmin" && invitation.created_by !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (invitation.used_by) {
      return res.status(400).json({ error: "Cannot update used invitation" });
    }

    await invitationModel.updateInvitation(invitationId, {
      firstName: value.firstName,
      lastName: value.lastName,
      branchId: value.branchId,
    });

    const updated = await invitationModel.findById(invitationId);

    // Логирование действия
    await createLog(
      req.user.id,
      "UPDATE",
      `Обновлено приглашение: ${value.firstName} ${value.lastName} (код: ${invitation.code})`,
      "invitation",
      invitationId,
      req
    );

    res.json({ invitation: updated, message: "Приглашение обновлено успешно" });
  } catch (error) {
    console.error("Update invitation error:", error);
    next(error);
  }
};

/**
 * Продлить приглашение
 */
exports.extendInvitation = async (req, res, next) => {
  try {
    const { error, value } = extendSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    const invitationId = Number(req.params.id);
    const invitation = await invitationModel.findById(invitationId);

    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found" });
    }

    // Проверка прав доступа
    if (req.user.role !== "superadmin" && invitation.created_by !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (invitation.used_by) {
      return res.status(400).json({ error: "Cannot extend used invitation" });
    }

    const expiresAt = new Date(invitation.expires_at);
    expiresAt.setDate(expiresAt.getDate() + value.days);

    await invitationModel.updateExpiration(invitationId, expiresAt);

    const updated = await invitationModel.findById(invitationId);

    // Логирование действия
    await createLog(req.user.id, "UPDATE", `Продлено приглашение на ${value.days} дней (код: ${invitation.code})`, "invitation", invitationId, req);

    res.json({ invitation: updated, message: "Приглашение продлено успешно" });
  } catch (error) {
    console.error("Extend invitation error:", error);
    next(error);
  }
};

/**
 * Удалить приглашение
 */
exports.deleteInvitation = async (req, res, next) => {
  try {
    const invitationId = Number(req.params.id);
    const invitation = await invitationModel.findById(invitationId);

    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found" });
    }

    // Проверка прав доступа
    if (req.user.role !== "superadmin" && invitation.created_by !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (invitation.used_by) {
      return res.status(400).json({ error: "Cannot delete used invitation" });
    }

    await invitationModel.deleteInvitation(invitationId);

    // Логирование действия
    await createLog(
      req.user.id,
      "DELETE",
      `Удалено приглашение: ${invitation.first_name} ${invitation.last_name} (код: ${invitation.code})`,
      "invitation",
      invitationId,
      req
    );

    res.status(204).send();
  } catch (error) {
    console.error("Delete invitation error:", error);
    next(error);
  }
};
