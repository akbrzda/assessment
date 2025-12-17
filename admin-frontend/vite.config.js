import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const envDir = __dirname;
  const env = loadEnv(mode, envDir, "");

  return {
    envDir,
    define: {
      __API_BASE_URL__: JSON.stringify(env.API_BASE_URL || ""),
      __INVITE_EXPIRATION_DAYS__: JSON.stringify(env.INVITE_EXPIRATION_DAYS || "7"),
      __BOT_USERNAME__: JSON.stringify(env.BOT_USERNAME || ""),
    },
    plugins: [vue()],
    server: {
      port: 5174,
      host: true,
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
