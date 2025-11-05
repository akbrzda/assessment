import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
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
        manualChunks: {
          // Vendor chunks - разделяем библиотеки
          "vue-vendor": ["vue", "vue-router", "pinia"],
          "chart-vendor": ["chart.js", "vue-chartjs"],
          "icons-vendor": ["lucide-vue-next"],
          "axios-vendor": ["axios"],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Увеличиваем лимит до 1000 КБ (иконки занимают много места)
  },
});
