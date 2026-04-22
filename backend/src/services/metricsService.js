const MAX_REQUEST_SAMPLES = 500;

const requestDurations = [];
const scoringErrors = {
  total: 0,
  bySource: {},
};

function addRequestDuration(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return;
  }

  requestDurations.push(durationMs);
  if (requestDurations.length > MAX_REQUEST_SAMPLES) {
    requestDurations.shift();
  }
}

function percentile(values, p) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  const safeIndex = Math.min(Math.max(index, 0), sorted.length - 1);
  return Number(sorted[safeIndex].toFixed(2));
}

function recordRequest(req, durationMs) {
  if (!req?.originalUrl?.startsWith("/api/")) {
    return;
  }

  addRequestDuration(durationMs);
}

function incrementScoringError(source = "unknown") {
  scoringErrors.total += 1;
  scoringErrors.bySource[source] = (scoringErrors.bySource[source] || 0) + 1;
}

function getMetricsSnapshot() {
  return {
    api: {
      sampleSize: requestDurations.length,
      p95LatencyMs: percentile(requestDurations, 95),
    },
    scoring: {
      errorsTotal: scoringErrors.total,
      bySource: scoringErrors.bySource,
    },
  };
}

function metricsMiddleware(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const finishedAt = process.hrtime.bigint();
    const durationMs = Number(finishedAt - startedAt) / 1_000_000;
    recordRequest(req, durationMs);
  });

  next();
}

module.exports = {
  metricsMiddleware,
  incrementScoringError,
  getMetricsSnapshot,
};
