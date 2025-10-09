import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { apiClient } from "../services/apiClient";

function formatPercentage(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value);
}

function placeholder(value, fallback = "—") {
  return value == null || value === "" ? fallback : value;
}

function normalizeUser(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.telegramId || "—",
    email: "—",
    phone: "—",
    positionId: user.positionId,
    position: placeholder(user.positionName),
    branchId: user.branchId,
    branch: placeholder(user.branchName),
    status: "active",
    role: user.roleName || "user",
    dateJoined: user.createdAt,
    lastSeen: user.updatedAt,
    assessmentsCompleted: user.completedAssessments || 0,
    averageScore: formatPercentage(user.averageScore),
    avatar: user.avatarUrl || null,
    points: user.points || 0,
    level: user.level || 1,
  };
}

function normalizeInvitation(invitation) {
  const expiresAt = invitation.expires_at ? new Date(invitation.expires_at) : null;
  const usedAt = invitation.used_at ? new Date(invitation.used_at) : null;
  const now = Date.now();

  let status = "sent";
  if (usedAt) {
    status = "used";
  } else if (expiresAt && expiresAt.getTime() < now) {
    status = "expired";
  } else {
    status = "active";
  }

  return {
    id: invitation.id,
    code: invitation.code,
    firstName: invitation.first_name,
    lastName: invitation.last_name,
    roleName: invitation.role_name,
    branchId: invitation.branch_id ? Number(invitation.branch_id) : null,
    branchName: invitation.branch_name || "—",
    createdAt: invitation.created_at,
    expiresAt: invitation.expires_at,
    usedAt: invitation.used_at || null,
    usedBy: invitation.used_by || null,
    usedByName: invitation.used_by_name || null,
    usedByTelegramId: invitation.used_by_telegram_id || null,
    status,
  };
}

function normalizeAssessmentSummary(assessment) {
  return {
    id: assessment.id,
    title: assessment.title,
    description: assessment.description || "",
    status: assessment.status,
    assignedCount: assessment.assignedCount || 0,
    completedCount: assessment.completedCount || 0,
    passScorePercent: assessment.passScorePercent || 0,
    timeLimitMinutes: assessment.timeLimitMinutes || 0,
    createdAt: assessment.createdAt || null,
    updatedAt: assessment.updatedAt || null,
  };
}

export const useAdminStore = defineStore("admin", () => {
  const isLoading = ref(false);
  const users = ref([]);
  const branches = ref([]);
  const assessments = ref([]);
  const invitations = ref([]);
  const statistics = ref({
    overview: {
      totalUsers: 0,
      activeUsers: 0,
      totalAssessments: 0,
      completedAssessments: 0,
      averageScore: 0,
      totalBranches: 0,
    },
    assessmentStats: [],
    branchStats: [],
    recentActivity: [],
  });

  const totalUsers = computed(() => users.value.length);
  const activeUsers = computed(() => users.value.length);
  const totalBranches = computed(() => branches.value.length);
  const pendingInvitations = computed(() => invitations.value.filter((item) => item.status === "active").length);

  async function loadReferences() {
    try {
      const data = await apiClient.getReferences();
      branches.value = data.branches || [];
    } catch (error) {
      console.error("Не удалось загрузить справочники", error);
    }
  }

  async function fetchUsers() {
    try {
      const { users: data } = await apiClient.listUsers();
      users.value = Array.isArray(data) ? data.map(normalizeUser) : [];
    } catch (error) {
      console.error("Не удалось загрузить пользователей", error);
      users.value = [];
    }
  }

  async function updateUser(id, payload) {
    try {
      const response = await apiClient.updateUser(id, payload);
      const updated = normalizeUser(response.user);
      const index = users.value.findIndex((user) => user.id === updated.id);
      if (index !== -1) {
        users.value.splice(index, 1, updated);
      } else {
        users.value.push(updated);
      }
      return updated;
    } catch (error) {
      console.error("Не удалось обновить пользователя", error);
      throw error;
    }
  }

  async function deleteUser(id) {
    try {
      await apiClient.deleteUser(id);
      users.value = users.value.filter((user) => user.id !== id);
    } catch (error) {
      console.error("Не удалось удалить пользователя", error);
      throw error;
    }
  }

  function addUser() {
    throw new Error("Создание пользователей недоступно. Используйте приглашения для новых сотрудников.");
  }

  async function fetchInvitations() {
    try {
      const { invitations: data } = await apiClient.listInvitations();
      invitations.value = Array.isArray(data) ? data.map(normalizeInvitation) : [];
    } catch (error) {
      console.error("Не удалось загрузить приглашения", error);
      invitations.value = [];
    }
  }

  async function createInvitation(payload) {
    const { invitation } = await apiClient.createInvitation(payload);
    if (invitation) {
      invitations.value.unshift(normalizeInvitation(invitation));
    }
    return invitation;
  }

  async function updateInvitation(id, payload) {
    const { invitation } = await apiClient.updateInvitation(id, payload);
    if (invitation) {
      const index = invitations.value.findIndex((item) => item.id === invitation.id);
      if (index !== -1) {
        invitations.value.splice(index, 1, normalizeInvitation(invitation));
      }
    }
    return invitation;
  }

  async function extendInvitation(id, payload) {
    const { invitation } = await apiClient.extendInvitation(id, payload);
    if (invitation) {
      const index = invitations.value.findIndex((item) => item.id === invitation.id);
      if (index !== -1) {
        invitations.value.splice(index, 1, normalizeInvitation(invitation));
      }
    }
    return invitation;
  }

  async function deleteInvitation(id) {
    await apiClient.deleteInvitation(id);
    invitations.value = invitations.value.filter((item) => item.id !== id);
  }

  async function fetchAssessments() {
    try {
      const { assessments: data } = await apiClient.listAssessmentsAdmin();
      assessments.value = Array.isArray(data) ? data.map(normalizeAssessmentSummary) : [];
    } catch (error) {
      console.error("Не удалось загрузить аттестации", error);
      assessments.value = [];
    }
  }

  async function deleteAssessment(id) {
    await apiClient.deleteAssessment(id);
    assessments.value = assessments.value.filter((item) => item.id !== id);
  }

  async function fetchStatistics(filters = {}) {
    try {
      const [{ summary }, { branches: branchData }, { employees }] = await Promise.all([
        apiClient.getAnalyticsSummary(filters),
        apiClient.getAnalyticsBranches(filters),
        apiClient.getAnalyticsEmployees({ ...filters, limit: 5 }),
      ]);

      const overview = {
        totalUsers: summary.assignedUsers || 0,
        activeUsers: summary.completedAttempts || 0,
        totalAssessments: summary.totalAssessments || 0,
        completedAssessments: summary.completedAttempts || 0,
        averageScore: summary.averageScore != null ? Math.round(summary.averageScore) : 0,
        totalBranches: branches.value.length || branchData.length || 0,
      };

      const assessmentStats = assessments.value.slice(0, 5).map((item) => ({
        id: item.id,
        title: item.title,
        completions: item.completedCount,
        averageScore: overview.averageScore,
        passRate: summary.passRate || 0,
        trend: "up",
      }));

      const branchStats = (branchData || []).map((branch) => ({
        id: branch.branchId || branch.id,
        name: branch.branchName || branch.name,
        employees: branch.participants || 0,
        completed: branch.attempts || 0,
        averageScore: branch.averageScore != null ? Math.round(branch.averageScore) : 0,
        compliance: branch.passRate || 0,
      }));

      const recentActivity = (employees || []).slice(0, 5).map((employee, index) => {
        const timestamp = employee.lastCompletedAt ? new Date(employee.lastCompletedAt) : new Date();
        const formatted = new Intl.DateTimeFormat("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }).format(timestamp);
        return {
          id: `${employee.userId || index}-${index}`,
          type: "assessment_completed",
          assessment: employee.lastAssessmentTitle || "—",
          user: `${employee.firstName || ""} ${employee.lastName || ""}`.trim(),
          score: employee.lastScorePercent != null ? Math.round(employee.lastScorePercent) : "—",
          timestamp: formatted,
        };
      });

      statistics.value = {
        overview,
        assessmentStats,
        branchStats,
        recentActivity,
      };
    } catch (error) {
      console.error("Не удалось получить статистику", error);
      statistics.value = {
        overview: {
          totalUsers: 0,
          activeUsers: 0,
          totalAssessments: 0,
          completedAssessments: 0,
          averageScore: 0,
          totalBranches: branches.value.length,
        },
        assessmentStats: [],
        branchStats: [],
        recentActivity: [],
      };
    }
  }

  async function initialize() {
    isLoading.value = true;
    try {
      if (!branches.value.length) {
        await loadReferences();
      }
      await Promise.all([fetchUsers(), fetchAssessments(), fetchInvitations()]);
      await fetchStatistics();
    } finally {
      isLoading.value = false;
    }
  }

  return {
    // state
    isLoading,
    users,
    branches,
    assessments,
    invitations,
    statistics,

    // getters
    totalUsers,
    activeUsers,
    totalBranches,
    pendingInvitations,

    // actions
    initialize,
    loadReferences,
    fetchUsers,
    updateUser,
    deleteUser,
    addUser,
    fetchInvitations,
    createInvitation,
    updateInvitation,
    extendInvitation,
    deleteInvitation,
    fetchAssessments,
    deleteAssessment,
    fetchStatistics,
  };
});
