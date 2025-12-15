import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./style.css";
import websocketService from "./services/websocket";
import { useAuthStore } from "./stores/auth";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Подключаем WebSocket если пользователь уже авторизован
const authStore = useAuthStore();
if (authStore.isAuthenticated) {
  websocketService.connect();
}

app.mount("#app");
