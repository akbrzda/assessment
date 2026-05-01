import { io } from "socket.io-client";
import { API_BASE_URL } from "@/env";
import { useAuthStore } from "@/stores/auth";
import { refreshAccessToken } from "@/services/session/refreshCoordinator";

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventHandlers = new Map();
    this.isAuthErrorHandling = false;
    this.isReconnecting = false;
  }

  connect() {
    const authStore = useAuthStore();
    const token = authStore.token;

    if (!token) {
      console.warn("WebSocket: не удалось подключиться, отсутствует токен");
      return;
    }

    if (this.socket?.connected) {
      console.log("WebSocket: уже подключен");
      return;
    }

    if (this.isTokenExpired(token)) {
      console.log("WebSocket: токен истек, требуется обновление");
      this.handleAuthError();
      return;
    }

    let wsUrl;
    try {
      // Берём только origin из API_BASE_URL (без пути /api)
      wsUrl = API_BASE_URL ? new URL(API_BASE_URL).origin : "http://localhost:3001";
    } catch {
      wsUrl = "http://localhost:3001";
    }

    this.socket = io(wsUrl, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      transports: ["polling", "websocket"],
    });

    this.setupEventHandlers();
  }

  isTokenExpired(token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      return expirationTime <= currentTime + 30000;
    } catch (error) {
      console.error("WebSocket: ошибка при проверке токена:", error);
      return false;
    }
  }

  setupEventHandlers() {
    if (!this.socket) {
      return;
    }

    this.socket.on("connect", () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.isAuthErrorHandling = false;
      this.isReconnecting = false;
      console.log("WebSocket подключен:", this.socket.id);
      this.emit("status:changed", { connected: true });
    });

    this.socket.on("disconnect", (reason) => {
      this.isConnected = false;
      console.log("WebSocket отключен:", reason);
      this.emit("status:changed", { connected: false });
    });

    this.socket.on("connect_error", (error) => {
      console.error("WebSocket ошибка подключения:", error.message);

      const isAuthError = error.message.includes("Authentication error") || error.message.includes("token expired");
      if (isAuthError && !this.isAuthErrorHandling) {
        this.isAuthErrorHandling = true;
        this.reconnectAttempts = 0;
        this.handleAuthError();
        return;
      }

      this.reconnectAttempts += 1;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("WebSocket: превышено количество попыток переподключения");
        this.disconnect();
      }
    });

    this.socket.on("pong", (data) => {
      console.debug("WebSocket pong:", data);
    });

    this.socket.on("log:new", (log) => {
      this.emit("log:new", log);
    });

    this.socket.on("dashboard:update", (data) => {
      this.emit("dashboard:update", data);
    });

    this.socket.on("assessment:update", (data) => {
      this.emit("assessment:update", data);
    });
  }

  disconnect() {
    if (!this.socket) {
      return;
    }

    this.socket.disconnect();
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.isAuthErrorHandling = false;
    this.isReconnecting = false;
    this.eventHandlers.clear();
    console.log("WebSocket отключен вручную");
  }

  reconnectWithNewToken(newToken) {
    if (!newToken) {
      console.warn("WebSocket: попытка переподключения без токена");
      return;
    }

    if (this.isReconnecting) {
      console.log("WebSocket: переподключение уже выполняется");
      return;
    }

    this.isReconnecting = true;
    this.disconnect();
    this.reconnectAttempts = 0;

    setTimeout(() => {
      this.isReconnecting = false;
      this.connect();
    }, 500);
  }

  async handleAuthError() {
    try {
      const authStore = useAuthStore();
      const newAccessToken = await refreshAccessToken();

      authStore.setToken(newAccessToken);
      this.isAuthErrorHandling = false;
      this.reconnectWithNewToken(newAccessToken);
    } catch (error) {
      console.error("WebSocket: не удалось обновить токен:", error);
      this.isAuthErrorHandling = false;
      this.disconnect();
    }
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }

    this.eventHandlers.get(event).push(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const handlers = this.eventHandlers.get(event);
    if (!handlers) {
      return;
    }

    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  emit(event, data) {
    const handlers = this.eventHandlers.get(event);
    if (!handlers) {
      return;
    }

    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Ошибка в обработчике события ${event}:`, error);
      }
    });
  }

  send(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
      return;
    }

    console.warn(`WebSocket: не удалось отправить ${event}, нет подключения`);
  }

  ping() {
    if (this.socket && this.isConnected) {
      this.socket.emit("ping");
    }
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id || null,
    };
  }
}

const websocketService = new WebSocketService();

export default websocketService;
