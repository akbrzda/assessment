import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const envDir = __dirname;
  const env = loadEnv(mode, envDir, "");
  const hmrHost = env.VITE_HMR_HOST;
  const hmrProtocol = env.VITE_HMR_PROTOCOL || "wss";
  const hmrClientPort = Number(env.VITE_HMR_CLIENT_PORT || 443);

  return {
    envDir,
    define: {
      __API_BASE_URL__: JSON.stringify(env.API_BASE_URL || ""),
      __BOT_USERNAME__: JSON.stringify(env.BOT_USERNAME || ""),
    },
    plugins: [vue()],
    server: {
      port: 5174,
      host: true,
      allowedHosts: ["admin.dev.akbrzda.ru", "admin.theorica.ru"],
      hmr: hmrHost
        ? {
            host: hmrHost,
            protocol: hmrProtocol,
            clientPort: Number.isFinite(hmrClientPort) ? hmrClientPort : 443,
          }
        : undefined,
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Vendor chunks - разделяем библиотеки
          manualChunks: {
            "vue-vendor": ["vue", "vue-router", "pinia"],
            "chart-vendor": ["chart.js", "vue-chartjs"],
            "icons-vendor": ["lucide-vue-next"],
            "axios-vendor": ["axios"],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
  };
});
