<template>
  <div class="users-view">
    <!-- Header -->
    <div class="page-header">
      <div>
        <p class="page-subtitle">{{ stats.total }} пользователей • суперадминов {{ stats.superadmin }}, управляющих {{ stats.manager }}</p>
      </div>
      <div class="header-actions">
        <Button icon="file-chart-column" variant="ghost" size="sm" @click="handleExportExcel" class="hide-mobile">Экспорт Excel</Button>
        <Button v-if="authStore.isSuperAdmin" icon="plus" @click="openCreateModal">
          <span class="hide-mobile">Добавить пользователя</span>
          <span class="show-mobile">Добавить</span>
        </Button>
      </div>
    </div>

    <!-- Filters -->
    <Card class="filters-card">
      <div class="filters-grid">
        <Input v-model="filters.search" placeholder="Поиск по имени или логину..." @input="handleSearch" />
        <Select v-model="filters.branch" :options="branchOptions" placeholder="Все филиалы" @change="handleFilterChange" />
        <Select v-model="filters.position" :options="positionOptions" placeholder="Все должности" @change="handleFilterChange" />
        <Select v-model="filters.role" :options="roleOptions" placeholder="Все роли" @change="handleFilterChange" />
        <Select v-model="filters.level" :options="levelOptions" placeholder="Все уровни" @change="handleFilterChange" />
        <Button variant="secondary" fullWidth @click="resetFilters" icon="refresh-ccw">Сбросить</Button>
      </div>

      <!-- Активные фильтры -->
      <div v-if="activeFilters.length > 0" class="active-filters">
        <span v-for="filter in activeFilters" :key="filter.key" class="filter-tag">
          {{ filter.label }}
          <button @click="removeFilter(filter.key)" class="filter-tag-remove">×</button>
        </span>
      </div>
    </Card>

    <!-- Content -->
    <Card class="users-card" padding="none">
      <Preloader v-if="loading" />

      <div v-else-if="users.length === 0" class="empty-state">
        <p>Пользователи не найдены</p>
      </div>

      <div v-else>
        <!-- Desktop table -->
        <div class="table-wrapper hide-mobile">
          <table class="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>ФИО</th>
                <th>Логин</th>
                <th>Должность</th>
                <th>Филиал</th>
                <th>Роль</th>
                <th>Очки</th>
                <th>Создан</th>
                <th class="actions-col">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td class="id-cell">{{ user.id }}</td>
                <td class="name-cell clickable" @click="openProfileModal(user)">
                  <div class="name-primary">{{ user.first_name }} {{ user.last_name }}</div>
                  <div class="name-secondary" v-if="user.telegram_id">TG: {{ user.telegram_id }}</div>
                </td>
                <td>{{ user.login || "—" }}</td>
                <td>{{ user.position_name || "—" }}</td>
                <td>{{ user.branch_name || "—" }}</td>
                <td>
                  <Badge :variant="getRoleBadgeVariant(user.role_name)" size="sm" rounded>
                    {{ getRoleLabel(user.role_name) }}
                  </Badge>
                </td>
                <td>{{ user.points ?? 0 }}</td>
                <td class="date-cell">{{ formatDate(user.created_at) }}</td>
                <td class="actions-cell">
                  <div class="actions-buttons">
                    <Button class="action-btn action-btn-edit" icon="pencil" title="Редактировать" @click="openEditModal(user)"></Button>
                    <Button
                      class="action-btn action-btn-secondary"
                      icon="key-round"
                      title="Сбросить пароль"
                      @click="openResetPasswordModal(user)"
                    ></Button>
                    <Button class="action-btn action-btn-delete" title="Удалить" icon="trash" @click="openDeleteModal(user)"></Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile cards -->
        <div class="mobile-cards show-mobile">
          <div v-for="user in users" :key="user.id" class="user-card">
            <div class="user-card-header">
              <div>
                <h3 class="user-card-name">{{ user.first_name }} {{ user.last_name }}</h3>
                <p class="user-card-subtitle">ID: {{ user.id }}</p>
              </div>
              <Badge :variant="getRoleBadgeVariant(user.role_name)" size="sm" rounded>
                {{ getRoleLabel(user.role_name) }}
              </Badge>
            </div>

            <div class="user-card-body">
              <div class="user-card-row">
                <span class="user-card-label">Логин:</span>
                <span class="user-card-value">{{ user.login || "—" }}</span>
              </div>
              <div class="user-card-row">
                <span class="user-card-label">Филиал:</span>
                <span class="user-card-value">{{ user.branch_name || "—" }}</span>
              </div>
              <div class="user-card-row">
                <span class="user-card-label">Должность:</span>
                <span class="user-card-value">{{ user.position_name || "—" }}</span>
              </div>
              <div class="user-card-row">
                <span class="user-card-label">Очки:</span>
                <span class="user-card-value">{{ user.points ?? 0 }}</span>
              </div>
              <div class="user-card-row">
                <span class="user-card-label">Создан:</span>
                <span class="user-card-value">{{ formatDate(user.created_at) }}</span>
              </div>
            </div>

            <div class="user-card-actions">
              <Button size="sm" variant="secondary" icon="pencil" fullWidth @click="openEditModal(user)">Редактировать</Button>
              <Button size="sm" variant="secondary" icon="key-round" fullWidth @click="openResetPasswordModal(user)">Сбросить пароль</Button>
              <Button size="sm" variant="danger" icon="trash" fullWidth @click="openDeleteModal(user)">Удалить</Button>
            </div>
          </div>
        </div>
      </div>
    </Card>

    <!-- Create modal -->
    <Modal :show="showCreateModal" title="Создать пользователя" @close="closeModals">
      <UserForm v-model="formData" :references="references" />
      <div class="modal-actions">
        <Button variant="secondary" @click="closeModals">Отмена</Button>
        <Button :loading="actionLoading" @click="handleCreate">Создать</Button>
      </div>
    </Modal>

    <!-- Edit modal -->
    <Modal :show="showEditModal" title="Редактировать пользователя" @close="closeModals">
      <UserForm v-model="formData" :references="references" :is-edit="true" />
      <div class="password-generator-card">
        <div class="password-generator-head">
          <div>
            <p class="password-generator-title">Генерация пароля</p>
            <p class="password-generator-text">Создайте сложный пароль на основе текущих данных сотрудника.</p>
          </div>
          <Button size="sm" variant="secondary" icon="Sparkles" :loading="passwordGenerating" @click="handleGeneratePassword">
            Сгенерировать
          </Button>
        </div>
        <div v-if="generatedPassword" class="password-generator-result">
          <Input v-model="generatedPassword" label="Сгенерированный пароль" readonly />
          <div class="password-generator-actions">
            <Button size="sm" variant="ghost" icon="Copy" @click="copyGeneratedPassword">Скопировать</Button>
            <Button size="sm" icon="KeyRound" :loading="passwordApplying" @click="applyGeneratedPassword">Применить пароль</Button>
          </div>
          <p class="password-generator-hint">Пароль содержит верхний и нижний регистр, цифры и символы.</p>
        </div>
      </div>
      <div class="modal-actions">
        <Button variant="secondary" @click="closeModals">Отмена</Button>
        <Button :loading="actionLoading" @click="handleUpdate">Сохранить</Button>
      </div>
    </Modal>

    <!-- Reset password modal -->
    <Modal :show="showResetPasswordModal" title="Сбросить пароль" @close="closeModals">
      <p class="modal-text">
        Установите новый пароль для
        <strong>{{ selectedUser?.first_name }} {{ selectedUser?.last_name }}</strong>
      </p>
      <Input v-model="newPassword" type="password" placeholder="Новый пароль (минимум 6 символов)" />
      <div class="modal-actions">
        <Button variant="secondary" @click="closeModals">Отмена</Button>
        <Button :loading="actionLoading" @click="handleResetPassword">Сбросить</Button>
      </div>
    </Modal>

    <!-- Delete modal -->
    <Modal :show="showDeleteModal" title="Удалить пользователя" @close="closeModals">
      <p class="modal-text">
        Вы уверены, что хотите удалить пользователя
        <strong>{{ selectedUser?.first_name }} {{ selectedUser?.last_name }}</strong
        >?
      </p>
      <div class="modal-actions">
        <Button variant="secondary" @click="closeModals">Отмена</Button>
        <Button variant="danger" :loading="actionLoading" @click="handleDelete">Удалить</Button>
      </div>
    </Modal>

    <!-- Profile modal -->
    <Modal :show="showProfileModal" :title="`Профиль: ${selectedUser?.first_name} ${selectedUser?.last_name}`" @close="closeModals" size="lg">
      <Preloader v-if="profileLoading" />

      <div v-else-if="userProfile" class="user-profile">
        <!-- Основная информация -->
        <div class="profile-header">
          <div class="profile-avatar">{{ selectedUser?.first_name?.charAt(0) }}{{ selectedUser?.last_name?.charAt(0) }}</div>
          <div class="profile-info">
            <div class="profile-name-row">
              <h3 class="profile-name">{{ userProfile.user.first_name }} {{ userProfile.user.last_name }}</h3>
              <Badge :variant="getRoleBadgeVariant(userProfile.user.role_name)" size="sm">
                {{ getRoleLabel(userProfile.user.role_name) }}
              </Badge>
            </div>
            <div class="profile-meta">
              <span class="profile-badge">Уровень {{ userProfile.user.level }}</span>
              <span class="profile-badge">{{ userProfile.user.points }} очков</span>
            </div>
            <div class="profile-details">
              <span>{{ userProfile.user.branch_name || "—" }}</span>
              <span>•</span>
              <span>{{ userProfile.user.position_name || "—" }}</span>
            </div>
          </div>
        </div>

        <!-- Статистика -->
        <div class="profile-stats">
          <div class="stat-card">
            <div class="stat-icon">
              <Icon name="ClipboardList" />
            </div>
            <div class="stat-value">{{ userProfile.stats.total_assessments || 0 }}</div>
            <div class="stat-label">Аттестаций</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <Icon name="square-check" />
            </div>
            <div class="stat-value">{{ userProfile.stats.completed_attempts || 0 }}</div>
            <div class="stat-label">Завершено</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <Icon name="chart-line" />
            </div>
            <div class="stat-value">{{ formatScore(userProfile.stats.avg_score) }}%</div>
            <div class="stat-label">Средний балл</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <Icon name="trophy" />
            </div>
            <div class="stat-value">{{ userProfile.rank.user_rank || "—" }}</div>
            <div class="stat-label">Место в рейтинге</div>
          </div>
        </div>

        <!-- Прогресс до следующего уровня -->
        <div v-if="userProfile.nextLevel" class="profile-section">
          <h3>Прогресс до следующего уровня</h3>
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${userProfile.progressToNextLevel}%` }"></div>
            </div>
            <p class="progress-text">
              {{ Math.round(userProfile.progressToNextLevel) }}% • Осталось
              {{ Math.max((userProfile.nextLevel.min_points || 0) - (userProfile.user.points || 0), 0) }} очков
            </p>
          </div>
        </div>

        <!-- Бейджи -->
        <div class="profile-section">
          <h3>Достижения {{ userProfile.badges && userProfile.badges.length > 0 ? `(${userProfile.badges.length})` : "" }}</h3>
          <div v-if="userProfile.badges && userProfile.badges.length > 0" class="badges-grid">
            <div v-for="badge in userProfile.badges" :key="badge.id" class="badge-item" :title="badge.description">
              <div class="badge-icon">{{ badge.icon }}</div>
              <div class="badge-name">{{ badge.name }}</div>
              <div class="badge-date">{{ formatDate(badge.earned_at) }}</div>
            </div>
          </div>
          <div v-else class="empty-badges">
            <div class="empty-icon">
              <Icon name="medal" size="96" />
            </div>
            <p>Пока нет заработанных достижений</p>
          </div>
        </div>

        <!-- История аттестаций -->
        <div class="profile-section">
          <h3>История аттестаций {{ userProfile.history && userProfile.history.length > 0 ? `(${userProfile.history.length})` : "" }}</h3>
          <div v-if="userProfile.history && userProfile.history.length > 0" class="history-list">
            <div v-for="attempt in userProfile.history" :key="attempt.id" class="history-item">
              <div class="history-info">
                <div class="history-title">{{ attempt.title }}</div>
                <div class="history-date">
                  {{ formatDate(attempt.completed_at || attempt.started_at) }}
                </div>
              </div>
              <div v-if="attempt.status === 'completed'" class="history-score">{{ formatScore(attempt.score_percent) }}%</div>
              <Badge :variant="attempt.status === 'completed' ? 'success' : 'secondary'" size="sm">
                {{ getAttemptStatusLabel(attempt.status) }}
              </Badge>
            </div>
          </div>
          <div v-else class="empty-history">
            <div class="empty-icon">
              <Icon name="ClipboardList" size="96" />
            </div>
            <p>История аттестаций пуста</p>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <Button variant="secondary" @click="closeModals">Закрыть</Button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useAuthStore } from "../stores/auth";
import apiClient from "../utils/axios";
import { getUsers, getReferences, createUser, updateUser, deleteUser, resetPassword } from "../api/users";
import Card from "../components/ui/Card.vue";
import Button from "../components/ui/Button.vue";
import Input from "../components/ui/Input.vue";
import Select from "../components/ui/Select.vue";
import Badge from "../components/ui/Badge.vue";
import Modal from "../components/ui/Modal.vue";
import Preloader from "../components/ui/Preloader.vue";
import UserForm from "../components/UserForm.vue";
import Icon from "../components/ui/Icon.vue";
import { useToast } from "../composables/useToast";

const authStore = useAuthStore();
const loading = ref(false);
const actionLoading = ref(false);
const users = ref([]);
const references = ref({
  branches: [],
  positions: [],
  roles: [],
});

const filters = reactive({
  search: "",
  branch: "",
  position: "",
  role: "",
  level: "",
});

const showCreateModal = ref(false);
const showEditModal = ref(false);
const showResetPasswordModal = ref(false);
const showDeleteModal = ref(false);
const showProfileModal = ref(false);

const selectedUser = ref(null);
const userProfile = ref(null);
const profileLoading = ref(false);
const newPassword = ref("");
const { showToast } = useToast();
const generatedPassword = ref("");
const passwordGenerating = ref(false);
const passwordApplying = ref(false);

const defaultForm = () => ({
  firstName: "",
  lastName: "",
  branchId: "",
  positionId: "",
  roleId: "",
  login: "",
  password: "",
  level: 1,
  points: 0,
});

const formData = ref(defaultForm());

const stats = computed(() => {
  const total = users.value.length;
  const superadmin = users.value.filter((user) => user.role_name === "superadmin").length;
  const manager = users.value.filter((user) => user.role_name === "manager").length;
  return { total, superadmin, manager };
});

const branchOptions = computed(() => [
  { value: "", label: "Все филиалы" },
  ...references.value.branches.map((branch) => ({
    value: String(branch.id),
    label: branch.name,
  })),
]);

const positionOptions = computed(() => [
  { value: "", label: "Все должности" },
  ...references.value.positions.map((position) => ({
    value: String(position.id),
    label: position.name,
  })),
]);

const roleOptions = computed(() => [
  { value: "", label: "Все роли" },
  ...references.value.roles.map((role) => ({
    value: String(role.id),
    label: getRoleLabel(role.name),
  })),
]);

const levelOptions = computed(() => [
  { value: "", label: "Все уровни" },
  { value: "1", label: "1 - Новичок" },
  { value: "2", label: "2 - Специалист" },
  { value: "3", label: "3 - Эксперт" },
  { value: "4", label: "4 - Лидер" },
  { value: "5", label: "5 - Мастер" },
  { value: "6", label: "6 - Гуру" },
]);

const activeFilters = computed(() => {
  const active = [];
  if (filters.search) active.push({ key: "search", label: `Поиск: "${filters.search}"` });
  if (filters.branch) {
    const branch = references.value.branches.find((b) => String(b.id) === filters.branch);
    if (branch) active.push({ key: "branch", label: `Филиал: ${branch.name}` });
  }
  if (filters.position) {
    const position = references.value.positions.find((p) => String(p.id) === filters.position);
    if (position) active.push({ key: "position", label: `Должность: ${position.name}` });
  }
  if (filters.role) {
    const role = references.value.roles.find((r) => String(r.id) === filters.role);
    if (role) active.push({ key: "role", label: `Роль: ${getRoleLabel(role.name)}` });
  }
  if (filters.level) {
    const level = levelOptions.value.find((l) => l.value === filters.level);
    if (level) active.push({ key: "level", label: `Уровень: ${level.label}` });
  }
  return active;
});

let searchTimeout = null;

const loadReferences = async () => {
  try {
    const data = await getReferences();
    references.value = data;
  } catch (error) {
    console.error("Ошибка загрузки справочников", error);
  }
};

const buildFilters = () => {
  const params = {};
  if (filters.search.trim()) params.search = filters.search.trim();
  if (filters.branch) params.branch = filters.branch;
  if (filters.position) params.position = filters.position;
  if (filters.role) params.role = filters.role;
  if (filters.level) params.level = filters.level;
  return params;
};

const loadUsers = async () => {
  loading.value = true;
  try {
    const data = await getUsers(buildFilters());
    users.value = data.users || [];
  } catch (error) {
    console.error("Ошибка загрузки пользователей", error);
    showToast("Не удалось загрузить пользователей", "error");
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  searchTimeout = setTimeout(() => {
    loadUsers();
  }, 300);
};

const handleFilterChange = () => {
  loadUsers();
};

const resetFilters = () => {
  filters.search = "";
  filters.branch = "";
  filters.position = "";
  filters.role = "";
  filters.level = "";
  loadUsers();
};

const removeFilter = (key) => {
  filters[key] = "";
  if (key === "search") {
    handleSearch();
  } else {
    loadUsers();
  }
};

const openProfileModal = async (user) => {
  selectedUser.value = user;
  showProfileModal.value = true;
  profileLoading.value = true;
  userProfile.value = null;

  try {
    const { data } = await apiClient.get(`/admin/users/${user.id}/stats`);
    userProfile.value = normalizeUserProfile(data);
  } catch (error) {
    console.error("Ошибка загрузки профиля", error);
    showToast("Не удалось загрузить профиль пользователя", "error");
    showProfileModal.value = false;
  } finally {
    profileLoading.value = false;
  }
};

const handleExportExcel = async () => {
  try {
    const params = buildFilters();
    const { data } = await apiClient.get("/admin/users/export/excel", {
      params,
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `users_export_${new Date().getTime()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Ошибка экспорта", error);
    showToast("Не удалось экспортировать список пользователей", "error");
  }
};

const formatScore = (score) => {
  return score ? Math.round(score) : 0;
};

const getAttemptStatusLabel = (status) => {
  const labels = {
    completed: "Завершён",
    in_progress: "В процессе",
    not_started: "Не начат",
  };
  return labels[status] || status;
};

const openCreateModal = () => {
  formData.value = defaultForm();
  showCreateModal.value = true;
};

const openEditModal = (user) => {
  selectedUser.value = user;
  generatedPassword.value = "";
  formData.value = {
    firstName: user.first_name,
    lastName: user.last_name,
    branchId: String(user.branch_id || ""),
    positionId: String(user.position_id || ""),
    roleId: String(user.role_id || ""),
    login: user.login || "",
    password: "",
    level: user.level ?? 1,
    points: user.points ?? 0,
  };
  showEditModal.value = true;
};

const openResetPasswordModal = (user) => {
  selectedUser.value = user;
  newPassword.value = "";
  showResetPasswordModal.value = true;
};

const openDeleteModal = (user) => {
  selectedUser.value = user;
  showDeleteModal.value = true;
};

const closeModals = () => {
  showCreateModal.value = false;
  showEditModal.value = false;
  showResetPasswordModal.value = false;
  showDeleteModal.value = false;
  showProfileModal.value = false;
  actionLoading.value = false;
  profileLoading.value = false;
  formData.value = defaultForm();
  selectedUser.value = null;
  userProfile.value = null;
  newPassword.value = "";
  generatedPassword.value = "";
  passwordGenerating.value = false;
  passwordApplying.value = false;
};

const validateForm = () => {
  if (!formData.value.firstName.trim() || !formData.value.lastName.trim()) {
    showToast("Укажите имя и фамилию пользователя", "warning");
    return false;
  }
  if (!formData.value.branchId || !formData.value.positionId || !formData.value.roleId) {
    showToast("Выберите филиал, должность и роль", "warning");
    return false;
  }
  return true;
};

const handleCreate = async () => {
  if (!validateForm()) return;

  actionLoading.value = true;
  try {
    await createUser({
      firstName: formData.value.firstName.trim(),
      lastName: formData.value.lastName.trim(),
      branchId: Number(formData.value.branchId),
      positionId: Number(formData.value.positionId),
      roleId: Number(formData.value.roleId),
      login: formData.value.login ? formData.value.login.trim() : undefined,
      password: formData.value.password || undefined,
    });

    await loadUsers();
    closeModals();
    showToast("Пользователь создан", "success");
  } catch (error) {
    console.error("Ошибка создания пользователя", error);
    showToast(error.response?.data?.error || "Не удалось создать пользователя", "error");
  } finally {
    actionLoading.value = false;
  }
};

const handleUpdate = async () => {
  if (!validateForm() || !selectedUser.value) return;

  actionLoading.value = true;
  try {
    const updateData = {
      firstName: formData.value.firstName.trim(),
      lastName: formData.value.lastName.trim(),
      branchId: Number(formData.value.branchId),
      positionId: Number(formData.value.positionId),
      roleId: Number(formData.value.roleId),
      level: formData.value.level ?? selectedUser.value.level ?? 1,
      points: formData.value.points ?? selectedUser.value.points ?? 0,
    };

    // Добавляем логин, если он был изменен
    if (formData.value.login && formData.value.login.trim() !== selectedUser.value.login) {
      updateData.login = formData.value.login.trim();
    }

    await updateUser(selectedUser.value.id, updateData);

    await loadUsers();
    closeModals();
    showToast("Данные пользователя обновлены", "success");
  } catch (error) {
    console.error("Ошибка обновления пользователя", error);
    showToast(error.response?.data?.error || "Не удалось обновить пользователя", "error");
  } finally {
    actionLoading.value = false;
  }
};

const handleResetPassword = async () => {
  if (!selectedUser.value) return;
  if (!newPassword.value || newPassword.value.length < 6) {
    showToast("Пароль должен содержать не менее 6 символов", "warning");
    return;
  }

  actionLoading.value = true;
  try {
    await resetPassword(selectedUser.value.id, newPassword.value);
    closeModals();
    showToast("Пароль обновлен", "success");
  } catch (error) {
    console.error("Ошибка сброса пароля", error);
    showToast(error.response?.data?.error || "Не удалось сбросить пароль", "error");
  } finally {
    actionLoading.value = false;
  }
};

const handleDelete = async () => {
  if (!selectedUser.value) return;

  actionLoading.value = true;
  try {
    await deleteUser(selectedUser.value.id);
    await loadUsers();
    closeModals();
    showToast("Пользователь удален", "success");
  } catch (error) {
    console.error("Ошибка удаления пользователя", error);
    showToast(error.response?.data?.error || "Не удалось удалить пользователя", "error");
  } finally {
    actionLoading.value = false;
  }
};

const getRoleLabel = (roleName) => {
  if (!roleName) return "—";
  const dictionary = {
    superadmin: "Суперадмин",
    manager: "Управляющий",
    employee: "Сотрудник",
  };

  if (dictionary[roleName]) {
    return dictionary[roleName];
  }

  const reference = references.value.roles.find((role) => role.name === roleName);
  return reference?.display_name || reference?.name || roleName;
};

const getRoleBadgeVariant = (roleName) => {
  switch (roleName) {
    case "superadmin":
      return "primary";
    case "manager":
      return "warning";
    case "employee":
      return "success";
    default:
      return "default";
  }
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const normalizeUserProfile = (profile) => {
  const safeProfile = profile || {};
  const user = safeProfile.user || {};
  return {
    ...safeProfile,
    stats: safeProfile.stats || {},
    rank: safeProfile.rank || {},
    badges: safeProfile.badges || [],
    history: safeProfile.history || [],
    user,
    nextLevel: safeProfile.nextLevel || null,
    progressToNextLevel: safeProfile.progressToNextLevel ?? 0,
  userPoints: user.points ?? safeProfile.points ?? 0,
  };
};

const getBranchNameById = (id) => {
  if (!id) return "";
  const branch = references.value.branches.find((item) => String(item.id) === String(id));
  return branch?.name || "";
};

const getPositionNameById = (id) => {
  if (!id) return "";
  const position = references.value.positions.find((item) => String(item.id) === String(id));
  return position?.name || "";
};

const createSeededRandom = (seed) => {
  let current = seed || Date.now();
  return () => {
    current = (current * 48271) % 2147483647;
    return current / 2147483647;
  };
};

const deriveCharFromText = (text, set) => {
  if (!text) return null;
  const total = [...text].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return set.charAt(total % set.length);
};

const generatePasswordFromForm = () => {
  const firstName = formData.value.firstName?.trim();
  const lastName = formData.value.lastName?.trim();
  const login = formData.value.login?.trim();
  const branchName = getBranchNameById(formData.value.branchId);
  const positionName = getPositionNameById(formData.value.positionId);

  const lowerChars = "abcdefghjkmnpqrstuvwxyz";
  const upperChars = lowerChars.toUpperCase();
  const digits = "0123456789";
  const symbols = "!@#$%^&*()-_=+?";

  const baseSeedText = [firstName, lastName, login, branchName, positionName].filter(Boolean).join("");
  const baseSeed = baseSeedText
    ? [...baseSeedText].reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : Date.now();
  const random = createSeededRandom(baseSeed + Date.now());

  const pickRandom = (set) => set.charAt(Math.floor(random() * set.length));

  const chars = [];
  chars.push(deriveCharFromText(firstName || branchName, lowerChars) || pickRandom(lowerChars));
  chars.push(deriveCharFromText(lastName || positionName, upperChars) || pickRandom(upperChars));
  const numericSeed = `${formData.value.branchId || ""}${formData.value.positionId || ""}${formData.value.level || ""}`;
  chars.push(deriveCharFromText(numericSeed, digits) || pickRandom(digits));
  chars.push(deriveCharFromText(login || `${branchName}${positionName}`, symbols) || pickRandom(symbols));

  const allChars = lowerChars + upperChars + digits + symbols;
  while (chars.length < 8) {
    chars.push(pickRandom(allChars));
  }

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
};

const ensurePasswordData = () => {
  if (!selectedUser.value) {
    showToast("Сначала выберите пользователя", "warning");
    return false;
  }
  if (!formData.value.firstName?.trim() || !formData.value.lastName?.trim()) {
    showToast("Заполните имя и фамилию перед генерацией пароля", "warning");
    return false;
  }
  if (!formData.value.branchId || !formData.value.positionId) {
    showToast("Выберите филиал и должность пользователя", "warning");
    return false;
  }
  return true;
};

const handleGeneratePassword = () => {
  if (!ensurePasswordData()) return;
  passwordGenerating.value = true;
  try {
    generatedPassword.value = generatePasswordFromForm();
    showToast("Пароль сгенерирован", "success");
  } catch (error) {
    console.error("Ошибка генерации пароля", error);
    showToast("Не удалось сгенерировать пароль", "error");
  } finally {
    passwordGenerating.value = false;
  }
};

const copyGeneratedPassword = async () => {
  if (!generatedPassword.value) return;
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    showToast("Буфер обмена недоступен в этом браузере", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(generatedPassword.value);
    showToast("Пароль скопирован в буфер обмена", "success");
  } catch (error) {
    console.error("Ошибка копирования пароля", error);
    showToast("Не удалось скопировать пароль", "error");
  }
};

const applyGeneratedPassword = async () => {
  if (!generatedPassword.value || !selectedUser.value) {
    showToast("Сначала сгенерируйте пароль", "warning");
    return;
  }

  passwordApplying.value = true;
  try {
    await resetPassword(selectedUser.value.id, generatedPassword.value);
    showToast("Пароль применён для пользователя", "success");
  } catch (error) {
    console.error("Ошибка применения пароля", error);
    showToast(error.response?.data?.error || "Не удалось обновить пароль", "error");
  } finally {
    passwordApplying.value = false;
  }
};

onMounted(async () => {
  await loadReferences();
  await loadUsers();
});
</script>

<style scoped>
.users-view {
  width: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 32px;
}

.page-heading {
  font-size: 30px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.page-subtitle {
  margin: 8px 0 0;
  font-size: 15.2px;
  color: var(--text-secondary);
}

.show-mobile {
  display: none;
}

.filters-card {
  margin-bottom: 32px;
}

.password-generator-card {
  margin-top: 24px;
  padding: 20px;
  border: 1px solid var(--divider);
  border-radius: 18px;
  background: var(--surface-card);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.password-generator-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.password-generator-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 6px;
  color: var(--text-primary);
}

.password-generator-text {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.password-generator-result {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.password-generator-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.password-generator-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  align-items: center;
}

.users-card {
  overflow: visible;
}

.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table thead {
  border-bottom: 1px solid var(--divider);
}

.users-table th {
  padding: 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.users-table tbody tr {
  border-bottom: 1px solid var(--divider);
  transition: background-color 0.2s ease;
}

.users-table td {
  padding: 16px;
  font-size: 15.2px;
  color: var(--text-primary);
  vertical-align: middle;
  white-space: nowrap;
}

.id-cell {
  font-weight: 600;
  color: var(--text-secondary);
}

.name-cell {
  cursor: pointer;
  transition: all 0.2s;
}

.name-cell:hover .name-primary {
  color: var(--color-primary);
}

.name-cell .name-primary {
  font-weight: 600;
  transition: color 0.2s;
}

.name-cell .name-secondary {
  font-size: 12.8px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.level-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 700;
  font-size: 14px;
  box-shadow: 0 2px 8px #667eea4d;
  transition: all 0.2s;
}

.level-badge:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px #667eea66;
}

.date-cell {
  color: var(--text-secondary);
  font-size: 13.6px;
}

.actions-col {
  text-align: right;
}

.actions-cell {
  text-align: right;
}

.actions-buttons {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
}

.action-btn {
  padding: 8px;
  border: 1px solid transparent;
  background: var(--color-background-soft);
  cursor: pointer;
  border-radius: 8px;
  font-size: 17.6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn-edit:hover {
  background-color: #e3f2fd;
  border-color: #2196f3;
}

.action-btn-secondary:hover {
  background-color: #f3e5f5;
  border-color: #9c27b0;
}

.action-btn-delete:hover {
  background-color: #ffebee;
  border-color: #f44336;
}

.action-btn-edit {
  color: #2196f3;
}

.action-btn-secondary {
  color: #9c27b0;
}

.action-btn-delete {
  color: #f44336;
}

.mobile-cards {
  display: none;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.user-card {
  background-color: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--divider);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.user-card-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.user-card-subtitle {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.user-card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-card-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.user-card-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.user-card-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.user-card-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-state {
  padding: 48px 24px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 16px;
}

.modal-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.modal-text {
  font-size: 15.2px;
  color: var(--text-secondary);
  margin-bottom: 24px;
}

@media (max-width: 1280px) {
  .filters-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1024px) {
  .filters-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .mobile-cards {
    display: flex;
  }
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .hide-mobile {
    display: none;
  }

  .show-mobile {
    display: flex;
    gap: 8px;
  }

  .filters-grid {
    grid-template-columns: 1fr;
  }
}

/* Новые стили для расширенного функционала */

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  color: var(--color-text);
  transition: all 0.2s;
}

.filter-tag:hover {
  background: var(--color-background-soft);
  border-color: var(--color-border-hover);
}

.filter-tag button {
  padding: 0;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  transition: color 0.2s;
}

.filter-tag button:hover {
  color: var(--color-danger);
}

.clickable {
  cursor: pointer;
  transition: color 0.2s;
}

.clickable:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.user-profile {
  max-width: 900px;
  margin: 0 auto;
}

.profile-header {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 32px;
  padding: 24px;
  background: var(--color-background-soft);
  border-radius: 16px;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: bold;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 4px 12px #667eea4d;
}

.profile-info {
  flex: 1;
}

.profile-name-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.profile-name {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--color-heading);
}

.profile-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.profile-badge {
  padding: 6px 12px;
  background: var(--color-background-mute);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.profile-details {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  padding: 20px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  text-align: center;
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px #00000014;
  border-color: var(--color-primary);
}

.stat-card .stat-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.stat-card .stat-value {
  display: block;
  font-size: 32px;
  font-weight: bold;
  color: var(--color-primary);
  margin-bottom: 4px;
}

.stat-card .stat-label {
  display: block;
  font-size: 14px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.profile-section {
  margin-bottom: 32px;
}

.profile-section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-heading);
}

.progress-container {
  padding: 16px;
  background: var(--color-background-soft);
  border-radius: 12px;
}

.progress-bar {
  height: 14px;
  background: var(--color-background-mute);
  border-radius: 7px;
  overflow: hidden;
  margin-bottom: 12px;
  border: 1px solid var(--color-border);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 7px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.progress-fill::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, #ffffff33, transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.progress-text {
  font-size: 14px;
  color: var(--color-text);
  text-align: center;
  font-weight: 500;
  margin: 0;
}

.badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 16px;
}

.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: var(--color-background-soft);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  text-align: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: default;
}

.badge-item:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 8px 24px #0000001f;
  border-color: var(--color-primary);
}

.badge-icon {
  font-size: 48px;
  margin-bottom: 12px;
  filter: drop-shadow(0 2px 4px #0000001a);
}

.badge-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 6px;
}

.badge-date {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 20px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  transition: all 0.2s;
}

.history-item:hover {
  background: var(--color-background-mute);
  border-color: var(--color-primary);
  transform: translateX(4px);
}

.history-info {
  flex: 1;
}

.history-title {
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 6px;
  font-size: 15px;
}

.history-date {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.history-score {
  font-size: 24px;
  font-weight: bold;
  color: var(--color-primary);
  margin-right: 12px;
}

.empty-badges,
.empty-history {
  text-align: center;
  padding: 48px 32px;
  background: var(--color-background-soft);
  border-radius: 12px;
  border: 2px dashed var(--color-border);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-badges p,
.empty-history p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 15px;
}
@media (min-width: 976px) {
  .filters-grid .input-group {
    grid-column-end: 6;
    grid-column-start: 1;
  }
}
</style>
