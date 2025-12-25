const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");
const { createLog } = require("./adminLogsController");

/**
 * Авторизация для админ-панели (логин/пароль)
 */
exports.login = async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: "Логин и пароль обязательны" });
    }

    // Найти пользователя по логину
    const [users] = await pool.query(
      `SELECT u.*, r.name as role_name, b.name as branch_name, p.name as position_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN branches b ON u.branch_id = b.id
       LEFT JOIN positions p ON u.position_id = p.id
       WHERE u.login = ?`,
      [login]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }

    const user = users[0];

    // Проверить, что у пользователя есть роль manager или superadmin
    if (user.role_name !== "manager" && user.role_name !== "superadmin") {
      return res.status(403).json({ error: "Доступ запрещён" });
    }

    // Проверить пароль
    if (!user.password) {
      return res.status(401).json({ error: "Пароль не установлен. Обратитесь к администратору" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }

    // Генерировать токены
    // Access token живёт 30 минут (увеличено с 15 для стабильности)
    const accessToken = jwt.sign({ id: user.id, role: user.role_name }, process.env.JWT_SECRET || "your_secret_key_here", { expiresIn: "30m" });

    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET || "your_refresh_secret_key_here", { expiresIn: "7d" });

    // Сохранить refresh token в БД
    await pool.query("UPDATE users SET refresh_token = ? WHERE id = ?", [refreshToken, user.id]);

    // Логирование входа
    await createLog(user.id, "LOGIN", `Вход в админ-панель (${user.role_name})`, "auth", user.id, req);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        avatarUrl: user.avatar_url,
        role: user.role_name,
        branchId: user.branch_id,
        branchName: user.branch_name,
        positionName: user.position_name,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Ошибка авторизации" });
  }
};

/**
 * Обновление access token
 */
exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token отсутствует" });
    }

    // Проверить токен
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || "your_refresh_secret_key_here");

    // Найти пользователя
    const [users] = await pool.query(
      `SELECT u.*, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND u.refresh_token = ?`,
      [decoded.id, refreshToken]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: "Недействительный refresh token" });
    }

    const user = users[0];

    // Генерировать новый access token (30 минут)
    const accessToken = jwt.sign({ id: user.id, role: user.role_name }, process.env.JWT_SECRET || "your_secret_key_here", { expiresIn: "30m" });

    res.json({ accessToken });
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(401).json({ error: "Недействительный refresh token" });
  }
};

/**
 * Выход из системы
 */
exports.logout = async (req, res) => {
  try {
    const userId = req.user.id;

    // Удалить refresh token
    await pool.query("UPDATE users SET refresh_token = NULL WHERE id = ?", [userId]);

    res.json({ message: "Выход выполнен успешно" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Ошибка выхода" });
  }
};
