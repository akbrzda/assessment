const Joi = require('joi');
const userModel = require('../models/userModel');
const { sendTelegramLog } = require('../services/telegramLogger');
const { sendUserNotification } = require('../services/telegramNotifier');
const referenceModel = require('../models/referenceModel');

const updateSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(64).required(),
  lastName: Joi.string().trim().min(2).max(64).required(),
  branchId: Joi.number().integer().positive().required(),
  positionId: Joi.number().integer().positive().required(),
  roleId: Joi.number().integer().positive().required(),
  level: Joi.number().integer().min(1).default(1),
  points: Joi.number().integer().min(0).default(0)
});

async function listUsers(req, res, next) {
  try {
    const users = await userModel.listUsers();
    res.json({ users });
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(', ') });
    }

    const existing = await userModel.findById(userId);
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const branch = await referenceModel.getBranchById(value.branchId);
    if (!branch) {
      return res.status(422).json({ error: 'Branch does not exist' });
    }

    const position = await referenceModel.getPositionById(value.positionId);
    if (!position) {
      return res.status(422).json({ error: 'Position does not exist' });
    }

    const role = await referenceModel.getRoleById(value.roleId);
    if (!role) {
      return res.status(422).json({ error: 'Role does not exist' });
    }

    const payload = {
      firstName: value.firstName,
      lastName: value.lastName,
      positionId: value.positionId,
      branchId: value.branchId,
      roleId: value.roleId,
      level: value.level ?? existing.level,
      points: value.points ?? existing.points
    };

    await userModel.updateUserByAdmin(userId, payload);
    const updated = await userModel.findById(userId);

    if (existing.telegramId) {
      await sendUserNotification(
        existing.telegramId,
        'Ваш профиль обновлен администратором. Проверьте информацию в мини-приложении.'
      );
    }

    await sendTelegramLog(
      `🛠 <b>Обновление пользователя</b>\n` +
        `ID: ${updated.id}\n` +
        `Имя: ${updated.firstName} ${updated.lastName}\n` +
        `Роль: ${updated.roleName}\n` +
        `Обновил: ${req.currentUser.firstName} ${req.currentUser.lastName}`
    );

    res.json({ user: updated });
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const existing = await userModel.findById(userId);
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userId === req.currentUser.id) {
      return res.status(400).json({ error: 'Нельзя удалить самого себя' });
    }

    await sendUserNotification(
      existing.telegramId,
      'Ваш аккаунт был удален администратором. Для доступа обратитесь к руководству.'
    );

    await userModel.deleteUser(userId);

    await sendTelegramLog(
      `🗑️ <b>Удаление пользователя</b>\n` +
        `ID: ${existing.id}\n` +
        `Имя: ${existing.firstName} ${existing.lastName}\n` +
        `Удалил: ${req.currentUser.firstName} ${req.currentUser.lastName}`
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
  updateUser,
  deleteUser
};
