const userModel = require("../../../models/userModel");
const Joi = require("joi");
const { logAndSend } = require("../../../services/auditService");

const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().min(1).required().messages({
    "string.empty": "Имя обязательно",
    "any.required": "Имя обязательно",
  }),
  lastName: Joi.string().trim().min(1).required().messages({
    "string.empty": "Фамилия обязательна",
    "any.required": "Фамилия обязательна",
  }),
});

// Получить профиль текущего пользователя
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    res.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Ошибка при получении профиля" });
  }
};

// Обновить профиль текущего пользователя
const updateProfile = async (req, res) => {
  try {
    const { value, error } = updateProfileSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({ errors: error.details.map((detail) => detail.message) });
    }

    const userId = req.user.id;
    const { firstName, lastName } = value;

    await userModel.updateProfile(userId, { firstName, lastName });

    const updatedUser = await userModel.findById(userId);

    await logAndSend({
      req,
      actor: { id: userId },
      action: "admin.profile_updated",
      entity: "user",
      entityId: userId,
      metadata: { firstName, lastName },
    });

    res.json({
      message: "Профиль успешно обновлен",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Ошибка при обновлении профиля" });
  }
};

module.exports = {
  getProfile,
  updateProfile,
};
