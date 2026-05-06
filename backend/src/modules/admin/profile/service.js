const userModel = require("../../../models/userModel");
const { body, validationResult } = require("express-validator");
const { logAndSend } = require("../../../services/auditService");

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
const updateProfile = [
  body("firstName").trim().notEmpty().withMessage("Имя обязательно"),
  body("lastName").trim().notEmpty().withMessage("Фамилия обязательна"),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.id;
      const { firstName, lastName } = req.body;

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
  },
];

module.exports = {
  getProfile,
  updateProfile,
};
