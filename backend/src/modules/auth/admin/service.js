const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("../../../config/env");
const authRepository = require("./repository");
const { createLog } = require("../../../services/adminLogService");
const { pool } = require("../../../config/database");

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_TTL || "30m";
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_TTL || "7d";
const REFRESH_COOKIE_NAME = "admin_refresh_token";
const REFRESH_COOKIE_PATH = "/api/admin/auth";

const isProduction = process.env.NODE_ENV === "production";
const cookieDomain = process.env.COOKIE_DOMAIN || (isProduction ? ".theorica.ru" : undefined);
const cookieSameSite = process.env.COOKIE_SAMESITE || (isProduction ? "none" : "lax");
const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: cookieSameSite,
  path: REFRESH_COOKIE_PATH,
  ...(cookieDomain ? { domain: cookieDomain } : {}),
};

function buildError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getRefreshCookieMaxAge() {
  if (!REFRESH_TOKEN_TTL.endsWith("d")) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const days = Number(REFRESH_TOKEN_TTL.replace("d", ""));
  return Number.isFinite(days) ? days * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
}

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...refreshCookieOptions,
    maxAge: getRefreshCookieMaxAge(),
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
}

function extractIpFromRequest(req) {
  const forwarded = req?.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req?.socket?.remoteAddress || null;
}

async function recordLoginHistory({ userId, req }) {
  const ipAddress = extractIpFromRequest(req);
  const userAgent = String(req?.headers?.["user-agent"] || "").slice(0, 500) || null;

  await pool.execute(
    `INSERT INTO user_login_history (user_id, status, ip_address, user_agent, created_at)
     VALUES (?, 'success', ?, ?, UTC_TIMESTAMP())`,
    [userId, ipAddress, userAgent],
  );
}

function toUserResponse(user) {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    avatarUrl: user.avatar_url,
    role: user.role_name,
    branchId: user.branch_id,
    branchName: user.branch_name,
    positionName: user.position_name,
  };
}

function createAccessToken(user) {
  return jwt.sign({ id: user.id, role: user.role_name, branch_id: user.branch_id || null }, config.jwtSecret, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

function createRefreshToken(userId) {
  return jwt.sign({ id: userId }, config.jwtRefreshSecret, {
    expiresIn: REFRESH_TOKEN_TTL,
  });
}

async function login(payload, req, res) {
  const { login, password } = payload;

  const user = await authRepository.findUserByLogin(login);
  if (!user) {
    throw buildError("Неверный логин или пароль", 401);
  }

  if (user.role_name !== "manager" && user.role_name !== "superadmin") {
    throw buildError("Доступ запрещён", 403);
  }

  if (!user.password) {
    throw buildError("Пароль не установлен. Обратитесь к администратору", 401);
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw buildError("Неверный логин или пароль", 401);
  }

  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user.id);

  await authRepository.updateRefreshToken(user.id, refreshToken);
  await createLog(user.id, "LOGIN", `Вход в админ-панель (${user.role_name})`, "auth", user.id, req);
  await recordLoginHistory({ userId: user.id, req });

  setRefreshCookie(res, refreshToken);

  return {
    accessToken,
    user: toUserResponse(user),
  };
}

async function refresh(payload, req, res) {
  const refreshToken = payload?.refreshToken || req.cookies?.[REFRESH_COOKIE_NAME];
  if (!refreshToken) {
    throw buildError("Refresh token отсутствует", 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
  } catch (error) {
    throw buildError("Недействительный refresh token", 401);
  }

  const user = await authRepository.findUserByRefreshToken(decoded.id, refreshToken);
  if (!user) {
    throw buildError("Недействительный refresh token", 401);
  }

  const accessToken = createAccessToken(user);
  const newRefreshToken = createRefreshToken(user.id);

  await authRepository.updateRefreshToken(user.id, newRefreshToken);
  setRefreshCookie(res, newRefreshToken);

  return {
    accessToken,
    user: toUserResponse(user),
  };
}

async function logout(currentUser, res) {
  if (!currentUser?.id) {
    throw buildError("Пользователь не найден", 401);
  }

  await authRepository.clearRefreshToken(currentUser.id);
  clearRefreshCookie(res);

  return { message: "Выход выполнен успешно" };
}

module.exports = {
  login,
  refresh,
  logout,
};
