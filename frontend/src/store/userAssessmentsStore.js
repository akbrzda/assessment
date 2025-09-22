import { defineStore } from 'pinia';
import { apiClient } from '../services/apiClient';

function normalizePercent(value) {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Number(value) : null;
  }
  if (typeof value === 'string') {
    const match = value.replace(/,/g, '.').match(/-?\d+(?:\.\d+)?/);
    if (!match) {
      return null;
    }
    const parsed = Number.parseFloat(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function prepareAssessmentItem(item) {
  const passScore = normalizePercent(item.passScorePercent);
  const lastScore = normalizePercent(item.lastScorePercent);
  const explicitBest = normalizePercent(item.bestScorePercent);
  const candidateScores = [explicitBest, lastScore].filter((value) => value != null);
  const bestScore = candidateScores.length ? Math.max(...candidateScores) : null;
  const threshold = passScore != null ? passScore : 0;
  const hasPassed = bestScore != null ? bestScore >= threshold : false;
  const timeLimitMinutes = item.timeLimitMinutes != null ? Number(item.timeLimitMinutes) : null;
  const lastAttemptStatus = item.lastAttemptStatus || null;
  const lastAttemptStartedAt = item.lastAttemptStartedAt || item.lastStartedAt || null;
  const normalizedStartedAt = lastAttemptStartedAt ? new Date(lastAttemptStartedAt).toISOString() : null;
  const remainingSeconds = item.timeRemainingSeconds != null ? Number(item.timeRemainingSeconds) : null;
  const hasActiveAttempt = lastAttemptStatus === 'in_progress';
  const nowTs = Date.now();
  const baseExpectedEnd = (() => {
    if (!hasActiveAttempt) {
      return null;
    }
    if (remainingSeconds != null) {
      return nowTs + remainingSeconds * 1000;
    }
    if (normalizedStartedAt && timeLimitMinutes != null) {
      const startedAtMs = new Date(normalizedStartedAt).getTime();
      if (Number.isFinite(startedAtMs)) {
        return startedAtMs + timeLimitMinutes * 60 * 1000;
      }
    }
    return null;
  })();

  return {
    ...item,
    passScorePercent: passScore,
    lastScorePercent: lastScore,
    bestScorePercent: bestScore,
    timeLimitMinutes,
    lastAttemptStatus,
    lastAttemptStartedAt: normalizedStartedAt,
    hasPassed,
    hasActiveAttempt,
    timeRemainingSeconds: remainingSeconds,
    expectedEndAt: baseExpectedEnd
  };
}

export const useUserAssessmentsStore = defineStore('userAssessments', {
  state: () => ({
    isLoading: false,
    error: null,
    assessments: []
  }),
  actions: {
    async fetchAssessments() {
      this.isLoading = true;
      this.error = null;
      try {
        const { assessments } = await apiClient.listUserAssessments();
        this.assessments = (assessments || []).map((item) => prepareAssessmentItem(item));
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    applyAssessmentResult({ assessment, attempt, history }) {
      if (!assessment?.id) {
        return;
      }
      const index = this.assessments.findIndex((item) => item.id === assessment.id);
      if (index === -1) {
        return;
      }

      const current = this.assessments[index];
      const passScore = normalizePercent(assessment.passScorePercent ?? current.passScorePercent);
      const attempts = [];
      if (attempt) {
        attempts.push(attempt);
      }
      if (Array.isArray(history)) {
        attempts.push(...history);
      }

      const normalizedAttempts = attempts
        .map((item) => ({
          score: normalizePercent(item?.scorePercent),
          attemptNumber: item?.attemptNumber ?? item?.attempt_number ?? null,
          status: item?.status || (item?.passed != null ? 'completed' : null),
          passed:
            item?.passed != null
              ? Boolean(item.passed)
              : (() => {
                  const value = normalizePercent(item?.scorePercent);
                  if (value == null) {
                    return false;
                  }
                  const threshold = passScore != null ? passScore : 0;
                  return value >= threshold;
                })()
        }))
        .filter((item) => item.score != null || item.status != null);

      const bestScoreCandidate = normalizedAttempts.reduce((max, item) => {
        if (item.score == null) {
          return max;
        }
        if (max == null || item.score > max) {
          return item.score;
        }
        return max;
      }, current.bestScorePercent ?? null);

      const hasPassed = normalizedAttempts.some((item) => item.passed) || current.hasPassed;
      const lastAttemptScore = normalizePercent(attempt?.scorePercent);
      const lastAttemptStatus = attempt?.status || current.lastAttemptStatus || (attempt ? 'completed' : null);
      const lastAttemptNumber = attempt?.attemptNumber ?? current.lastAttemptNumber ?? null;
      const lastAttemptId = attempt?.id ?? current.lastAttemptId ?? null;
      const lastAttemptStartedAt = attempt?.startedAt || current.lastAttemptStartedAt || null;
      const lastRemainingSeconds = attempt?.remainingSeconds != null ? Number(attempt.remainingSeconds) : null;

      const updated = prepareAssessmentItem({
        ...current,
        passScorePercent: passScore,
        lastAttemptId,
        lastAttemptNumber,
        lastAttemptStatus,
        lastScorePercent: lastAttemptScore ?? current.lastScorePercent,
        bestScorePercent: bestScoreCandidate,
        hasPassed,
        lastAttemptStartedAt,
        timeRemainingSeconds: lastRemainingSeconds
      });

      this.assessments.splice(index, 1, updated);
    }
  }
});
