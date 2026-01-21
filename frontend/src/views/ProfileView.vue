<template>
  <div class="page-container">
    <div class="container">
      <!-- User Avatar and Info -->
      <div class="profile-header">
        <div class="avatar-section mb-20">
          <div class="avatar-large">
            <img v-if="user?.avatar" :src="user.avatar" :alt="user?.firstName" />
            <span v-else class="initials">{{ userStore.initials }}</span>
          </div>
        </div>

        <div class="user-info mb-24">
          <h1 class="title-large mb-8">{{ userStore.fullName }}</h1>
          <p class="body-medium text-secondary">{{ user?.position }} • {{ getBranchName(user?.branch) }}</p>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons mb-24">
          <button class="btn-icon profile-edit" @click="editProfile">
            <Pencil />
          </button>
          <button v-if="debugConsoleReady" class="btn-icon debug-btn" @click="toggleDebugConsole" title="Консоль отладки">🔧</button>
        </div>
      </div>

      <!-- Level Progress -->
      <div v-if="overviewReady" class="card mb-12">
        <h3 class="title-small mb-16">Уровень: {{ user?.level }}</h3>

        <div class="progress-section">
          <div class="progress-bar mb-8">
            <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
          </div>

          <div class="progress-info">
            <span class="body-small">{{ user?.points }} / {{ user?.nextLevelPoints }} очков</span>
          </div>
        </div>
      </div>
      <div v-else class="card skeleton-card mb-12">
        <div class="skeleton-title mb-12"></div>
        <div class="skeleton-line mb-8"></div>
        <div class="skeleton-line w-60"></div>
      </div>

      <!-- Badges -->
      <div v-if="overviewReady" class="card mb-12">
        <h3 class="title-small mb-16">Бейджи</h3>

        <div v-if="badges.length" class="badges-grid">
          <div v-for="badge in badges" :key="badge.id" class="badge-item" :class="{ earned: badge.earned }" @click="showBadgeDetails(badge)">
            <div class="badge-icon">{{ badge.icon }}</div>
            <div class="badge-name">{{ badge.name }}</div>
          </div>
        </div>

        <div v-else class="empty-state">
          <p class="body-small text-secondary">Бейджи появятся здесь</p>
        </div>
      </div>
      <div v-else class="card skeleton-card mb-12">
        <div class="skeleton-title mb-12"></div>
        <div class="skeleton-badges">
          <div class="skeleton-badge" v-for="n in 3" :key="n"></div>
        </div>
      </div>

      <!-- Statistics -->
      <div v-if="overviewReady" class="card">
        <h3 class="title-small mb-16">Статистика</h3>

        <div class="stats-list">
          <div class="stat-row">
            <span class="stat-label">Пройдено аттестаций</span>
            <span class="stat-value">{{ userStats.completed }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Средний балл</span>
            <span class="stat-value">{{ userStats.averageScore }}%</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Успешных прохождений</span>
            <span class="stat-value">{{ userStats.successful }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Место в рейтинге</span>
            <span class="stat-value">{{ userStats.rank !== null ? "#" + userStats.rank : "—" }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Общее время</span>
            <span class="stat-value">{{ userStats.totalTime }}</span>
          </div>
        </div>
      </div>
      <div v-else class="card skeleton-card">
        <div class="skeleton-title mb-16"></div>
        <div class="skeleton-line mb-8"></div>
        <div class="skeleton-line mb-8 w-80"></div>
        <div class="skeleton-line mb-8 w-70"></div>
        <div class="skeleton-line mb-8 w-60"></div>
      </div>
    </div>

    <!-- Edit Profile Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click="closeEditModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="title-medium">Редактировать профиль</h2>
          <button class="btn-icon profile-edit" @click="closeEditModal">
            <X />
          </button>
        </div>

        <form @submit.prevent="saveProfile" class="modal-body">
          <div class="form-group">
            <label class="form-label">Имя</label>
            <input v-model="editForm.firstName" type="text" class="form-input" required />
          </div>

          <div class="form-group">
            <label class="form-label">Фамилия</label>
            <input v-model="editForm.lastName" type="text" class="form-input" required />
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary btn-full" :disabled="isLoading || !hasChanges">
              {{ isLoading ? "Сохранение..." : "Сохранить" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Pencil, X } from "lucide-vue-next";
import { useUserStore } from "../stores/user";
import { useTelegramStore } from "../stores/telegram";
import { useDebugConsole } from "../composables/useDebugConsole";
import { apiClient } from "../services/apiClient";

export default {
  name: "ProfileView",
  components: {
    Pencil,
    X,
  },
  setup() {
    const router = useRouter();
    const userStore = useUserStore();
    const telegramStore = useTelegramStore();
    const { initializeEruda, toggle, isErudaLoaded } = useDebugConsole();

    const user = computed(() => userStore.user);
    const isLoading = computed(() => userStore.isLoading);
    const overviewReady = computed(() => Boolean(userStore.overview) && !userStore.overviewLoading);
    const debugConsoleReady = computed(() => {
      console.log("🔍 ProfileView: debugConsoleReady вычисляется, isErudaLoaded.value =", isErudaLoaded.value);
      return isErudaLoaded.value;
    });

    const showEditModal = ref(false);
    const badges = ref([]);
    const userStats = ref({
      completed: 0,
      averageScore: 0,
      successful: 0,
      rank: null,
      totalTime: "--:--",
    });

    const editForm = reactive({
      firstName: "",
      lastName: "",
    });

    const progressPercentage = computed(() => {
      if (!user.value) return 0;
      return Math.min((user.value.points / user.value.nextLevelPoints) * 100, 100);
    });

    const hasChanges = computed(() => {
      return editForm.firstName !== user.value?.firstName || editForm.lastName !== user.value?.lastName;
    });

    function getBranchName(branch) {
      return branch || "—";
    }

    function editProfile() {
      editForm.firstName = user.value?.firstName || "";
      editForm.lastName = user.value?.lastName || "";
      showEditModal.value = true;
      telegramStore.hapticFeedback("impact", "light");
    }

    function closeEditModal() {
      showEditModal.value = false;
    }

    async function saveProfile() {
      const result = await userStore.updateProfile({
        firstName: editForm.firstName,
        lastName: editForm.lastName,
      });

      if (result.success) {
        telegramStore.hapticFeedback("notification", "success");
        telegramStore.showAlert("Профиль обновлён!");
        showEditModal.value = false;
      } else {
        telegramStore.hapticFeedback("notification", "error");
        telegramStore.showAlert(result.error || "Ошибка сохранения");
      }
    }

    function showBadgeDetails(badge) {
      telegramStore.hapticFeedback("impact", "light");
      const message = badge.earned
        ? `Бейдж "${badge.name}" получен!\n\n${badge.description}`
        : `Бейдж "${badge.name}"\n\n${badge.description}\n\nТребования: ${badge.requirements}`;

      telegramStore.showAlert(message);
    }

    function formatDuration(seconds) {
      if (!Number.isFinite(seconds) || seconds <= 0) {
        return "--:--";
      }
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (hours > 0) {
        return `${hours}ч ${minutes}м`;
      }
      const secs = seconds % 60;
      return `${minutes}:${String(secs).padStart(2, "0")}`;
    }

    async function loadProfileData() {
      if (!userStore.isInitialized) {
        await userStore.ensureStatus();
      }

      // Инициализируем debug console после загрузки пользователя
      console.log("🔍 ProfileView: loadProfileData - userStore.user?.telegramId =", userStore.user?.telegramId);
      if (userStore.user?.telegramId) {
        await initializeEruda(userStore.user.telegramId);
      }

      const leaderboardPromise = apiClient.getLeaderboardUsers().catch((error) => {
        console.warn("Не удалось получить лидерборд", error);
        return null;
      });

      const [overviewResponse, assessmentsResponse, leaderboard] = await Promise.all([
        userStore.loadOverview(),
        apiClient.listUserAssessments(),
        leaderboardPromise,
      ]);

      const overview = overviewResponse || userStore.overview;

      badges.value = Array.isArray(overview?.badges)
        ? overview.badges.map((badge) => ({
            id: badge.code,
            name: badge.name,
            icon: badge.icon || "🏅",
            earned: Boolean(badge.earned),
            description: badge.description,
            requirements: badge.description,
          }))
        : [];

      try {
        const normalized = (assessmentsResponse?.assessments || []).map((item) => {
          const threshold = Number.isFinite(item.passScorePercent) ? Number(item.passScorePercent) : null;
          const bestScore = Number.isFinite(item.bestScorePercent) ? Number(item.bestScorePercent) : null;
          const passed = bestScore != null && threshold != null ? bestScore >= threshold : false;
          const lastCompletedAt = item.lastCompletedAt || null;
          return {
            id: item.id,
            bestScore,
            passed,
            lastCompletedAt,
          };
        });

        const completed = normalized.filter((item) => item.bestScore != null).length;
        const successful = normalized.filter((item) => item.passed).length;
        const averageScore = completed ? Math.round(normalized.reduce((total, item) => total + (item.bestScore || 0), 0) / completed) : 0;

        let userRank = "—";
        if (leaderboard?.currentUser?.rank) {
          userRank = Number(leaderboard.currentUser.rank);
        }

        userStats.value = {
          completed,
          averageScore,
          successful,
          rank: typeof userRank === "number" ? userRank : null,
          totalTime: "--:--",
        };
      } catch (error) {
        console.warn("Не удалось загрузить статистику аттестаций", error);
      }
    }

    onMounted(() => {
      loadProfileData();
    });

    function toggleDebugConsole() {
      toggle();
    }

    return {
      userStore,
      user,
      isLoading,
      overviewReady,
      debugConsoleReady,
      showEditModal,
      badges,
      userStats,
      editForm,
      progressPercentage,
      hasChanges,
      getBranchName,
      editProfile,
      closeEditModal,
      saveProfile,
      showBadgeDetails,
      toggleDebugConsole,
    };
  },
};
</script>

<style scoped>
.profile-header {
  text-align: center;
  padding-top: 20px;
}

.avatar-section {
  display: flex;
  justify-content: center;
}

.avatar-large {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background-color: var(--accent-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 32px;
  overflow: hidden;
}
.profile-edit {
  background: var(--bg-secondary);
}

.avatar-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.progress-section {
  background-color: var(--bg-primary);
  padding: 16px;
  border-radius: 12px;
}

.badges-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.badge-item {
  padding: 16px 12px;
  background-color: var(--bg-primary);
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0.4;
  border: 1px solid var(--divider);
}

.badge-item.earned {
  opacity: 1;
  transform: scale(1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: transparent;
}

.badge-item.earned:nth-child(1) {
  background: linear-gradient(135deg, #ffd700, #ffa500);
}
.badge-item.earned:nth-child(2) {
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
}
.badge-item.earned:nth-child(3) {
  background: linear-gradient(135deg, #a855f7, #7c3aed);
}
.badge-item.earned:nth-child(4) {
  background: linear-gradient(135deg, #06b6d4, #0891b2);
}
.badge-item.earned:nth-child(5) {
  background: linear-gradient(135deg, #10b981, #059669);
}
.badge-item.earned:nth-child(6) {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.badge-item:hover {
  transform: translateY(-2px) scale(1.05);
}

.badge-item.earned:hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.badge-icon {
  font-size: 28px;
  margin-bottom: 8px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.badge-item.earned .badge-icon {
  filter: drop-shadow(0 2px 4px rgba(255, 255, 255, 0.3));
}

.badge-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.badge-item.earned .badge-name {
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--divider);
}

.stat-row:last-child {
  border-bottom: none;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-blue);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.modal-content {
  width: 100%;
  max-height: 70vh;
  background-color: var(--bg-primary);
  border-radius: 16px 16px 0 0;
  overflow: hidden;
  margin-bottom: 76px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--divider);
}

.modal-body {
  padding: 20px;
  max-height: calc(70vh - 80px);
  overflow-y: auto;
}

.empty-state {
  padding: 20px 0;
  text-align: center;
}

.text-secondary {
  color: var(--text-secondary);
}

.skeleton-card {
  position: relative;
  overflow: hidden;
}

.skeleton-title,
.skeleton-line,
.skeleton-badge {
  display: block;
  border-radius: 12px;
  background: linear-gradient(90deg, rgba(148, 163, 184, 0.2), rgba(148, 163, 184, 0.35), rgba(148, 163, 184, 0.2));
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

.debug-btn {
  font-size: 18px;
  padding: 8px;
}

.skeleton-title {
  height: 20px;
  width: 50%;
}

.skeleton-line {
  height: 14px;
  width: 100%;
}

.skeleton-badges {
  display: flex;
  gap: 12px;
}

.skeleton-badge {
  width: 70px;
  height: 70px;
  border-radius: 16px;
}

.w-60 {
  width: 60%;
}

.w-70 {
  width: 70%;
}

.w-80 {
  width: 80%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 480px) {
  .badges-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .badge-item {
    padding: 12px 8px;
  }

  .badge-icon {
    font-size: 20px;
    margin-bottom: 6px;
  }

  .badge-name {
    font-size: 11px;
  }
}

@media (min-width: 768px) {
  .modal-overlay {
    align-items: center;
    justify-content: center;
  }

  .modal-content {
    width: 400px;
    max-height: 600px;
    border-radius: 16px;
    margin-bottom: 76px;
  }
}
</style>
