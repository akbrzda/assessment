<template>
  <div class="user-details-page">
    <PageHeader title="Профиль пользователя">
      <template #actions>
        <Button type="button" variant="secondary" icon="arrow-left" @click="goBack">Назад</Button>
      </template>
    </PageHeader>

    <Card v-if="loading" class="user-details-card">
      <Preloader />
    </Card>

    <template v-else-if="profile">
      <Card class="user-head-card">
        <div class="user-head-main">
          <div class="avatar">{{ initials }}</div>
          <div class="user-head-info">
            <h1 class="user-name">{{ fullName }}</h1>
            <div class="user-meta-row">
              <Badge :variant="getRoleBadgeVariant(profile.user?.role_name)" size="sm" rounded>
                {{ getRoleLabel(profile.user?.role_name) }}
              </Badge>
              <span :class="['status-inline', `status-inline-${userStatusKey}`]"><span class="dot"></span> {{ userStatusLabel }}</span>
            </div>
            <div class="user-submeta">
              <span>{{ profile.user?.branch_name || "—" }}</span>
              <span>•</span>
              <span>{{ profile.user?.position_name || "—" }}</span>
            </div>
          </div>
        </div>
        <div class="user-head-side">
          <div class="kv-row">
            <span>Логин</span><strong>{{ profile.user?.login || "—" }}</strong>
          </div>
          <div class="kv-row">
            <span>Дата создания</span><strong>{{ formatDateTime(profile.user?.created_at) }}</strong>
          </div>
        </div>
      </Card>

      <Tabs v-model="activeTab" :tabs="tabsConfig" head-only class="my-4" />

      <div v-if="activeTab === 'general'" class="grid-two">
        <Card class="info-card">
          <h3>Контактные данные</h3>
          <div class="kv-row"><span>Телефон</span><strong>—</strong></div>
          <div class="kv-row"><span>Email</span><strong>—</strong></div>
          <div class="kv-row">
            <span>Telegram</span><strong>{{ profile.user?.telegram_id || "—" }}</strong>
          </div>
        </Card>
        <Card class="info-card">
          <h3>Рабочая информация</h3>
          <div class="kv-row">
            <span>Должность</span><strong>{{ profile.user?.position_name || "—" }}</strong>
          </div>
          <div class="kv-row">
            <span>Роль</span><strong>{{ getRoleLabel(profile.user?.role_name) }}</strong>
          </div>
          <div class="kv-row">
            <span>Филиал</span><strong>{{ profile.user?.branch_name || "—" }}</strong>
          </div>
          <div class="kv-row">
            <span>Уровень</span><strong>{{ profile.user?.level || 1 }}</strong>
          </div>
        </Card>

        <Card v-if="invitationLink" class="activity-card">
          <h3>Приглашение</h3>
          <div class="invite-profile-row">
            <span>Ссылка-приглашение</span>
            <div class="invite-profile-actions">
              <code>{{ invitationLink }}</code>
              <Button size="sm" variant="secondary" icon="Copy" @click="copyInvitationLink">Копировать</Button>
            </div>
          </div>
          <p class="invite-profile-hint">Профиль станет активным после перехода сотрудника по ссылке.</p>
        </Card>

        <Card class="activity-card">
          <h3>История активности</h3>
          <table class="activity-table">
            <thead>
              <tr>
                <th>Дата и время</th>
                <th>Статус входа</th>
                <th>IP</th>
                <th>Устройство</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in loginEvents" :key="row.id">
                <td>{{ formatDateTime(row.created_at) }}</td>
                <td>{{ getLoginStatusLabel(row.status) }}</td>
                <td>{{ row.ip_address || "—" }}</td>
                <td>{{ row.user_agent || "—" }}</td>
              </tr>
              <tr v-if="!loginHistoryLoading && !loginEvents.length">
                <td colspan="4">Событий входа пока нет</td>
              </tr>
              <tr v-if="loginHistoryLoading">
                <td colspan="4">Загрузка истории входов...</td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>

      <Card v-else-if="activeTab === 'assessments'" class="info-card">
        <h3>Аттестации</h3>
        <table class="activity-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Дата</th>
              <th>Лучший результат</th>
              <th>Попыток</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in profile.assessmentsSummary" :key="item.id">
              <td>{{ item.title }}</td>
              <td>{{ formatDateTime(item.last_attempt_at) }}</td>
              <td>{{ formatScore(item.best_score_percent) }}%</td>
              <td>{{ item.attempts_count || 0 }}</td>
            </tr>
            <tr v-if="!profile.assessmentsSummary.length">
              <td colspan="4">Данных нет</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Card v-else-if="activeTab === 'achievements'" class="info-card">
        <h3>Достижения</h3>
        <div class="badges-grid">
          <div v-for="badge in profile.badges" :key="badge.id" class="badge-item">
            <div class="badge-icon">{{ badge.icon || "🏆" }}</div>
            <div class="badge-name">{{ badge.name }}</div>
            <div class="badge-date">{{ formatDate(badge.earned_at) }}</div>
          </div>
          <div v-if="!profile.badges.length">Достижений пока нет</div>
        </div>
      </Card>

      <Card v-else class="info-card">
        <h3>Курсы</h3>
        <table v-if="!coursesLoading && userCourses.length" class="activity-table">
          <thead>
            <tr>
              <th>Курс</th>
              <th>Категория</th>
              <th>Статус</th>
              <th>Прогресс</th>
              <th>Назначен</th>
              <th>Дедлайн</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="course in userCourses" :key="course.id">
              <td>{{ course.title || "—" }}</td>
              <td>{{ course.category || "—" }}</td>
              <td>{{ formatCourseStatus(course.progress?.status) }}</td>
              <td>{{ formatCourseProgress(course.progress?.progressPercent) }}</td>
              <td>{{ formatDateTime(course.progress?.assignedAt) }}</td>
              <td>{{ formatDateTime(course.progress?.deadlineAt) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else-if="coursesLoading" class="empty-text">Загрузка курсов...</p>
        <p v-else class="empty-text">Данные по курсам отсутствуют</p>
      </Card>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import apiClient from "@/utils/axios";
import { Badge, Button, Card, PageHeader, Preloader, Tabs } from "@/components/ui";
import { useToast } from "@/composables/useToast";
import { getUserCourses, getUserLoginHistory } from "@/api/users";
import { BOT_USERNAME } from "@/env";

const route = useRoute();
const router = useRouter();
const { showToast } = useToast();

const loading = ref(false);
const coursesLoading = ref(false);
const loginHistoryLoading = ref(false);
const profile = ref(null);
const userCourses = ref([]);
const loginEvents = ref([]);
const activeTab = ref("general");
const tabs = [
  { key: "general", label: "Общая информация" },
  { key: "courses", label: "Курсы" },
  { key: "assessments", label: "Аттестации" },
  { key: "achievements", label: "Достижения" },
];

const tabsConfig = tabs.map((t) => ({ value: t.key, label: t.label }));

const fullName = computed(() => `${profile.value?.user?.first_name || ""} ${profile.value?.user?.last_name || ""}`.trim() || "Пользователь");
const initials = computed(() => {
  const first = profile.value?.user?.first_name?.[0] || "";
  const last = profile.value?.user?.last_name?.[0] || "";
  return `${first}${last}`.toUpperCase() || "?";
});

const invitationLink = computed(() => {
  const code = profile.value?.invitation?.code;
  if (!code) return "";
  const botUsername = BOT_USERNAME || "";
  return botUsername ? `https://t.me/${botUsername}?startapp=${code}` : `Код приглашения: ${code}`;
});

const userStatusLabel = computed(() => (profile.value?.user?.telegram_id ? "Активен" : "Ожидает"));
const userStatusKey = computed(() => (profile.value?.user?.telegram_id ? "active" : "awaiting"));

const getRoleBadgeVariant = (role) => {
  if (role === "superadmin") return "primary";
  if (role === "manager") return "info";
  return "success";
};

const getRoleLabel = (role) => {
  const map = { superadmin: "Суперадмин", manager: "Управляющий", employee: "Сотрудник" };
  return map[role] || role || "—";
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ru-RU");
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const formatScore = (score) => {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 10) / 10;
};

const formatCourseProgress = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0%";
  return `${Math.round(numeric)}%`;
};

const formatCourseStatus = (status) => {
  const map = {
    not_started: "Не начат",
    in_progress: "В процессе",
    completed: "Завершен",
    closed: "Закрыт",
  };
  return map[status] || "—";
};

const copyInvitationLink = async () => {
  if (!invitationLink.value) return;
  try {
    await navigator.clipboard.writeText(invitationLink.value);
    showToast("Ссылка скопирована", "success");
  } catch {
    showToast("Не удалось скопировать ссылку", "error");
  }
};

const loadProfile = async () => {
  loading.value = true;
  try {
    const userId = Number(route.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      showToast("Некорректный идентификатор пользователя", "error");
      router.push("/users");
      return;
    }
    const { data } = await apiClient.get(`/admin/users/${userId}/stats`);
    profile.value = {
      user: data?.user || {},
      stats: data?.stats || {},
      badges: data?.badges || [],
      assessmentsSummary: data?.assessmentsSummary || [],
      invitation: data?.invitation || null,
    };
  } catch (error) {
    console.error("Ошибка загрузки профиля пользователя", error);
    showToast("Не удалось загрузить профиль пользователя", "error");
  } finally {
    loading.value = false;
  }
};

const loadCourses = async () => {
  coursesLoading.value = true;
  try {
    const userId = Number(route.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      userCourses.value = [];
      return;
    }
    const data = await getUserCourses(userId);
    userCourses.value = data?.courses || [];
  } catch (error) {
    console.error("Ошибка загрузки курсов пользователя", error);
    showToast("Не удалось загрузить курсы пользователя", "error");
    userCourses.value = [];
  } finally {
    coursesLoading.value = false;
  }
};

const getLoginStatusLabel = (status) => {
  if (status === "success") return "Успешно";
  return status || "—";
};

const loadLoginHistory = async () => {
  loginHistoryLoading.value = true;
  try {
    const userId = Number(route.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      loginEvents.value = [];
      return;
    }
    const data = await getUserLoginHistory({ userId, page: 1, limit: 50 });
    loginEvents.value = data?.events || [];
  } catch (error) {
    console.error("Ошибка загрузки истории входов пользователя", error);
    showToast("Не удалось загрузить историю входов", "error");
    loginEvents.value = [];
  } finally {
    loginHistoryLoading.value = false;
  }
};

const goBack = () => router.push("/users");

onMounted(async () => {
  await Promise.all([loadProfile(), loadCourses(), loadLoginHistory()]);
});
</script>

<style scoped>
.user-details-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.user-head-card {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 24px;
}
.user-head-main {
  display: flex;
  gap: 16px;
  align-items: center;
}
.avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 26px;
}
.user-name {
  margin: 0 0 8px;
  font-size: 40px;
  line-height: 1.05;
}
.user-meta-row {
  display: flex;
  align-items: center;
  gap: 14px;
}
.status-inline {
  font-size: 15px;
  display: inline-flex;
  gap: 8px;
  align-items: center;
}
.status-inline-active {
  color: #16a34a;
}
.status-inline-awaiting {
  color: #d97706;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}
.user-submeta {
  margin-top: 10px;
  color: hsl(var(--muted-foreground));
  display: flex;
  gap: 8px;
}
.user-head-side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: center;
}
.kv-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 15px;
}
.kv-row span {
  color: hsl(var(--muted-foreground));
}
.grid-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.info-card h3 {
  margin: 0 0 12px;
}
.activity-card {
  grid-column: 1 / -1;
}
.activity-table {
  width: 100%;
  border-collapse: collapse;
}
.activity-table th,
.activity-table td {
  border-bottom: 1px solid hsl(var(--border));
  text-align: left;
  padding: 10px;
  font-size: 14px;
}
.badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}
.badge-item {
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  padding: 16px 12px;
  text-align: center;
  background: hsl(var(--card));
  transition:
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.15s ease;
  position: relative;
  overflow: hidden;
}

.badge-item::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, hsl(var(--accent-purple-soft)), hsl(var(--accent-blue-soft)));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.badge-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px hsl(var(--primary) / 0.15);
  border-color: hsl(var(--primary) / 0.4);
}

.badge-item:hover::before {
  opacity: 1;
}

.badge-item > * {
  position: relative;
  z-index: 1;
}

.badge-icon {
  font-size: 36px;
  display: block;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.12));
}
.badge-name {
  margin-top: 6px;
  font-weight: 600;
}
.badge-date {
  margin-top: 4px;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}
.empty-text {
  color: hsl(var(--muted-foreground));
  margin: 0;
}
.invite-profile-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}
.invite-profile-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 70%;
}
.invite-profile-actions code {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
.invite-profile-hint {
  margin: 10px 0 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

@media (max-width: 1024px) {
  .user-head-card {
    grid-template-columns: 1fr;
  }
  .grid-two {
    grid-template-columns: 1fr;
  }
  .invite-profile-row {
    flex-direction: column;
  }
  .invite-profile-actions {
    max-width: 100%;
    width: 100%;
  }
}
</style>
