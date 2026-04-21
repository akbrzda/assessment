import { getInitData } from "./telegram";
import { getTelegramInviteCode } from "./telegramRuntimeState";
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
  const inviteCode = getTelegramInviteCode();
  if (inviteCode) {
    headers.set("x-invite-code", inviteCode);
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
    if (errorBody.code) {
      error.code = errorBody.code;
    }
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
  updateTimezone(timezone) {
    return request("/auth/timezone", {
      method: "PATCH",
      body: JSON.stringify({ timezone }),
    });
  },
  getReferences() {
    return request("/auth/references");
  },
  listUserAssessments(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.page && Number.isFinite(Number(params.page))) {
      searchParams.set("page", String(params.page));
    }
    if (params.limit && Number.isFinite(Number(params.limit))) {
      searchParams.set("limit", String(params.limit));
    }

    const query = searchParams.toString();
    const path = query ? `/assessments/user?${query}` : "/assessments/user";
    return request(path);
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
  submitAssessmentAnswersBatch(assessmentId, attemptId, payload) {
    return request(`/assessments/${assessmentId}/attempts/${attemptId}/answers/batch`, {
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
  getAssessmentTheory(assessmentId) {
    return request(`/assessments/${assessmentId}/theory`);
  },
  completeAssessmentTheory(assessmentId, payload) {
    return request(`/assessments/${assessmentId}/theory/completion`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  listCourses() {
    return request("/courses");
  },
  getCourseById(id) {
    return request(`/courses/${id}`);
  },
  startCourse(id) {
    return request(`/courses/${id}/start`, {
      method: "POST",
    });
  },
  getCourseProgress(id) {
    return request(`/courses/${id}/progress`);
  },
  completeCourseModuleAttempt(moduleId, attemptId) {
    return request(`/courses/modules/${moduleId}/attempts/${attemptId}/complete`, {
      method: "POST",
    });
  },
  viewCourseTopicMaterial(topicId) {
    return request(`/courses/topics/${topicId}/view-material`, {
      method: "POST",
    });
  },
  completeCourseTopicAttempt(topicId, attemptId) {
    return request(`/courses/topics/${topicId}/attempts/${attemptId}/complete`, {
      method: "POST",
    });
  },
  completeCourseSectionAttempt(sectionId, attemptId) {
    return request(`/courses/sections/${sectionId}/attempts/${attemptId}/complete`, {
      method: "POST",
    });
  },
  getCourseFinalAssessmentAccess(courseId) {
    return request(`/courses/${courseId}/final-assessment/access`);
  },
  completeCourseFinalAssessmentAttempt(courseId, attemptId) {
    return request(`/courses/${courseId}/final-assessment/attempts/${attemptId}/complete`, {
      method: "POST",
    });
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
