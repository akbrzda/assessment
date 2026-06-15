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

// Инициализируем Telegram store после создания Pinia
import { useTelegramStore } from "./stores/telegram.js";
const telegramStore = useTelegramStore();
telegramStore.initTelegram();

app.use(router);
app.mount("#app");

function isJavaScriptContentType(contentType) {
  return (
    contentType.includes("javascript") ||
    contentType.includes("ecmascript") ||
    contentType.includes("text/plain")
  );
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || typeof fetch !== "function") {
    return;
  }

  try {
    const response = await fetch("/sw.js", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok || !isJavaScriptContentType(contentType)) {
      console.warn("[SW] Registration skipped: service worker script is unavailable.");
      return;
    }

    await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.error("[SW] Registration failed:", err);
  }
}

// Регистрируем Service Worker для offline-кэширования и retry queue
registerServiceWorker();

if ("serviceWorker" in navigator) {
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
