const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");
const authRoutes = require("./routes/authRoutes");
const invitationRoutes = require("./routes/invitationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const assessmentRoutes = require("./routes/assessmentRoutes");
const { healthCheck } = require("./config/database");

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/health", async (req, res, next) => {
  try {
    await healthCheck();
    res.json({ status: "ok" });
  } catch (error) {
    next(error);
  }
});

app.use("/auth", authRoutes);
app.use("/invitations", invitationRoutes);
app.use("/admin", adminRoutes);
app.use("/assessments", assessmentRoutes);

app.use(errorHandler);

module.exports = app;
