<template>
  <div class="profile-page">
    <!-- Кнопка настроек -->
    <button class="settings-btn" @click="handleSettings">
      <Settings :size="22" />
    </button>

    <!-- Шапка профиля -->
    <div class="profile-header">
      <div class="avatar-wrap">
        <img v-if="user?.avatar" :src="user.avatar" :alt="user?.firstName" class="avatar-img" />
        <span v-else class="avatar-initials">{{ userStore.initials }}</span>
      </div>

      <h1 class="user-name">{{ userStore.fullName }}</h1>
      <p class="user-position">{{ user?.position }}</p>
    </div>

    <!-- Статистика: skeleton при загрузке -->
    <div class="stats-row">
      <template v-if="isStatsLoading">
        <div class="stat-item">
          <span class="sk-stat-val"></span>
          <span class="sk-stat-lbl"></span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="sk-stat-val"></span>
          <span class="sk-stat-lbl"></span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="sk-stat-val"></span>
          <span class="sk-stat-lbl"></span>
        </div>
      </template>
      <template v-else>
        <div class="stat-item">
          <span class="stat-value">{{ statsData.courses }}</span>
          <span class="stat-label">Курсы</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ statsData.completed }}</span>
          <span class="stat-label">Завершено</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ statsData.certificates }}</span>
          <span class="stat-label">Сертификаты</span>
        </div>
      </template>
    </div>

    <!-- Меню -->
    <div class="menu-card">
      <button class="menu-item" @click="handleAchievements">
        <span class="menu-icon-wrap">
          <Star :size="20" class="menu-icon" />
        </span>
        <span class="menu-label">Мои достижения</span>
        <ChevronRight :size="18" class="menu-chevron" />
      </button>

      <div class="menu-divider"></div>

      <button class="menu-item" @click="handleHistory">
        <span class="menu-icon-wrap">
          <Clock :size="20" class="menu-icon" />
        </span>
        <span class="menu-label">История обучения</span>
        <ChevronRight :size="18" class="menu-chevron" />
      </button>

      <div class="menu-divider"></div>

      <button class="menu-item" @click="handleCertificates">
        <span class="menu-icon-wrap">
          <Award :size="20" class="menu-icon" />
        </span>
        <span class="menu-label">Сертификаты</span>
        <ChevronRight :size="18" class="menu-chevron" />
      </button>

      <div class="menu-divider"></div>

      <button class="menu-item" @click="handleSettings">
        <span class="menu-icon-wrap">
          <Settings :size="20" class="menu-icon" />
        </span>
        <span class="menu-label">Настройки</span>
        <ChevronRight :size="18" class="menu-chevron" />
      </button>

      <div class="menu-divider"></div>

      <button class="menu-item menu-item--logout" @click="handleLogout">
        <span class="menu-icon-wrap menu-icon-wrap--logout">
          <LogOut :size="20" class="menu-icon menu-icon--logout" />
        </span>
        <span class="menu-label menu-label--logout">Выйти</span>
        <ChevronRight :size="18" class="menu-chevron" />
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { Settings, Star, Clock, Award, LogOut, ChevronRight } from "lucide-vue-next";
import { useUserStore } from "../stores/user";
import { useTelegramStore } from "../stores/telegram";
import { useRouter } from "vue-router";
import { apiClient } from "../services/apiClient";

export default {
  name: "ProfileView",
  components: {
    Settings,
    Star,
    Clock,
    Award,
    LogOut,
    ChevronRight,
  },
  setup() {
    const userStore = useUserStore();
    const telegramStore = useTelegramStore();
    const router = useRouter();

    const user = computed(() => userStore.user);

    const isStatsLoading = ref(true);
    const statsData = ref({
      courses: 0,
      completed: 0,
      certificates: 0,
    });

    async function loadStats() {
      isStatsLoading.value = true;
      try {
        if (!userStore.isInitialized) {
          await userStore.ensureStatus();
        }

        const [coursesResponse, overviewResponse] = await Promise.all([
          apiClient.listCourses().catch(() => null),
          userStore.loadOverview().catch(() => null),
        ]);

        const coursesList = coursesResponse?.courses || [];
        const total = coursesList.length;
        const completed = coursesList.filter((c) => c.progress?.status === "completed").length;

        const overview = overviewResponse || userStore.overview;
        const badges = Array.isArray(overview?.badges) ? overview.badges : [];
        const earnedBadges = badges.filter((b) => b.earned).length;

        statsData.value = {
          courses: total,
          completed,
          certificates: earnedBadges,
        };
      } catch (error) {
        console.warn("Не удалось загрузить статистику профиля", error);
      } finally {
        isStatsLoading.value = false;
      }
    }

    function handleAchievements() {
      telegramStore.hapticFeedback("impact", "light");
      telegramStore.showAlert("Раздел «Мои достижения» будет доступен в следующем обновлении");
    }

    function handleHistory() {
      telegramStore.hapticFeedback("impact", "light");
      router.push("/assessments");
    }

    function handleCertificates() {
      telegramStore.hapticFeedback("impact", "light");
      telegramStore.showAlert("Раздел «Сертификаты» будет доступен в следующем обновлении");
    }

    function handleSettings() {
      telegramStore.hapticFeedback("impact", "light");
      telegramStore.showAlert("Раздел «Настройки» будет доступен в следующем обновлении");
    }

    async function handleLogout() {
      telegramStore.hapticFeedback("impact", "medium");
      userStore.logout();
      router.push("/invitation");
    }

    onMounted(() => {
      loadStats();
    });

    return {
      userStore,
      user,
      statsData,
      isStatsLoading,
      handleAchievements,
      handleHistory,
      handleCertificates,
      handleSettings,
      handleLogout,
    };
  },
};
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background-color: var(--bg-secondary);
  padding-bottom: 80px;
  position: relative;
}

.settings-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 50%;
  transition: background-color 0.15s ease;
  z-index: 1;
}

.settings-btn:active {
  background-color: var(--divider);
}

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px 28px;
  background-color: var(--bg-primary);
}

.avatar-wrap {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background-color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-bottom: 16px;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  font-size: 34px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -1px;
}

.user-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
  text-align: center;
  line-height: 1.25;
}

.user-position {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.4;
}

.stats-row {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-primary);
  padding: 20px 0 24px;
  gap: 0;
  border-top: 1px solid var(--divider);
  margin-bottom: 16px;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.3;
}

.stat-divider {
  width: 1px;
  height: 36px;
  background-color: var(--divider);
  flex-shrink: 0;
}

.menu-card {
  background-color: var(--bg-primary);
  border-radius: 16px;
  margin: 0 16px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease;
}

.menu-item:active {
  background-color: var(--bg-secondary);
}

.menu-icon-wrap {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background-color: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.menu-icon {
  color: var(--text-secondary);
}

.menu-label {
  flex: 1;
  font-size: 15px;
  font-weight: 400;
  color: var(--text-primary);
  line-height: 1.4;
}

.menu-chevron {
  color: var(--text-secondary);
  flex-shrink: 0;
  opacity: 0.5;
}

.menu-divider {
  height: 1px;
  background-color: var(--divider);
  margin-left: 68px;
}

.menu-icon-wrap--logout {
  background-color: rgba(255, 59, 48, 0.1);
}

.menu-icon--logout {
  color: var(--error);
}

.menu-label--logout {
  color: var(--error);
}

/* ── Skeleton статистики ── */
@keyframes sk-shimmer {
  0% {
    background-position: -300px 0;
  }
  100% {
    background-position: 300px 0;
  }
}

.sk-stat-val,
.sk-stat-lbl {
  display: block;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--divider) 50%, var(--bg-secondary) 75%);
  background-size: 600px 100%;
  animation: sk-shimmer 1.4s infinite linear;
}

.sk-stat-val {
  width: 36px;
  height: 22px;
  margin-bottom: 6px;
}

.sk-stat-lbl {
  width: 48px;
  height: 12px;
}
</style>
