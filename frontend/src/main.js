// Защита от ошибок Eruda с TelegramGameProxy
if (typeof window !== "undefined" && !window.TelegramGameProxy) {
  window.TelegramGameProxy = {
    receiveEvent: () => {},
  };
}

import { createApp } from "vue";
import { createPinia } from "pinia";
import "./style.css";
import App from "./App.vue";
import router from "./router/index.js";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Инициализируем Telegram store после создания Pinia
import { useTelegramStore } from "./stores/telegram.js";
const telegramStore = useTelegramStore();
telegramStore.initTelegram();

app.mount("#app");

// Регистрируем Service Worker для offline-кэширования и retry queue
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch((err) => {
    // Логируем ошибку регистрации — продолжаем без SW
    console.error("[SW] Registration failed:", err);
  });

  // При восстановлении сети просим SW отправить накопленную очередь
  window.addEventListener("online", () => {
    navigator.serviceWorker.ready
      .then((reg) => {
        if (reg.sync) {
          reg.sync.register("retry-queue").catch(() => {});
        } else {
          // Fallback если Background Sync API недоступен
          reg.active?.postMessage({ type: "FLUSH_RETRY_QUEUE" });
        }
      })
      .catch(() => {});
  });
}
