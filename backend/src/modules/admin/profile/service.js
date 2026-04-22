const userModel = require("../../../models/userModel");
const { body, validationResult } = require("express-validator");

// РџРѕР»СѓС‡РёС‚СЊ РїСЂРѕС„РёР»СЊ С‚РµРєСѓС‰РµРіРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    res.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "РћС€РёР±РєР° РїСЂРё РїРѕР»СѓС‡РµРЅРёРё РїСЂРѕС„РёР»СЏ" });
  }
};

// РћР±РЅРѕРІРёС‚СЊ РїСЂРѕС„РёР»СЊ С‚РµРєСѓС‰РµРіРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
const updateProfile = [
  body("firstName").trim().notEmpty().withMessage("РРјСЏ РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ"),
  body("lastName").trim().notEmpty().withMessage("Р¤Р°РјРёР»РёСЏ РѕР±СЏР·Р°С‚РµР»СЊРЅР°"),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.id;
      const { firstName, lastName } = req.body;

      await userModel.updateProfile(userId, { firstName, lastName });

      // РџРѕР»СѓС‡Р°РµРј РѕР±РЅРѕРІР»РµРЅРЅС‹Рµ РґР°РЅРЅС‹Рµ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
      const updatedUser = await userModel.findById(userId);

      res.json({
        message: "РџСЂРѕС„РёР»СЊ СѓСЃРїРµС€РЅРѕ РѕР±РЅРѕРІР»РµРЅ",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "РћС€РёР±РєР° РїСЂРё РѕР±РЅРѕРІР»РµРЅРёРё РїСЂРѕС„РёР»СЏ" });
    }
  },
];

module.exports = {
  getProfile,
  updateProfile,
};

