const express = require("express");
const cors = require("cors");
const path = require("path");
const errorHandler = require("./middleware/errorHandler");
const authRoutes = require("./routes/authRoutes");
const invitationRoutes = require("./routes/invitationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const assessmentRoutes = require("./routes/assessmentRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const cloudStorageRoutes = require("./routes/cloudStorageRoutes");
const { healthCheck } = require("./config/database");
const gamificationRoutes = require("./routes/gamificationRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");
const adminDashboardRoutes = require("./routes/adminDashboardRoutes");
const adminUsersRoutes = require("./routes/adminUsersRoutes");
const adminReferencesRoutes = require("./routes/adminReferencesRoutes");
const adminAssessmentsRoutes = require("./routes/adminAssessmentsRoutes");
const adminQuestionBankRoutes = require("./routes/adminQuestionBankRoutes");
const adminAnalyticsRoutes = require("./routes/adminAnalyticsRoutes");
const adminBranchRoutes = require("./routes/adminBranchRoutes");
const adminPositionRoutes = require("./routes/adminPositionRoutes");
const adminSettingsRoutes = require("./routes/adminSettingsRoutes");
const adminGamificationRulesRoutes = require("./routes/adminGamificationRulesRoutes");
const adminInvitationRoutes = require("./routes/adminInvitationRoutes");
const adminProfileRoutes = require("./routes/adminProfileRoutes");
const adminPermissionsRoutes = require("./routes/adminPermissionsRoutes");
const badgesRoutes = require("./routes/badges");
const levelsRoutes = require("./routes/levels");

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Защита от индексации поисковыми системами
app.use((req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});

// Статические файлы (иконки бейджей)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const apiRouter = express.Router();

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
apiRouter.use("/admin/badges", badgesRoutes);
apiRouter.use("/admin/levels", levelsRoutes);
apiRouter.use("/admin", adminRoutes);
apiRouter.use("/assessments", assessmentRoutes);
apiRouter.use("/analytics", analyticsRoutes);
apiRouter.use("/cloud-storage", cloudStorageRoutes);
apiRouter.use("/gamification", gamificationRoutes);
apiRouter.use("/leaderboard", leaderboardRoutes);

app.use("/api", apiRouter);

app.use(errorHandler);

module.exports = app;
