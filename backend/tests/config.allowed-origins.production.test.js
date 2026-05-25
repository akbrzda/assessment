const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const backendRoot = path.resolve(__dirname, "..");

function runEnvCheck(extraEnv) {
  return spawnSync(
    process.execPath,
    [
      "-e",
      `
      try {
        const config = require("./src/config/env");
        console.log(JSON.stringify({ allowedOrigins: config.allowedOrigins }));
      } catch (error) {
        console.error(String(error.message || error));
        process.exit(1);
      }
      `,
    ],
    {
      cwd: backendRoot,
      env: {
        ...process.env,
        PORT: "3001",
        DB_HOST: "localhost",
        DB_PORT: "3306",
        DB_NAME: "assessment",
        DB_USER: "root",
        DB_PASSWORD: "root",
        BOT_TOKEN: "token",
        JWT_SECRET: "secret",
        JWT_REFRESH_SECRET: "refresh-secret",
        ...extraEnv,
      },
      encoding: "utf8",
    },
  );
}

test("throws on production startup when ALLOWED_ORIGINS is empty", () => {
  const result = runEnvCheck({
    NODE_ENV: "production",
    ALLOWED_ORIGINS: "",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ALLOWED_ORIGINS/i);
});

test("allows production startup when ALLOWED_ORIGINS is set", () => {
  const result = runEnvCheck({
    NODE_ENV: "production",
    ALLOWED_ORIGINS: "https://miniapp.example.com,https://admin.example.com",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /miniapp\.example\.com/);
  assert.match(result.stdout, /admin\.example\.com/);
});
