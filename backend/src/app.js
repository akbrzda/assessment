const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const config = require("./config/env");
const { errorHandler, errorResponseNormalizer, timezone: timezoneMiddleware } = require("./middleware");
const correlationId = require("./middleware/correlationId");
const featureFlagsGate = require("./middleware/featureFlagsGate");
const verifyJWT = require("./middleware/verifyJWT");
const { verifyCertificateLimiter, authLimiter, adminGlobalLimiter } = require("./middleware/rateLimit");
const { UPLOADS_ROOT, resolveUploadsPath } = require("./utils/uploads");

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
const adminSearchRoutes = require("./modules/admin/search/routes");
const adminAuditLogsRoutes = require("./modules/admin/audit-logs/routes");
const { metricsMiddleware, toPrometheusMetrics } = require("./services/metricsService");
const botModule = require("./modules/bot");
const certificatesModule = require("./modules/certificates");
const { registerAssessmentEvents } = require("./events/assessmentEvents");

// Register domain event handlers
registerAssessmentEvents();

const app = express();
app.set("trust proxy", 1);

const isProduction = config.nodeEnv === "production";
if (isProduction && config.allowedOrigins.length === 0) {
  throw new Error("ALLOWED_ORIGINS is not configured: production startup aborted");
}

const corsOptions = {
  origin: config.allowedOrigins.length ? config.allowedOrigins : true,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        mediaSrc: ["'self'", "blob:", "https:"],
      },
    },
    xContentTypeOptions: true,
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "no-referrer" },
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(correlationId);
app.use(errorResponseNormalizer);

// Block search engine indexing
app.use((req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});

// Allow cross-origin loading of media files (Telegram MiniApp runs on a different origin)
app.use("/uploads", (req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

// Restrict certificate and course covers to authorized users
app.use("/uploads/certificates", verifyJWT, express.static(resolveUploadsPath("certificates")));
app.use("/uploads/courses", verifyJWT, express.static(resolveUploadsPath("courses")));

// Course media (videos, images) must be public — browsers cannot send Authorization for <video>/<img>
app.use("/uploads/course-media", express.static(resolveUploadsPath("course-media")));

// Public static files (icons, badges, logos)
app.use("/uploads", express.static(UPLOADS_ROOT));

const apiRouter = express.Router();

// Middleware for converting dates to the user timezone
apiRouter.use(timezoneMiddleware);
apiRouter.use(metricsMiddleware);
apiRouter.use("/admin", adminGlobalLimiter);
apiRouter.use(featureFlagsGate);

apiRouter.get("/health", async (req, res, next) => {
  try {
    await healthCheck();
    res.json({ status: "ok" });
  } catch (error) {
    next(error);
  }
});

apiRouter.use("/auth", authLimiter, authModule.routes);
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
// Role and granular permissions management is intentionally disabled here.
apiRouter.use("/admin/search", adminSearchRoutes);
apiRouter.use("/admin/audit-logs", adminAuditLogsRoutes);
apiRouter.use("/admin/courses", coursesModule.admin.routes);
apiRouter.use("/admin/badges", gamificationModule.admin.badges.routes);
apiRouter.use("/admin/levels", gamificationModule.admin.levels.routes);
apiRouter.use("/assessments", assessmentModule.routes);
apiRouter.use("/analytics", analyticsModule.routes);
apiRouter.use("/cloud-storage", cloudStorageRoutes);
apiRouter.use("/gamification", gamificationModule.routes);
apiRouter.use("/leaderboard", leaderboardRoutes);
apiRouter.use("/courses", coursesModule.routes);
apiRouter.use("/bot", botModule.routes);
apiRouter.use("/verify", verifyCertificateLimiter, certificatesModule.verifyRouter);
apiRouter.use("/certificates", certificatesModule.publicRouter);
apiRouter.use("/admin/certificates", certificatesModule.adminRouter);
// Main API is exposed only as v1.
app.use("/api/v1", apiRouter);
app.get("/metrics", (req, res) => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.send(toPrometheusMetrics());
});

app.use(errorHandler);

module.exports = app;
