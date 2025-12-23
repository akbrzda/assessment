import { io } from "socket.io-client";
import { useAuthStore } from "@/stores/auth";
import { API_BASE_URL } from "@/env";

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
      console.warn("WebSocket: не удалось подключиться - отсутствует токен");
      return;
    }

    if (this.socket?.connected) {
      console.log("WebSocket: уже подключен");
      return;
    }

    // Проверяем, не истек ли токен перед подключением
    if (this.isTokenExpired(token)) {
      console.log("WebSocket: токен истек, сначала обновляем его");
      this.handleAuthError();
      return;
    }

    // Определяем URL для WebSocket из конфигурации или используем дефолтный
    const apiUrl = API_BASE_URL ? API_BASE_URL.replace("/api", "") : "http://localhost:3001";

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

  isTokenExpired(token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const expirationTime = payload.exp * 1000; // JWT exp в секундах
      const currentTime = Date.now();
      // Проверяем с запасом в 30 секунд
      return expirationTime <= currentTime + 30000;
    } catch (error) {
      console.error("WebSocket: ошибка при проверке токена:", error);
      return false; // Если не можем проверить, пытаемся подключиться
    }
  }

  setupEventHandlers() {
    if (!this.socket) return;

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

      // Если ошибка аутентификации (истекший или невалидный токен) и мы еще не обрабатываем ее
      if ((error.message.includes("Authentication error") || error.message.includes("token expired")) && !this.isAuthErrorHandling) {
        console.log("WebSocket: ошибка аутентификации, требуется обновление токена");
        this.isAuthErrorHandling = true;
        this.reconnectAttempts = 0; // Сбрасываем счетчик при попытке обновить токен
        this.handleAuthError();
        return;
      }

      // Увеличиваем счетчик только для не-аутентификационных ошибок
      this.reconnectAttempts++;

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
      this.reconnectAttempts = 0;
      this.isAuthErrorHandling = false;
      this.isReconnecting = false;
      this.eventHandlers.clear();
      console.log("WebSocket отключен вручную");
    }
  }

  reconnectWithNewToken(newToken) {
    if (!newToken) {
      console.warn("WebSocket: попытка переподключения без токена");
      return;
    }

    // Защита от множественных одновременных переподключений
    if (this.isReconnecting) {
      console.log("WebSocket: переподключение уже выполняется, пропускаем");
      return;
    }

    console.log("WebSocket: переподключение с новым токеном");
    this.isReconnecting = true;
    this.disconnect();
    this.reconnectAttempts = 0;

    // Небольшая задержка перед переподключением
    setTimeout(() => {
      this.isReconnecting = false;
      this.connect();
    }, 500);
  }

  async handleAuthError() {
    console.log("WebSocket: попытка обновить токен после ошибки аутентификации");

    try {
      const authStore = useAuthStore();
      const refreshToken = authStore.refreshToken;

      if (!refreshToken) {
        console.error("WebSocket: нет refresh токена для обновления");
        this.isAuthErrorHandling = false;
        this.disconnect();
        return;
      }

      // Импортируем authApi динамически чтобы избежать циклических зависимостей
      const { default: authApi } = await import("@/api/auth");
      const { data } = await authApi.refresh();

      // Обновляем токен в store БЕЗ переподключения
      authStore.setToken(data.accessToken);

      // Переподключаемся с новым токеном явно
      this.isAuthErrorHandling = false;
      this.reconnectWithNewToken(data.accessToken);
    } catch (error) {
      console.error("WebSocket: не удалось обновить токен:", error);
      this.isAuthErrorHandling = false;
      this.disconnect();
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
