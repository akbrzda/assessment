import { io } from "socket.io-client";
import { useAuthStore } from "@/stores/auth";

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventHandlers = new Map();
  }

  connect() {
    const authStore = useAuthStore();
    const token = authStore.token;

    if (!token) {
      console.warn("WebSocket: не удалось подключиться - отсутствует токен");
      return;
    }

    if (this.socket?.connected) {
      console.log("WebSocket: уже подключен");
      return;
    }

    // Определяем URL для WebSocket - используем тот же адрес, что и для API
    const apiUrl = "http://localhost:3001";

    this.socket = io(apiUrl, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      transports: ["websocket", "polling"],
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log("WebSocket подключен:", this.socket.id);
      this.emit("status:changed", { connected: true });
    });

    this.socket.on("disconnect", (reason) => {
      this.isConnected = false;
      console.log("WebSocket отключен:", reason);
      this.emit("status:changed", { connected: false });
    });

    this.socket.on("connect_error", (error) => {
      this.reconnectAttempts++;
      console.error("WebSocket ошибка подключения:", error.message);

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("WebSocket: превышено максимальное количество попыток переподключения");
        this.disconnect();
      }
    });

    this.socket.on("pong", (data) => {
      console.debug("WebSocket pong получен:", data);
    });

    // Обработка логов
    this.socket.on("log:new", (log) => {
      console.log("Новый лог:", log);
      this.emit("log:new", log);
    });

    // Обработка обновлений дашборда
    this.socket.on("dashboard:update", (data) => {
      console.log("Обновление дашборда:", data);
      this.emit("dashboard:update", data);
    });

    // Обработка обновлений аттестаций
    this.socket.on("assessment:update", (data) => {
      console.log("Обновление аттестации:", data);
      this.emit("assessment:update", data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.eventHandlers.clear();
      console.log("WebSocket отключен вручную");
    }
  }

  // Подписка на события
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);

    // Возвращаем функцию для отписки
    return () => this.off(event, handler);
  }

  // Отписка от события
  off(event, handler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Внутренний emit для уведомления подписчиков
  emit(event, data) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Ошибка в обработчике события ${event}:`, error);
        }
      });
    }
  }

  // Отправка события на сервер
  send(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`WebSocket: не удалось отправить ${event} - нет подключения`);
    }
  }

  // Проверка соединения
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

// Singleton экземпляр
const websocketService = new WebSocketService();

export default websocketService;
