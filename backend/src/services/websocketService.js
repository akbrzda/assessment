const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const config = require("../config/env");
const logger = require("../utils/logger");

let io = null;

// Middleware для аутентификации WebSocket подключений
function authenticateSocket(socket, next) {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    logger.warn("WebSocket connection rejected: no token provided");
    return next(new Error("Authentication error: no token"));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    socket.userName = decoded.name || "Unknown";

    logger.info(`WebSocket authenticated: user ${socket.userId} (${socket.userRole})`);
    next();
  } catch (error) {
    logger.warn(`WebSocket authentication failed: ${error.message}`);
    next(new Error("Authentication error: invalid token"));
  }
}

// Инициализация WebSocket сервера
function initWebSocket(server) {
  const allowedOrigins =
    config.allowedOrigins && config.allowedOrigins.length > 0
      ? config.allowedOrigins
      : ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    logger.info(`WebSocket client connected: ${socket.id} (user: ${socket.userId})`);

    // Присоединяем пользователя к его комнате
    socket.join(`user:${socket.userId}`);

    // Присоединяем к комнате по роли
    socket.join(`role:${socket.userRole}`);

    socket.on("disconnect", (reason) => {
      logger.info(`WebSocket client disconnected: ${socket.id} (reason: ${reason})`);
    });

    socket.on("error", (error) => {
      logger.error(`WebSocket error for client ${socket.id}: ${error.message}`);
    });

    // Пинг-понг для проверки соединения
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now() });
    });
  });

  logger.info("✅ WebSocket server initialized");
  return io;
}

// Получить экземпляр io
function getIO() {
  if (!io) {
    throw new Error("WebSocket server not initialized");
  }
  return io;
}

// Отправить событие конкретному пользователю
function emitToUser(userId, event, data) {
  if (!io) {
    logger.warn("Cannot emit to user: WebSocket not initialized");
    return;
  }
  io.to(`user:${userId}`).emit(event, data);
  logger.debug(`Emitted ${event} to user ${userId}`);
}

// Отправить событие всем пользователям с определённой ролью
function emitToRole(role, event, data) {
  if (!io) {
    logger.warn("Cannot emit to role: WebSocket not initialized");
    return;
  }
  io.to(`role:${role}`).emit(event, data);
  logger.debug(`Emitted ${event} to role ${role}`);
}

// Отправить событие всем подключённым клиентам
function emitToAll(event, data) {
  if (!io) {
    logger.warn("Cannot emit to all: WebSocket not initialized");
    return;
  }
  io.emit(event, data);
  logger.debug(`Emitted ${event} to all clients`);
}

// Отправить обновление дашборда
function emitDashboardUpdate(data) {
  emitToRole("superadmin", "dashboard:update", data);
  emitToRole("manager", "dashboard:update", data);
}

// Отправить новый лог
function emitNewLog(logEntry) {
  emitToRole("superadmin", "log:new", logEntry);
}

// Отправить обновление аттестации
function emitAssessmentUpdate(assessmentId, data) {
  emitToAll("assessment:update", { assessmentId, ...data });
}

module.exports = {
  initWebSocket,
  getIO,
  emitToUser,
  emitToRole,
  emitToAll,
  emitDashboardUpdate,
  emitNewLog,
  emitAssessmentUpdate,
};
