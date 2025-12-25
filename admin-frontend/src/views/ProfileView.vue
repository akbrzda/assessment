<template>
  <div class="profile-view">
    <div class="page-header">
      <div>
        <h1 class="page-title">Профиль</h1>
        <p class="page-subtitle">Управление вашим профилем</p>
      </div>
    </div>

    <Card v-if="loading" class="profile-card">
      <Preloader />
    </Card>

    <div v-else-if="profile" class="profile-content">
      <!-- Основная информация -->
      <Card class="profile-card">
        <div class="profile-header">
          <div class="profile-avatar">
            <img v-if="profile.avatarUrl" :src="profile.avatarUrl" alt="Avatar" />
            <div v-else class="profile-avatar-placeholder">
              <Icon name="User" size="48" />
            </div>
          </div>
          <div class="profile-info">
            <h2 class="profile-name">{{ profile.firstName }} {{ profile.lastName }}</h2>
            <p class="profile-role">
              <Badge :variant="getRoleBadgeVariant(profile.roleName)" size="md" rounded>
                {{ getRoleLabel(profile.roleName) }}
              </Badge>
            </p>
          </div>
          <div class="profile-actions">
            <Button v-if="!isEditing" @click="startEdit" icon="pencil" variant="primary"> Редактировать </Button>
            <template v-else>
              <Button @click="saveProfile" icon="check" variant="primary" :disabled="saving">
                {{ saving ? "Сохранение..." : "Сохранить" }}
              </Button>
              <Button @click="cancelEdit" icon="x" variant="secondary">Отмена</Button>
            </template>
          </div>
        </div>

        <div class="profile-details">
          <div v-if="!isEditing" class="profile-details-grid">
            <div class="profile-field">
              <label class="profile-label">Имя</label>
              <p class="profile-value">{{ profile.firstName }}</p>
            </div>
            <div class="profile-field">
              <label class="profile-label">Фамилия</label>
              <p class="profile-value">{{ profile.lastName }}</p>
            </div>
            <div class="profile-field">
              <label class="profile-label">Должность</label>
              <p class="profile-value">{{ profile.positionName || "—" }}</p>
            </div>
            <div class="profile-field">
              <label class="profile-label">Филиал</label>
              <p class="profile-value">{{ profile.branchName || "—" }}</p>
            </div>
            <div class="profile-field">
              <label class="profile-label">Telegram ID</label>
              <p class="profile-value">{{ profile.telegramId || "—" }}</p>
            </div>
            <div class="profile-field">
              <label class="profile-label">Дата регистрации</label>
              <p class="profile-value">{{ formatDate(profile.createdAt) }}</p>
            </div>
          </div>

          <div v-else class="profile-edit-form">
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Имя</label>
                <Input v-model="editForm.firstName" placeholder="Введите имя" />
              </div>
              <div class="form-field">
                <label class="form-label">Фамилия</label>
                <Input v-model="editForm.lastName" placeholder="Введите фамилию" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <!-- Статистика -->
      <Card class="stats-card">
        <h3 class="stats-title">Статистика</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <Icon name="Award" size="24" class="stat-icon" />
            <div class="stat-content">
              <p class="stat-label">Уровень</p>
              <p class="stat-value">{{ profile.level || 1 }}</p>
            </div>
          </div>
          <div class="stat-item">
            <Icon name="Star" size="24" class="stat-icon" />
            <div class="stat-content">
              <p class="stat-label">Очки</p>
              <p class="stat-value">{{ profile.points || 0 }}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Card, Button, Badge, Input, Icon, Preloader } from "../components/ui";
import profileApi from "../api/profile";
import { useToast } from "../composables/useToast";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const { showToast } = useToast();
const authStore = useAuthStore();

const loading = ref(true);
const saving = ref(false);
const isEditing = ref(false);
const profile = ref(null);
const editForm = ref({
  firstName: "",
  lastName: "",
});

const getRoleBadgeVariant = (role) => {
  const variants = {
    superadmin: "primary",
    manager: "warning",
    employee: "success",
  };
  return variants[role] || "default";
};

const getRoleLabel = (role) => {
  const labels = {
    superadmin: "Суперадмин",
    manager: "Управляющий",
    employee: "Сотрудник",
  };
  return labels[role] || role;
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const loadProfile = async () => {
  loading.value = true;
  try {
    const { data } = await profileApi.getProfile();
    profile.value = data;
  } catch (error) {
    console.error("Load profile error:", error);
    showToast("Ошибка при загрузке профиля", "error");
  } finally {
    loading.value = false;
  }
};

const startEdit = () => {
  editForm.value = {
    firstName: profile.value.firstName,
    lastName: profile.value.lastName,
  };
  isEditing.value = true;
};

const cancelEdit = () => {
  isEditing.value = false;
  editForm.value = {
    firstName: "",
    lastName: "",
  };
};

const saveProfile = async () => {
  if (!editForm.value.firstName.trim() || !editForm.value.lastName.trim()) {
    showToast("Заполните все поля", "error");
    return;
  }

  saving.value = true;
  try {
    const { data } = await profileApi.updateProfile(editForm.value);
    profile.value = data.user;
    authStore.updateUser({
      firstName: data.user.firstName,
      lastName: data.user.lastName,
    });
    isEditing.value = false;
    showToast("Профиль успешно обновлен", "success");
  } catch (error) {
    console.error("Update profile error:", error);
    showToast("Ошибка при обновлении профиля", "error");
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  loadProfile();
});
</script>

<style scoped>
.page-header {
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.page-subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.profile-content {
  display: grid;
  gap: 1.5rem;
}

/* Profile Card */
.profile-card {
  padding: 2rem;
}

.profile-header {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border-color);
}

.profile-avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar-placeholder {
  color: var(--text-tertiary);
}

.profile-info {
  flex: 1;
}

.profile-name {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.profile-role {
  display: flex;
  align-items: center;
}

.profile-actions {
  display: flex;
  gap: 0.75rem;
}

.profile-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.profile-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.profile-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.profile-value {
  font-size: 1rem;
  color: var(--text-primary);
}

.profile-edit-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

/* Stats Card */
.stats-card {
  padding: 1.5rem;
}

.stats-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
}

.stat-icon {
  color: var(--primary-color);
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .profile-actions {
    width: 100%;
    flex-direction: column;
  }

  .profile-details-grid,
  .form-row,
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .page-title {
    font-size: 1.5rem;
  }
}
</style>
