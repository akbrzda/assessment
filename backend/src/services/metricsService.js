const REQUEST_DURATION_BUCKETS_MS = [25, 50, 100, 250, 500, 1000, 2500, 5000];

const state = {
  httpRequestsTotal: 0,
  httpRequestDurationMsSum: 0,
  httpRequestDurationMsCount: 0,
  httpRequestDurationBuckets: REQUEST_DURATION_BUCKETS_MS.map((bucket) => ({ bucket, value: 0 })),
  scoringErrorsTotal: 0,
  scoringErrorsBySource: {},
};

function normalizePath(pathname = "") {
  if (!pathname) {
    return "unknown";
  }
  return pathname
    .replace(/\d+/g, ":id")
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":uuid")
    .slice(0, 160);
}

function recordRequest(req, res, durationMs) {
  if (!req?.originalUrl?.startsWith("/api/")) {
    return;
  }

  state.httpRequestsTotal += 1;
  state.httpRequestDurationMsCount += 1;
  state.httpRequestDurationMsSum += durationMs;

  for (const item of state.httpRequestDurationBuckets) {
    if (durationMs <= item.bucket) {
      item.value += 1;
    }
  }

  res.locals.metrics = {
    method: req.method || "UNKNOWN",
    route: normalizePath(req.path || req.originalUrl || ""),
    statusCode: Number(res.statusCode || 0),
  };
}

function incrementScoringError(source = "unknown") {
  state.scoringErrorsTotal += 1;
  state.scoringErrorsBySource[source] = (state.scoringErrorsBySource[source] || 0) + 1;
}

function getMetricsSnapshot() {
  const p95Bucket = state.httpRequestDurationBuckets.find((bucket) => bucket.value >= Math.ceil(state.httpRequestDurationMsCount * 0.95));

  return {
    api: {
      sampleSize: state.httpRequestDurationMsCount,
      p95LatencyMs: p95Bucket ? p95Bucket.bucket : 0,
    },
    scoring: {
      errorsTotal: state.scoringErrorsTotal,
      bySource: state.scoringErrorsBySource,
    },
  };
}

function toPrometheusMetrics() {
  const lines = [];
  lines.push("# HELP http_requests_total Total HTTP API requests count");
  lines.push("# TYPE http_requests_total counter");
  lines.push(`http_requests_total ${state.httpRequestsTotal}`);
  lines.push("");

  lines.push("# HELP http_request_duration_ms HTTP API request latency in milliseconds");
  lines.push("# TYPE http_request_duration_ms histogram");
  for (const bucket of state.httpRequestDurationBuckets) {
    lines.push(`http_request_duration_ms_bucket{le="${bucket.bucket}"} ${bucket.value}`);
  }
  lines.push(`http_request_duration_ms_bucket{le="+Inf"} ${state.httpRequestDurationMsCount}`);
  lines.push(`http_request_duration_ms_sum ${state.httpRequestDurationMsSum.toFixed(2)}`);
  lines.push(`http_request_duration_ms_count ${state.httpRequestDurationMsCount}`);
  lines.push("");

  lines.push("# HELP scoring_errors_total Total scoring errors");
  lines.push("# TYPE scoring_errors_total counter");
  lines.push(`scoring_errors_total ${state.scoringErrorsTotal}`);
  for (const [source, value] of Object.entries(state.scoringErrorsBySource)) {
    lines.push(`scoring_errors_total_by_source{source="${source}"} ${value}`);
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function metricsMiddleware(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const finishedAt = process.hrtime.bigint();
    const durationMs = Number(finishedAt - startedAt) / 1_000_000;
    if (!Number.isFinite(durationMs) || durationMs < 0) {
      return;
    }

    recordRequest(req, res, durationMs);
  });

  next();
}

module.exports = {
  metricsMiddleware,
  incrementScoringError,
  getMetricsSnapshot,
  toPrometheusMetrics,
};
