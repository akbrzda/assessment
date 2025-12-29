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
    },
    plugins: [vue()],
    server: {
      port: 5173,
      host: true,
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
  };
});
