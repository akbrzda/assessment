import { getInitData } from "./telegram";
import { API_BASE_URL } from "@/env";

const envBaseUrl = (API_BASE_URL || "").trim();
const runtimeBaseUrl = typeof window !== "undefined" && window.location ? window.location.origin : "";
const BASE_URL = (envBaseUrl || runtimeBaseUrl || "").replace(/\/$/, "");

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const isBlob = options.responseType === "blob";

  if (!isBlob) {
    headers.set("Content-Type", "application/json");
  }

  const initData = getInitData();
  if (initData) {
    headers.set("x-telegram-init-data", initData);
  }

  // Добавляем код приглашения через отдельный заголовок
  const inviteCode = typeof window !== "undefined" ? window.__telegramInviteCode : null;
  if (inviteCode) {
    headers.set("x-invite-code", inviteCode);
    console.log("📤 Отправляем код приглашения:", inviteCode);
  }

  const targetUrl = BASE_URL ? `${BASE_URL}${path}` : path;
  const response = await fetch(targetUrl, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.error || "Произошла ошибка";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  if (isBlob) {
    return response.blob();
  }

  return response.json();
}

export const apiClient = {
  getStatus() {
    return request("/auth/status", { method: "POST" });
  },
  register(payload) {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getProfile() {
    return request("/auth/profile");
  },
  updateProfile(payload) {
    return request("/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  getReferences() {
    return request("/auth/references");
  },
  listUserAssessments() {
    return request("/assessments/user");
  },
  getUserAssessment(id) {
    return request(`/assessments/user/${id}`);
  },
  startAssessmentAttempt(id) {
    return request(`/assessments/${id}/attempts`, {
      method: "POST",
    });
  },
  submitAssessmentAnswer(assessmentId, attemptId, payload) {
    return request(`/assessments/${assessmentId}/attempts/${attemptId}/answers`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  completeAssessmentAttempt(assessmentId, attemptId) {
    return request(`/assessments/${assessmentId}/attempts/${attemptId}/complete`, {
      method: "POST",
    });
  },
  getAssessmentAttemptResult(assessmentId, attemptId) {
    return request(`/assessments/${assessmentId}/attempts/${attemptId}`);
  },
  getGamificationOverview() {
    return request("/gamification/overview");
  },
  getGamificationBadges() {
    return request("/gamification/badges");
  },
  getLeaderboardUsers(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.branchId && Number.isFinite(Number(params.branchId))) {
      searchParams.set("branchId", String(params.branchId));
    }
    if (params.positionId && Number.isFinite(Number(params.positionId))) {
      searchParams.set("positionId", String(params.positionId));
    }
    if (params.limit && Number.isFinite(Number(params.limit))) {
      searchParams.set("limit", String(params.limit));
    }
    const query = searchParams.toString();
    const path = query ? `/leaderboard/users?${query}` : "/leaderboard/users";
    return request(path);
  },
};
