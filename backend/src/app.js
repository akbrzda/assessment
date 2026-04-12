const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const config = require("./config/env");
const errorHandler = require("./middleware/errorHandler");
const timezoneMiddleware = require("./middleware/timezone");
const authRoutes = require("./routes/authRoutes");
const invitationRoutes = require("./routes/invitationRoutes");
const assessmentRoutes = require("./routes/assessmentRoutes");
const analyticsRoutes = require("./modules/analytics");
const cloudStorageRoutes = require("./routes/cloudStorageRoutes");
const { healthCheck } = require("./config/database");
const gamificationRoutes = require("./routes/gamificationRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const courseRoutes = require("./routes/courseRoutes");
const adminAuthRoutes = require("./modules/admin/auth");
const adminDashboardRoutes = require("./modules/admin/dashboard");
const adminUsersRoutes = require("./modules/admin/users");
const adminReferencesRoutes = require("./modules/admin/references");
const { routes: adminAssessmentsRoutes } = require("./modules/admin/assessments");
const adminQuestionBankRoutes = require("./modules/admin/question-bank");
const adminAnalyticsRoutes = require("./modules/admin/analytics");
const adminBranchRoutes = require("./modules/admin/branches");
const adminPositionRoutes = require("./modules/admin/positions");
const adminSettingsRoutes = require("./modules/admin/settings");
const adminGamificationRulesRoutes = require("./modules/admin/gamification-rules");
const adminInvitationRoutes = require("./modules/admin/invitations");
const adminProfileRoutes = require("./modules/admin/profile");
const adminPermissionsRoutes = require("./modules/admin/permissions");
const adminCoursesRoutes = require("./modules/admin/courses");
const badgesRoutes = require("./modules/admin/badges");
const levelsRoutes = require("./modules/admin/levels");
const adminLegacyRoutes = require("./modules/admin/legacy");

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
apiRouter.use("/invitations", invitationRoutes);
apiRouter.use("/admin/auth", adminAuthRoutes);
apiRouter.use("/admin/dashboard", adminDashboardRoutes);
apiRouter.use("/admin/users", adminUsersRoutes);
apiRouter.use("/admin/references", adminReferencesRoutes);
apiRouter.use("/admin/assessments", adminAssessmentsRoutes);
apiRouter.use("/admin/question-bank", adminQuestionBankRoutes);
apiRouter.use("/admin/analytics", adminAnalyticsRoutes);
apiRouter.use("/admin/branches", adminBranchRoutes);
apiRouter.use("/admin/positions", adminPositionRoutes);
apiRouter.use("/admin/settings", adminSettingsRoutes);
apiRouter.use("/admin/gamification/rules", adminGamificationRulesRoutes);
apiRouter.use("/admin/invitations", adminInvitationRoutes);
apiRouter.use("/admin/profile", adminProfileRoutes);
apiRouter.use("/admin/permissions", adminPermissionsRoutes);
apiRouter.use("/admin/courses", adminCoursesRoutes);
apiRouter.use("/admin/badges", badgesRoutes);
apiRouter.use("/admin/levels", levelsRoutes);
apiRouter.use("/admin", adminLegacyRoutes);
apiRouter.use("/assessments", assessmentRoutes);
apiRouter.use("/analytics", analyticsRoutes);
apiRouter.use("/cloud-storage", cloudStorageRoutes);
apiRouter.use("/gamification", gamificationRoutes);
apiRouter.use("/leaderboard", leaderboardRoutes);
apiRouter.use("/courses", courseRoutes);

app.use("/api", apiRouter);

app.use(errorHandler);

module.exports = app;
