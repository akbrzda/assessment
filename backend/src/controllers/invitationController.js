const Joi = require("joi");
const invitationModel = require("../models/invitationModel");
const referenceModel = require("../models/referenceModel");
const { generateInviteCode } = require("../utils/tokenGenerator");
const { sendTelegramLog } = require("../services/telegramLogger");
const { createLog } = require("./adminLogsController");
const config = require("../config/env");

const createSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(64).required(),
  lastName: Joi.string().trim().min(2).max(64).required(),
  branchId: Joi.number().integer().positive().required(),
  role: Joi.string().trim().optional().valid("manager"),
});

const updateSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(64).required(),
  lastName: Joi.string().trim().min(2).max(64).required(),
  branchId: Joi.number().integer().positive().required(),
});

const extendSchema = Joi.object({
  days: Joi.number().integer().min(1).max(30).required(),
});

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

async function create(req, res, next) {
  try {
    const { error, value } = createSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    const managerRole = await referenceModel.getRoleByName("manager");
    if (!managerRole) {
      return res.status(500).json({ error: "Manager role not configured" });
    }

    // Читаем срок действия из настроек БД
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
      createdBy: req.currentUser.id,
    });

    const invitation = await invitationModel.findById(invitationId);

    await sendTelegramLog(
      `🔗 <b>Создана приглашение</b>\n` +
        `Код: ${invitation.code}\n` +
        `Роль: ${invitation.role_name}\n` +
        `Филиал: ${invitation.branch_name}\n` +
        `Создал: ${req.currentUser.firstName} ${req.currentUser.lastName}`
    );

    res.status(201).json({ invitation });
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const items = await invitationModel.listInvitationsByCreator(req.currentUser.id);
    res.json({ invitations: items });
  } catch (error) {
    next(error);
  }
}

async function extend(req, res, next) {
  try {
    const { error, value } = extendSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    const invitationId = Number(req.params.id);
    const invitation = await invitationModel.findById(invitationId);
    if (!invitation || invitation.created_by !== req.currentUser.id) {
      return res.status(404).json({ error: "Invitation not found" });
    }

    if (invitation.used_by) {
      return res.status(400).json({ error: "Invitation already used" });
    }

    const expiresAt = new Date(invitation.expires_at);
    expiresAt.setDate(expiresAt.getDate() + value.days);

    await invitationModel.updateExpiration(invitationId, expiresAt);

    const updated = await invitationModel.findById(invitationId);

    await sendTelegramLog(
      `⏰ <b>Продлена ссылка</b>\n` +
        `Код: ${updated.code}\n` +
        `Новая дата: ${updated.expires_at}\n` +
        `Продлил: ${req.currentUser.firstName} ${req.currentUser.lastName}`
    );

    res.json({ invitation: updated });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const invitationId = Number(req.params.id);
    const invitation = await invitationModel.findById(invitationId);
    if (!invitation || invitation.created_by !== req.currentUser.id) {
      return res.status(404).json({ error: "Invitation not found" });
    }

    if (invitation.used_by) {
      return res.status(400).json({ error: "Used invitation cannot be deleted" });
    }

    await invitationModel.deleteInvitation(invitationId);

    await sendTelegramLog(
      `🗑️ <b>Удалена ссылка</b>\n` + `Код: ${invitation.code}\n` + `Удалил: ${req.currentUser.firstName} ${req.currentUser.lastName}`
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    const invitationId = Number(req.params.id);
    const invitation = await invitationModel.findById(invitationId);
    if (!invitation || invitation.created_by !== req.currentUser.id) {
      return res.status(404).json({ error: "Invitation not found" });
    }

    if (invitation.used_by) {
      return res.status(400).json({ error: "Used invitation cannot be edited" });
    }

    await invitationModel.updateInvitation(invitationId, {
      firstName: value.firstName,
      lastName: value.lastName,
      branchId: value.branchId,
    });

    const updated = await invitationModel.findById(invitationId);

    await sendTelegramLog(
      `✏️ <b>Изменено приглашение</b>\n` +
        `Код: ${updated.code}\n` +
        `ФИО: ${updated.first_name} ${updated.last_name}\n` +
        `Филиал: ${updated.branch_name}\n` +
        `Изменил: ${req.currentUser.firstName} ${req.currentUser.lastName}`
    );

    res.json({ invitation: updated });
  } catch (error) {
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
