const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const config = require("./config/env");
const { errorHandler, timezone: timezoneMiddleware } = require("./middleware");

const authModule = require("./modules/auth");
const invitationModule = require("./modules/invitations");
const assessmentModule = require("./modules/assessment");
const analyticsModule = require("./modules/analytics");
const cloudStorageRoutes = require("./modules/cloud-storage");
const { healthCheck } = require("./config/database");
const gamificationModule = require("./modules/gamification");
const leaderboardRoutes = require("./modules/leaderboard");
const coursesModule = require("./modules/courses");
const adminDashboardRoutes = require("./modules/admin/dashboard");
const adminUsersRoutes = require("./modules/admin/users");
const adminReferencesRoutes = require("./modules/admin/references");
const adminQuestionBankRoutes = require("./modules/admin/question-bank");
const adminBranchRoutes = require("./modules/admin/branches");
const adminPositionRoutes = require("./modules/admin/positions");
const adminSettingsRoutes = require("./modules/admin/settings");
const adminProfileRoutes = require("./modules/admin/profile");
const adminPermissionsRoutes = require("./modules/admin/permissions");

const app = express();

const isProduction = config.nodeEnv === "production";
if (isProduction && config.allowedOrigins.length === 0) {
  throw new Error("ALLOWED_ORIGINS не задан: запуск в production остановлен");
}

const corsOptions = {
  origin: config.allowedOrigins.length ? config.allowedOrigins : true,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Р—Р°С‰РёС‚Р° РѕС‚ РёРЅРґРµРєСЃР°С†РёРё РїРѕРёСЃРєРѕРІС‹РјРё СЃРёСЃС‚РµРјР°РјРё
app.use((req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});

// РЎС‚Р°С‚РёС‡РµСЃРєРёРµ С„Р°Р№Р»С‹ (РёРєРѕРЅРєРё Р±РµР№РґР¶РµР№)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const apiRouter = express.Router();

// Middleware РґР»СЏ РєРѕРЅРІРµСЂС‚Р°С†РёРё РґР°С‚ РІ С‡Р°СЃРѕРІРѕР№ РїРѕСЏСЃ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
apiRouter.use(timezoneMiddleware);

apiRouter.get("/health", async (req, res, next) => {
  try {
    await healthCheck();
    res.json({ status: "ok" });
  } catch (error) {
    next(error);
  }
});

apiRouter.use("/auth", authModule.routes);
apiRouter.use("/invitations", invitationModule.routes);
apiRouter.use("/admin/auth", authModule.admin.routes);
apiRouter.use("/admin/dashboard", adminDashboardRoutes);
apiRouter.use("/admin/users", adminUsersRoutes);
apiRouter.use("/admin/references", adminReferencesRoutes);
apiRouter.use("/admin/assessments", assessmentModule.admin.routes);
apiRouter.use("/admin/question-bank", adminQuestionBankRoutes);
apiRouter.use("/admin/analytics", analyticsModule.admin.routes);
apiRouter.use("/admin/branches", adminBranchRoutes);
apiRouter.use("/admin/positions", adminPositionRoutes);
apiRouter.use("/admin/settings", adminSettingsRoutes);
apiRouter.use("/admin/gamification/rules", gamificationModule.admin.rules.routes);
apiRouter.use("/admin/invitations", invitationModule.admin.routes);
apiRouter.use("/admin/profile", adminProfileRoutes);
apiRouter.use("/admin/permissions", adminPermissionsRoutes);
apiRouter.use("/admin/courses", coursesModule.admin.routes);
apiRouter.use("/admin/badges", gamificationModule.admin.badges.routes);
apiRouter.use("/admin/levels", gamificationModule.admin.levels.routes);
apiRouter.use("/assessments", assessmentModule.routes);
apiRouter.use("/analytics", analyticsModule.routes);
apiRouter.use("/cloud-storage", cloudStorageRoutes);
apiRouter.use("/gamification", gamificationModule.routes);
apiRouter.use("/leaderboard", leaderboardRoutes);
apiRouter.use("/courses", coursesModule.routes);

app.use("/api", apiRouter);

app.use(errorHandler);

module.exports = app;
