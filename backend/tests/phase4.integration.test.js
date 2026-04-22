const test = require("node:test");
const assert = require("node:assert/strict");

const { pool } = require("../src/config/database");
const usersService = require("../src/modules/admin/users/service");
const assessmentModel = require("../src/models/assessmentModel");
const dashboardService = require("../src/modules/admin/dashboard/service");
const analyticsService = require("../src/modules/analytics/admin/service");

test("manager видит только пользователей своего филиала в listUsers", async () => {
  const originalQuery = pool.query;
  const captured = [];

  pool.query = async (sql, params = []) => {
    captured.push({ sql: String(sql), params: [...params] });
    if (String(sql).includes("COUNT(*) AS total")) {
      return [[{ total: 0 }]];
    }
    return [[]];
  };

  const req = {
    query: {},
    user: {
      id: 77,
      role: "manager",
      branch_id: 15,
    },
  };

  const res = {
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
    json() {},
  };

  try {
    await usersService.listUsers(req, res, (error) => {
      if (error) throw error;
    });
  } finally {
    pool.query = originalQuery;
  }

  assert.ok(captured.length >= 2, "Ожидалось минимум два SQL-запроса");
  const countQuery = captured[0];
  assert.match(countQuery.sql, /u\.branch_id = \?/);
  assert.ok(countQuery.params.includes(15), "В параметры запроса должен попадать филиал manager");
});

test("параллельный старт попытки не создает дубликаты in_progress", async () => {
  const originalGetConnection = pool.getConnection;

  const now = Date.now();
  const attempts = [];
  let attemptIdSeq = 1000;
  let assessmentLock = false;
  const lockQueue = [];

  const acquireAssessmentLock = async () => {
    if (!assessmentLock) {
      assessmentLock = true;
      return;
    }
    await new Promise((resolve) => lockQueue.push(resolve));
    assessmentLock = true;
  };

  const releaseAssessmentLock = () => {
    assessmentLock = false;
    const next = lockQueue.shift();
    if (next) {
      next();
    }
  };

  const createMockConnection = () => {
    let ownsLock = false;
    return {
      async beginTransaction() {},
      async execute(sql, params = []) {
        const query = String(sql);

        if (query.includes("FROM assessments WHERE id = ? FOR UPDATE")) {
          await acquireAssessmentLock();
          ownsLock = true;
          return [[{
            id: 1,
            title: "Тест",
            open_at: new Date(now - 60_000).toISOString(),
            close_at: new Date(now + 3_600_000).toISOString(),
            max_attempts: 3,
            time_limit_minutes: 30,
            created_by: 1,
          }]];
        }

        if (query.includes("FROM assessment_attempts") && query.includes("status = 'in_progress'")) {
          const active = attempts.find((item) => item.assessment_id === params[0] && item.user_id === params[1] && item.status === "in_progress");
          return [active ? [{ id: active.id, attempt_number: active.attempt_number, started_at: active.started_at }] : []];
        }

        if (query.includes("SELECT COUNT(*) AS total FROM assessment_attempts")) {
          const total = attempts.filter((item) => item.assessment_id === params[0] && item.user_id === params[1]).length;
          return [[{ total }]];
        }

        if (query.includes("INSERT INTO assessment_attempts")) {
          const insertId = ++attemptIdSeq;
          attempts.push({
            id: insertId,
            assessment_id: params[0],
            user_id: params[1],
            attempt_number: params[2],
            status: "in_progress",
            started_at: new Date(now).toISOString(),
          });
          return [{ insertId }];
        }

        if (query.includes("INSERT INTO assessment_attempt_questions")) {
          return [{ affectedRows: 5 }];
        }

        throw new Error(`Неожиданный SQL в тесте: ${query}`);
      },
      async commit() {
        if (ownsLock) {
          ownsLock = false;
          releaseAssessmentLock();
        }
      },
      async rollback() {
        if (ownsLock) {
          ownsLock = false;
          releaseAssessmentLock();
        }
      },
      release() {
        if (ownsLock) {
          ownsLock = false;
          releaseAssessmentLock();
        }
      },
    };
  };

  pool.getConnection = async () => createMockConnection();

  try {
    const [first, second] = await Promise.all([
      assessmentModel.createAttempt({ assessmentId: 1, userId: 42 }),
      assessmentModel.createAttempt({ assessmentId: 1, userId: 42 }),
    ]);

    assert.equal(attempts.length, 1, "Должна быть создана только одна попытка in_progress");
    assert.equal(first.id, second.id, "Оба параллельных запроса должны получить одну и ту же попытку");
  } finally {
    pool.getConnection = originalGetConnection;
  }
});

test("метрики дашборда корректно считают дельту и диапазон периода", async () => {
  const originalQuery = pool.query;
  const captured = [];

  pool.query = async (sql, params = []) => {
    const normalizedSql = String(sql).replace(/\s+/g, " ").trim();
    captured.push({ sql: normalizedSql, params: [...params] });

    if (normalizedSql.includes("SELECT COUNT(*) as count FROM assessments")) {
      if (captured.filter((entry) => entry.sql.includes("FROM assessments")).length === 1) {
        return [[{ count: 14 }]];
      }
      return [[{ count: 10 }]];
    }

    if (normalizedSql === "SELECT COUNT(*) as count FROM users WHERE 1=1") {
      return [[{ count: 45 }]];
    }

    if (normalizedSql.includes("SELECT COUNT(*) as count FROM users WHERE created_at <= ? AND 1=1")) {
      return [[{ count: 40 }]];
    }

    if (normalizedSql === "SELECT COUNT(*) as count FROM branches") {
      return [[{ count: 3 }]];
    }

    if (normalizedSql === "SELECT COUNT(*) as count FROM positions") {
      return [[{ count: 6 }]];
    }

    if (normalizedSql.includes("FROM users u") && normalizedSql.includes("ORDER BY u.points DESC")) {
      return [[{ id: 1, first_name: "Иван", last_name: "Иванов", points: 120, level: 4, branch_name: "Центр", position_name: "Пиццамейкер" }]];
    }

    if (normalizedSql.includes("AVG(aa.score_percent) as avg_success_rate")) {
      return [[{ avg_success_rate: 78.4 }]];
    }

    if (normalizedSql.includes("COUNT(DISTINCT aa.id) as total_attempts") && normalizedSql.includes("aa.started_at BETWEEN ? AND ?")) {
      if (captured.filter((entry) => entry.sql.includes("aa.started_at BETWEEN ? AND ?")).length === 1) {
        return [[{ total_attempts: 30, completed_attempts: 24, avg_score: 82.0, unique_users: 20 }]];
      }
      return [[{ total_attempts: 20, completed_attempts: 16, avg_score: 80.0, unique_users: 0 }]];
    }

    throw new Error(`Неожиданный SQL в тесте метрик: ${normalizedSql}`);
  };

  const req = {
    query: { period: "week" },
    user: { id: 7, role: "superadmin" },
  };

  let payload = null;
  const res = {
    json(data) {
      payload = data;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
  };

  try {
    await dashboardService.getMetrics(req, res);
  } finally {
    pool.query = originalQuery;
  }

  assert.ok(payload, "Ожидался payload метрик");
  assert.equal(payload.activeAssessmentsTrend.percent, 40);
  assert.equal(payload.totalUsersTrend.percent, 12.5);
  assert.equal(payload.assessmentStats.trends.attempts.percent, 50);
  assert.equal(payload.assessmentStats.trends.completed.percent, 50);
  assert.equal(payload.assessmentStats.trends.avgScore.percent, 2.5);

  const firstAssessmentsQuery = captured.find((entry) => entry.sql.includes("FROM assessments"));
  assert.ok(firstAssessmentsQuery, "Ожидался запрос к assessments");
  const dateTo = new Date(firstAssessmentsQuery.params[0]);
  const dateFrom = new Date(firstAssessmentsQuery.params[1]);
  const diffMs = dateTo.getTime() - dateFrom.getTime();
  const expectedMs = 7 * 24 * 60 * 60 * 1000;
  assert.ok(Math.abs(diffMs - expectedMs) < 5 * 60 * 1000, "Диапазон week должен быть близок к 7 дням");
});

test("аналитика причин провалов корректно считает доли таймаута и неверных ответов", async () => {
  const originalQuery = pool.query;
  const captured = [];

  pool.query = async (sql, params = []) => {
    captured.push({ sql: String(sql), params: [...params] });
    return [[{ timeout_count: 3, wrong_answers_count: 7, total_failed: 10 }]];
  };

  const req = {
    query: {
      dateFrom: "2026-04-01T00:00:00.000Z",
      dateTo: "2026-04-22T23:59:59.999Z",
      branchId: "2",
    },
    user: { id: 9, role: "superadmin" },
  };

  let payload = null;
  const res = {
    json(data) {
      payload = data;
    },
  };

  try {
    await analyticsService.getFailureReasons(req, res, (error) => {
      if (error) throw error;
    });
  } finally {
    pool.query = originalQuery;
  }

  assert.ok(payload, "Ожидался payload по причинам провалов");
  assert.equal(payload.totalFailed, 10);
  assert.equal(payload.timeout.count, 3);
  assert.equal(payload.timeout.percent, 30);
  assert.equal(payload.wrongAnswers.count, 7);
  assert.equal(payload.wrongAnswers.percent, 70);
  assert.ok(captured[0].params.includes(2), "Фильтр branchId должен передаваться числом");
});
