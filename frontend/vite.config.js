import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const rootEnvDir = resolve(__dirname, "..");
  const env = loadEnv(mode, rootEnvDir, "");

  return {
    envDir: rootEnvDir,
    define: {
      __API_BASE_URL__: JSON.stringify(env.API_BASE_URL || ""),
      __INVITE_EXPIRATION_DAYS__: JSON.stringify(env.INVITE_EXPIRATION_DAYS || "7"),
      __BOT_USERNAME__: JSON.stringify(env.BOT_USERNAME || ""),
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
