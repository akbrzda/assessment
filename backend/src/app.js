const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const config = require("./config/env");
const errorHandler = require("./middleware/errorHandler");
const timezoneMiddleware = require("./middleware/timezone");
const authRoutes = require("./modules/auth");
const invitationModule = require("./modules/invitations");
const assessmentModule = require("./modules/assessment");
const analyticsModule = require("./modules/analytics");
const cloudStorageRoutes = require("./modules/cloud-storage");
const { healthCheck } = require("./config/database");
const gamificationRoutes = require("./modules/gamification");
const leaderboardRoutes = require("./modules/leaderboard");
const coursesModule = require("./modules/courses");
const adminAuthRoutes = require("./modules/admin/auth");
const adminDashboardRoutes = require("./modules/admin/dashboard");
const adminUsersRoutes = require("./modules/admin/users");
const adminReferencesRoutes = require("./modules/admin/references");
const adminQuestionBankRoutes = require("./modules/admin/question-bank");
const adminBranchRoutes = require("./modules/admin/branches");
const adminPositionRoutes = require("./modules/admin/positions");
const adminSettingsRoutes = require("./modules/admin/settings");
const adminGamificationRulesRoutes = require("./modules/admin/gamification-rules");
const adminProfileRoutes = require("./modules/admin/profile");
const adminPermissionsRoutes = require("./modules/admin/permissions");
const badgesRoutes = require("./modules/admin/badges");
const levelsRoutes = require("./modules/admin/levels");

const app = express();

const corsOptions = {
  origin: config.allowedOrigins.length ? config.allowedOrigins : true,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Защита от индексации поисковыми системами
app.use((req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});

// Статические файлы (иконки бейджей)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const apiRouter = express.Router();

// Middleware для конвертации дат в часовой пояс пользователя
apiRouter.use(timezoneMiddleware);

apiRouter.get("/health", async (req, res, next) => {
  try {
    await healthCheck();
    res.json({ status: "ok" });
  } catch (error) {
    next(error);
  }
});

apiRouter.use("/auth", authRoutes);
apiRouter.use("/invitations", invitationModule.routes);
apiRouter.use("/admin/auth", adminAuthRoutes);
apiRouter.use("/admin/dashboard", adminDashboardRoutes);
apiRouter.use("/admin/users", adminUsersRoutes);
apiRouter.use("/admin/references", adminReferencesRoutes);
apiRouter.use("/admin/assessments", assessmentModule.admin.routes);
apiRouter.use("/admin/question-bank", adminQuestionBankRoutes);
apiRouter.use("/admin/analytics", analyticsModule.admin.routes);
apiRouter.use("/admin/branches", adminBranchRoutes);
apiRouter.use("/admin/positions", adminPositionRoutes);
apiRouter.use("/admin/settings", adminSettingsRoutes);
apiRouter.use("/admin/gamification/rules", adminGamificationRulesRoutes);
apiRouter.use("/admin/invitations", invitationModule.admin.routes);
apiRouter.use("/admin/profile", adminProfileRoutes);
apiRouter.use("/admin/permissions", adminPermissionsRoutes);
apiRouter.use("/admin/courses", coursesModule.admin.routes);
apiRouter.use("/admin/badges", badgesRoutes);
apiRouter.use("/admin/levels", levelsRoutes);
apiRouter.use("/assessments", assessmentModule.routes);
apiRouter.use("/analytics", analyticsModule.routes);
apiRouter.use("/cloud-storage", cloudStorageRoutes);
apiRouter.use("/gamification", gamificationRoutes);
apiRouter.use("/leaderboard", leaderboardRoutes);
apiRouter.use("/courses", coursesModule.routes);

app.use("/api", apiRouter);

app.use(errorHandler);

module.exports = app;
