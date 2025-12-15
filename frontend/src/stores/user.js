import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { apiClient } from "../services/apiClient";
import { useTelegramStore } from "./telegram";
import { getItem, setItem } from "../services/storage";

const STORAGE_INVITE_ACCEPTED = "invite_accepted";

function computeInitials(user) {
  if (!user?.firstName || !user?.lastName) {
    return "";
  }
  return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
}

function mapUserPayload(baseUser, overview) {
  if (!baseUser) {
    return null;
  }

  const nextLevel = overview?.nextLevel;
  const levelInfo = overview?.levelInfo;
  const points = Number(baseUser.points || overview?.user?.points || 0);
  const nextLevelPoints = (() => {
    if (nextLevel?.minPoints != null) {
      return Number(nextLevel.minPoints);
    }
    if (levelInfo?.minPoints != null && levelInfo?.maxPoints != null) {
      return Number(levelInfo.maxPoints);
    }
    if (overview?.levels?.length) {
      const higher = overview.levels.find((level) => level.minPoints > points);
      if (higher) {
        return Number(higher.minPoints);
      }
    }
    return points;
  })();

  return {
    id: baseUser.id,
    telegramId: baseUser.telegramId,
    firstName: baseUser.firstName,
    lastName: baseUser.lastName,
    fullName: `${baseUser.firstName} ${baseUser.lastName}`.trim(),
    branchId: baseUser.branchId,
    branch: baseUser.branchName || baseUser.branch,
    branchName: baseUser.branchName || baseUser.branch,
    positionId: baseUser.positionId,
    position: baseUser.positionName || baseUser.position,
    positionName: baseUser.positionName || baseUser.position,
    roleId: baseUser.roleId,
    role: baseUser.roleName || baseUser.role,
    roleName: baseUser.roleName || baseUser.role,
    level: overview?.levelInfo?.name || baseUser.level,
    levelNumber: overview?.levelInfo?.levelNumber || null,
    points,
    nextLevelPoints: Math.max(nextLevelPoints, points),
    avatar: baseUser.avatarUrl || overview?.user?.avatarUrl || null,
  };
}

export const useUserStore = defineStore("user", () => {
  const isLoading = ref(false);
  const isInitialized = ref(false);
  const user = ref(null);
  const references = ref({ branches: [], positions: [], roles: [] });
  const registrationDefaults = ref({ firstName: "", lastName: "", avatarUrl: null });
  const invitation = ref(null);
  const invitationAccepted = ref(false);
  const overview = ref(null);
  const overviewLoading = ref(false);
  let overviewPromise = null;
  const error = ref(null);

  const isAuthenticated = computed(() => Boolean(user.value));
  const fullName = computed(() => user.value?.fullName || "");
  const initials = computed(() => computeInitials(user.value));

  async function loadReferences() {
    try {
      const data = await apiClient.getReferences();
      references.value = {
        branches: data.branches || [],
        positions: data.positions || [],
        roles: data.roles || [],
      };
    } catch (err) {
      console.error("Не удалось загрузить справочники", err);
    }
  }

  async function loadOverview({ force = false } = {}) {
    if (overview.value && !force && !overviewLoading.value) {
      return overview.value;
    }

    if (overviewPromise && !force) {
      return overviewPromise;
    }

    overviewPromise = (async () => {
      overviewLoading.value = true;
      try {
        const response = await apiClient.getGamificationOverview();
        overview.value = response?.overview || null;
        if (user.value && overview.value) {
          user.value = mapUserPayload(user.value, overview.value);
        }
        return overview.value;
      } catch (err) {
        console.error("Не удалось загрузить геймификацию", err);
        throw err;
      } finally {
        overviewLoading.value = false;
        overviewPromise = null;
      }
    })();

    return overviewPromise;
  }

  async function ensureStatus({ force = false } = {}) {
    if (isInitialized.value && !force) {
      return { success: Boolean(user.value), user: user.value };
    }

    isLoading.value = true;
    error.value = null;

    try {
      const accepted = await getItem(STORAGE_INVITE_ACCEPTED);
      invitationAccepted.value = Boolean(accepted);

      const status = await apiClient.getStatus();

      if (status.registered) {
        user.value = mapUserPayload(status.user, overview.value);
        invitation.value = null;
        invitationAccepted.value = true;
        if (!overview.value || force) {
          loadOverview({ force: Boolean(force) }).catch((err) => {
            console.error("Не удалось обновить данные геймификации", err);
          });
        }
      } else {
        user.value = null;
        registrationDefaults.value = status.defaults || { firstName: "", lastName: "", avatarUrl: null };
        invitation.value = status.invitation || null;
        if (!invitation.value) {
          invitationAccepted.value = true;
        } else {
          invitationAccepted.value = false;
        }
        await loadReferences();
      }

      isInitialized.value = true;
      return { success: Boolean(user.value), user: user.value };
    } catch (err) {
      console.error("Ошибка получения статуса", err);
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function register(payload) {
    isLoading.value = true;
    error.value = null;
    try {
      const telegramStore = useTelegramStore();
      const response = await apiClient.register(payload);
      const mapped = mapUserPayload(response.user, overview.value);
      user.value = mapped;

      // Очищаем данные приглашения после успешной регистрации
      invitation.value = null;
      invitationAccepted.value = false;
      await setItem(STORAGE_INVITE_ACCEPTED, false);

      registrationDefaults.value = {
        firstName: telegramStore.user?.first_name || mapped.firstName || "",
        lastName: telegramStore.user?.last_name || mapped.lastName || "",
        avatarUrl: telegramStore.user?.photo_url || null,
      };
      await loadOverview({ force: true });
      return { success: true };
    } catch (err) {
      console.error("Ошибка регистрации", err);
      error.value = err.message;
      return { success: false, error: err.message };
    } finally {
      isLoading.value = false;
    }
  }

  async function updateProfile(payload) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.updateProfile(payload);
      const mapped = mapUserPayload(response.user, overview.value);
      user.value = mapped;
      await loadOverview({ force: true });
      return { success: true };
    } catch (err) {
      console.error("Ошибка обновления профиля", err);
      error.value = err.message;
      return { success: false, error: err.message };
    } finally {
      isLoading.value = false;
    }
  }

  async function acceptInvitation() {
    if (!invitation.value) {
      throw new Error("Нет активного приглашения");
    }

    isLoading.value = true;
    error.value = null;

    try {
      const telegramStore = useTelegramStore();

      // Формируем payload для регистрации из данных приглашения
      // positionId не передаем - бэкенд определит должность по роли
      const payload = {
        firstName: invitation.value.firstName,
        lastName: invitation.value.lastName,
        branchId: invitation.value.branchId,
        inviteCode: invitation.value.code,
      };

      // Выполняем регистрацию
      const response = await apiClient.register(payload);
      const mapped = mapUserPayload(response.user, overview.value);
      user.value = mapped;

      // Очищаем данные приглашения после успешной регистрации
      invitation.value = null;
      invitationAccepted.value = false;
      await setItem(STORAGE_INVITE_ACCEPTED, false);

      registrationDefaults.value = {
        firstName: telegramStore.user?.first_name || mapped.firstName || "",
        lastName: telegramStore.user?.last_name || mapped.lastName || "",
        avatarUrl: telegramStore.user?.photo_url || null,
      };

      await loadOverview({ force: true });
      return { success: true };
    } catch (err) {
      console.error("Ошибка принятия приглашения", err);
      error.value = err.message;
      return { success: false, error: err.message };
    } finally {
      isLoading.value = false;
    }
  }

  function logout() {
    user.value = null;
    overview.value = null;
    isInitialized.value = false;
  }

  return {
    // state
    isLoading,
    isInitialized,
    user,
    references,
    registrationDefaults,
    invitation,
    invitationAccepted,
    overview,
    overviewLoading,
    error,

    // getters
    isAuthenticated,
    fullName,
    initials,

    // actions
    ensureStatus,
    loadReferences,
    loadOverview,
    register,
    updateProfile,
    acceptInvitation,
    logout,
  };
});
