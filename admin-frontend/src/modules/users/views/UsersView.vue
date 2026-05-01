<template>
  <div class="users-view">
    <PageHeader title="Управление пользователями">
      <template #subtitle>
        <div class="flex flex-wrap gap-2 mt-1">
          <Badge variant="default" size="sm">Всего: {{ stats.total }}</Badge>
          <Badge variant="primary" size="sm">Суперадминов: {{ stats.superadmin }}</Badge>
          <Badge variant="info" size="sm">Менеджеров: {{ stats.manager }}</Badge>
          <Badge variant="success" size="sm">Сотрудников: {{ stats.employee }}</Badge>
          <Badge v-if="stats.awaiting > 0" variant="warning" size="sm">Ожидают: {{ stats.awaiting }}</Badge>
        </div>
      </template>
      <template #actions>
        <Button v-if="authStore.isSuperAdmin" icon="plus" size="md" @click="openCreateModal"> Добавить пользователя </Button>
        <Button v-if="authStore.isSuperAdmin || authStore.isManager" icon="user-plus" variant="secondary" size="md" @click="openInviteModal">
          Пригласить сотрудника
        </Button>
        <Button icon="file-chart-column" variant="secondary" size="md" @click="handleExportExcel">Экспорт Excel</Button>
      </template>
    </PageHeader>

    <FilterBar
      v-model="filterBarModel"
      search-key="search"
      search-placeholder="Поиск по имени, логину или email..."
      :filter-defs="filterDefs"
      class="mb-4"
      @change="onFilterChange"
    />

    <Tabs v-model="activeUserTab" :tabs="userTabsConfig" head-only class="mb-4" />

    <DataTable
      :total="totalUsers"
      :page="pagination.page"
      :limit="pagination.perPage"
      :is-empty="visibleUsers.length === 0"
      empty-type="filter"
      empty-title="Пользователи не найдены"
      @update:page="
        pagination.page = $event;
        loadUsers();
      "
      @update:limit="
        pagination.perPage = $event;
        pagination.page = 1;
        loadUsers();
      "
    >
      <template #head>
        <TableHead>
          <input type="checkbox" :checked="allUsersSelected" @change="toggleSelectAllUsers" />
        </TableHead>
        <TableHead>Пользователь</TableHead>
        <TableHead>Логин</TableHead>
        <TableHead>Должность</TableHead>
        <TableHead>Роль</TableHead>
        <TableHead>Филиал</TableHead>
        <TableHead>Статус</TableHead>
        <TableHead>Создан</TableHead>
        <TableHead right>Действия</TableHead>
      </template>

      <template #body>
        <TableRow v-for="user in visibleUsers" :key="user.id">
          <TableCell>
            <input type="checkbox" :checked="selectedUserIds.includes(user.id)" @change="toggleUserSelection(user.id)" />
          </TableCell>
          <TableCell>
            <div class="cursor-pointer" @click="openProfilePage(user)">
              <div class="font-semibold text-foreground">{{ user.first_name }} {{ user.last_name }}</div>
              <div class="text-sm text-muted-foreground">{{ user.login || "—" }}</div>
            </div>
          </TableCell>
          <TableCell muted>{{ user.login || "—" }}</TableCell>
          <TableCell muted>{{ user.position_name || "—" }}</TableCell>
          <TableCell>
            <Badge :variant="getRoleBadgeVariant(user.role_name)" size="sm">
              {{ getRoleLabel(user.role_name) }}
            </Badge>
          </TableCell>
          <TableCell muted>{{ user.branch_name || "—" }}</TableCell>
          <TableCell>
            <span :class="['status-pill', `status-pill-${getUserStatus(user).key}`]">
              <span class="status-dot"></span>
              {{ getUserStatus(user).label }}
            </span>
          </TableCell>
          <TableCell muted>{{ formatDate(user.created_at) }}</TableCell>
          <TableCell right>
            <div class="flex items-center justify-end gap-1">
              <Button
                v-if="canEditUser(user)"
                variant="ghost"
                size="sm"
                :icon-only="true"
                icon="pencil"
                title="Редактировать"
                @click="openEditModal(user)"
              />
              <Button
                v-if="authStore.isSuperAdmin"
                variant="ghost"
                size="sm"
                :icon-only="true"
                icon="trash"
                title="Удалить"
                @click="openDeleteModal(user)"
              />
            </div>
          </TableCell>
        </TableRow>
      </template>

      <template #mobile>
        <div v-for="user in visibleUsers" :key="user.id" class="p-4 space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="font-semibold text-foreground cursor-pointer" @click="openProfilePage(user)">{{ user.first_name }} {{ user.last_name }}</h3>
              <p class="text-sm text-muted-foreground">ID: {{ user.id }}</p>
            </div>
            <Badge :variant="getRoleBadgeVariant(user.role_name)" size="sm">
              {{ getRoleLabel(user.role_name) }}
            </Badge>
          </div>
          <dl class="grid gap-2 text-sm border-t border-border pt-3">
            <div class="flex justify-between">
              <dt class="text-muted-foreground">Логин</dt>
              <dd class="font-medium">{{ user.login || "—" }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted-foreground">Филиал</dt>
              <dd class="font-medium">{{ user.branch_name || "—" }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted-foreground">Должность</dt>
              <dd class="font-medium">{{ user.position_name || "—" }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted-foreground">Создан</dt>
              <dd class="font-medium">{{ formatDate(user.created_at) }}</dd>
            </div>
          </dl>
          <div class="flex gap-2">
            <Button v-if="canEditUser(user)" size="sm" variant="secondary" icon="pencil" class="flex-1" @click="openEditModal(user)">
              Редактировать
            </Button>
            <Button v-if="authStore.isSuperAdmin" size="sm" variant="danger" icon="trash" @click="openDeleteModal(user)" />
          </div>
        </div>
      </template>
    </DataTable>

    <!-- Create modal -->
    <Modal :show="showCreateModal" title="Создать пользователя" @close="closeModals">
      <UserForm v-model="formData" :references="references" />
      <p class="create-hint">Логин будет автоматически сформирован из фамилии и первой буквы имени. Пароль будет сгенерирован автоматически.</p>
      <div class="modal-actions">
        <Button variant="secondary" @click="closeModals">Отмена</Button>
        <Button :loading="actionLoading" @click="handleCreate">Создать</Button>
      </div>
    </Modal>

    <!-- Credentials modal after create -->
    <Modal :show="Boolean(createdCredentials)" title="Учётные данные созданы" @close="createdCredentials = null">
      <div v-if="createdCredentials" class="credentials-card">
        <p class="credentials-name">{{ createdCredentials.name }}</p>
        <p class="credentials-hint">Скопируйте сообщение и передайте пользователю:</p>
        <pre class="credentials-message">{{ createdCredentials.message }}</pre>
      </div>
      <div class="modal-actions">
        <Button variant="secondary" icon="Copy" @click="copyText(createdCredentials?.message)">Скопировать всё</Button>
        <Button @click="createdCredentials = null">Закрыть</Button>
      </div>
    </Modal>

    <!-- Edit modal -->
    <Modal :show="showEditModal" title="Редактировать пользователя" @close="closeModals">
      <UserForm v-model="formData" :references="references" :is-edit="true" :is-manager="authStore.isManager" :current-user-id="authStore.user?.id" />

      <div v-if="authStore.isSuperAdmin" class="divider"></div>

      <UserPermissionsManager v-if="authStore.isSuperAdmin && selectedUser" :userId="selectedUser.id" />

      <div class="divider"></div>

      <div class="password-generator-card">
        <div class="password-generator-head">
          <div>
            <p class="password-generator-title">Управление паролем</p>
            <p class="password-generator-text">Создайте сложный пароль на основе текущих данных сотрудника или установите пароль вручную.</p>
          </div>
          <div class="password-actions-group">
            <Button size="sm" variant="secondary" icon="KeyRound" @click="openResetPasswordModal(selectedUser)"> Установить вручную </Button>
            <Button size="sm" variant="secondary" icon="Sparkles" :loading="passwordGenerating" @click="handleGeneratePassword">
              Сгенерировать
            </Button>
          </div>
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
      <div class="delete-warning">
        <span class="delete-warning-icon"></span>
        <div>
          <p class="delete-warning-title">Последствия удаления:</p>
          <ul class="delete-warning-list">
            <li>Все попытки прохождения аттестаций будут удалены</li>
            <li>Накопленные очки и достижения будут удалены</li>
            <li>История активности пользователя будет утеряна</li>
          </ul>
          <p class="delete-warning-note">Это действие необратимо.</p>
        </div>
      </div>
      <div class="modal-actions">
        <Button variant="secondary" @click="closeModals">Отмена</Button>
        <Button variant="danger" :loading="actionLoading" @click="handleDelete">Удалить безвозвратно</Button>
      </div>
    </Modal>

    <!-- Profile modal -->
    <Modal :show="showProfileModal" :title="`Профиль: ${selectedUser?.first_name} ${selectedUser?.last_name}`" @close="closeModals" size="lg">
      <div v-if="userProfile" class="user-profile">
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

        <!-- Сводка по аттестациям -->
        <div class="profile-section">
          <h3>
            Аттестации
            {{ userProfile.assessmentsSummary && userProfile.assessmentsSummary.length > 0 ? `(${userProfile.assessmentsSummary.length})` : "" }}
          </h3>
          <div v-if="userProfile.assessmentsSummary && userProfile.assessmentsSummary.length > 0" class="history-header">
            <span>Аттестация</span>
            <span>Дата</span>
            <span>Лучший %</span>
            <span>Попыток</span>
            <span>Время</span>
            <span>Статус</span>
          </div>
          <div v-if="userProfile.assessmentsSummary && userProfile.assessmentsSummary.length > 0" class="history-list">
            <div v-for="summary in userProfile.assessmentsSummary" :key="summary.id" class="history-item">
              <div class="history-info">
                <div class="history-line">
                  <span class="history-title">{{ summary.title }}</span>
                  <span>{{ formatDateTime(summary.last_attempt_at) }}</span>
                  <span>{{ formatScore(summary.best_score_percent) }}%</span>
                  <span>{{ summary.attempts_count }}</span>
                  <span>{{ formatTimeSpent(summary.time_spent_seconds) }}</span>
                  <span>{{ formatAssessmentResult(summary) }}</span>
                </div>
              </div>
              <div class="history-actions">
                <Button size="sm" variant="ghost" icon="RotateCcw" title="Сбросить прогресс" @click="openResetProgressModal(summary)" />
              </div>
            </div>
          </div>
          <div v-else class="empty-history">
            <div class="empty-icon">
              <Icon name="ClipboardList" size="96" />
            </div>
            <p>Аттестаций нет</p>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <Button variant="secondary" @click="closeModals">Закрыть</Button>
      </div>
    </Modal>

    <!-- Reset progress modal -->
    <Modal :show="showResetProgressModal" title="Сбросить прогресс аттестации" @close="closeModals">
      <p class="modal-text">
        Вы уверены, что хотите сбросить прогресс аттестации
        <strong>"{{ selectedAssessment?.title }}"</strong>
        для пользователя
        <strong>{{ selectedUser?.first_name }} {{ selectedUser?.last_name }}</strong
        >?
      </p>
      <p class="modal-text warning-text">
        Это действие удалит все попытки, ответы и завершение теории для этой аттестации. Пользователь сможет пройти её заново.
      </p>
      <div class="modal-actions">
        <Button variant="secondary" @click="closeModals">Отмена</Button>
        <Button variant="danger" :loading="actionLoading" @click="handleResetProgress">Сбросить прогресс</Button>
      </div>
    </Modal>

    <!-- Invite employee modal -->
    <Modal :show="showInviteModal" title="Пригласить сотрудника" @close="closeInviteModal">
      <div v-if="inviteLink" class="invite-success">
        <div class="invite-success-head">
          <div class="invite-success-icon">✓</div>
          <h3 class="invite-success-title">Приглашение создано!</h3>
          <p class="invite-success-text">Сотрудник получит ссылку для доступа к системе.</p>
        </div>
        <div class="invite-link-block">
          <p class="invite-link-label">Ссылка для приглашения</p>
          <div class="invite-link-row">
            <Input v-model="inviteLink" readonly />
            <Button size="sm" icon="Copy" variant="secondary" @click="copyInviteLink">Скопировать</Button>
          </div>
        </div>
        <p class="invite-hint">Ссылка активна 7 дней. Пока сотрудник не активировал профиль, он не появится в активных пользователях.</p>
        <div class="invite-success-actions">
          <Button variant="secondary" @click="closeInviteModal">Закрыть</Button>
          <Button @click="openInvitedUserProfile">Перейти к пользователю</Button>
        </div>
      </div>
      <div v-else>
        <div class="form-container">
          <div class="form-row">
            <Input v-model="inviteForm.lastName" label="Фамилия" placeholder="Иванов" required :error="inviteErrors.lastName" />
            <Input v-model="inviteForm.firstName" label="Имя" placeholder="Иван" required :error="inviteErrors.firstName" />
          </div>
          <Input v-model="inviteForm.phone" label="Номер телефона" placeholder="+7 (999) 000-00-00" :error="inviteErrors.phone" />
          <Select
            v-model.number="inviteForm.positionId"
            label="Должность"
            :options="positionOptions"
            placeholder="Выберите должность"
            required
            :error="inviteErrors.positionId"
          />
          <Select
            v-model.number="inviteForm.branchId"
            label="Филиал (Город)"
            :options="branchOptions"
            placeholder="Выберите филиал"
            required
            :error="inviteErrors.branchId"
          />
        </div>
        <div class="modal-actions">
          <Button variant="secondary" @click="closeInviteModal">Отмена</Button>
          <Button :loading="actionLoading" @click="handleInviteCreate">Создать приглашение</Button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import apiClient from "@/utils/axios";
import { getUsers, getReferences, createUser, updateUser, deleteUser, resetPassword, resetAssessmentProgress } from "@/api/users";
import { createInvitation } from "@/api/invitations";
import { Button, Badge, PageHeader, FilterBar, DataTable, TableHead, TableRow, TableCell, Tabs, Input, Select, Modal, Icon } from "@/components/ui";
import UserForm from "@/modules/users/components/UserForm.vue";
import UserPermissionsManager from "@/modules/users/components/UserPermissionsManager.vue";
import { useToast } from "@/composables/useToast";
import { formatBranchLabel } from "@/utils/branch";
import { BOT_USERNAME } from "@/env";

const authStore = useAuthStore();
const router = useRouter();
const loading = ref(false);
const actionLoading = ref(false);
const users = ref([]);
const totalUsers = ref(0);
const pagination = ref({
  page: 1,
  perPage: 20,
});
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
});

const showCreateModal = ref(false);
const showEditModal = ref(false);
const showResetPasswordModal = ref(false);
const showDeleteModal = ref(false);
const showProfileModal = ref(false);
const showResetProgressModal = ref(false);
const showInviteModal = ref(false);

const inviteForm = ref({ firstName: "", lastName: "", phone: "", positionId: "", branchId: "" });
const inviteErrors = ref({});
const inviteLink = ref("");
const inviteCreatedUserId = ref(null);

const selectedUser = ref(null);
const selectedAssessment = ref(null);
const userProfile = ref(null);
const profileLoading = ref(false);
const newPassword = ref("");
const { showToast } = useToast();
const generatedPassword = ref("");
const passwordGenerating = ref(false);
const passwordApplying = ref(false);
const selectedUserIds = ref([]);
const activeUserTab = ref("all");
const isCreateCredentialsSynced = ref(false);

const canEditUser = (user) => {
  // Superadmin может редактировать всех
  if (authStore.isSuperAdmin) return true;

  // Manager может редактировать себя
  if (authStore.isManager && user.id === authStore.user.id) return true;

  // Manager может редактировать только employee
  if (authStore.isManager && user.role_name === "employee") return true;

  return false;
};

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
  const total = totalUsers.value;
  const superadmin = users.value.filter((user) => user.role_name === "superadmin").length;
  const manager = users.value.filter((user) => user.role_name === "manager").length;
  const employee = users.value.filter((user) => user.role_name === "employee").length;
  const awaiting = users.value.filter((user) => !user.telegram_id).length;
  return { total, superadmin, manager, employee, awaiting };
});

const getUserStatus = (user) => {
  if (!user.telegram_id) {
    return { key: "awaiting", label: "Ожидает" };
  }
  return { key: "active", label: "Активен" };
};

const userTabs = computed(() => [
  { key: "all", label: "Все пользователи", count: stats.value.total },
  { key: "superadmin", label: "Суперадмины", count: stats.value.superadmin },
  { key: "manager", label: "Управляющие", count: stats.value.manager },
  { key: "employee", label: "Сотрудники", count: stats.value.employee },
  { key: "awaiting", label: "Ожидают приглашения", count: stats.value.awaiting },
]);

const userTabsConfig = computed(() => userTabs.value.map((t) => ({ value: t.key, label: t.label, badge: t.count })));

const visibleUsers = computed(() => {
  if (activeUserTab.value === "all") {
    return users.value;
  }
  if (activeUserTab.value === "awaiting") {
    return users.value.filter((user) => !user.telegram_id);
  }
  return users.value.filter((user) => user.role_name === activeUserTab.value);
});

const totalPages = computed(() => Math.max(1, Math.ceil(totalUsers.value / pagination.value.perPage)));
const allUsersSelected = computed(() => visibleUsers.value.length > 0 && visibleUsers.value.every((user) => selectedUserIds.value.includes(user.id)));

const filterBarModel = computed({
  get: () => ({ ...filters }),
  set: (val) => {
    Object.assign(filters, val);
  },
});

const filterDefs = computed(() => [
  { key: "branch", label: "Филиал", options: branchOptions.value, placeholder: "Все филиалы" },
  { key: "position", label: "Должность", options: positionOptions.value, placeholder: "Все должности" },
  { key: "role", label: "Роль", options: roleOptions.value, placeholder: "Все роли" },
]);

const onFilterChange = () => {
  pagination.value.page = 1;
  loadUsers();
};

const branchOptions = computed(() => [
  ...references.value.branches.map((branch) => ({
    value: String(branch.id),
    label: formatBranchLabel(branch),
  })),
]);

const positionOptions = computed(() => [
  ...references.value.positions.map((position) => ({
    value: String(position.id),
    label: position.name,
  })),
]);

const roleOptions = computed(() => [
  ...references.value.roles.map((role) => ({
    value: String(role.id),
    label: getRoleLabel(role.name),
  })),
]);

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
  return params;
};

const loadUsers = async (options = {}) => {
  const { forceFresh = false } = options;
  loading.value = true;
  try {
    const data = await getUsers(
      {
        ...buildFilters(),
        page: pagination.value.page,
        limit: pagination.value.perPage,
      },
      { forceFresh },
    );
    users.value = data.users || [];
    totalUsers.value = Number(data.total || 0);
    selectedUserIds.value = selectedUserIds.value.filter((id) => users.value.some((user) => user.id === id));
  } catch (error) {
    console.error("Ошибка загрузки пользователей", error);
    showToast("Не удалось загрузить пользователей", "error");
  } finally {
    loading.value = false;
  }
};

const toggleSelectAllUsers = () => {
  if (allUsersSelected.value) {
    selectedUserIds.value = [];
    return;
  }
  selectedUserIds.value = visibleUsers.value.map((user) => user.id);
};

const toggleUserSelection = (userId) => {
  if (selectedUserIds.value.includes(userId)) {
    selectedUserIds.value = selectedUserIds.value.filter((id) => id !== userId);
    return;
  }
  selectedUserIds.value = [...selectedUserIds.value, userId];
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
  pagination.value.page = 1;
  loadUsers();
};

const resetFilters = () => {
  filters.search = "";
  filters.branch = "";
  filters.position = "";
  filters.role = "";
  pagination.value.page = 1;
  loadUsers();
};

const goToPrevPage = () => {
  if (pagination.value.page <= 1) {
    return;
  }
  pagination.value.page -= 1;
  loadUsers();
};

const goToNextPage = () => {
  if (pagination.value.page >= totalPages.value) {
    return;
  }
  pagination.value.page += 1;
  loadUsers();
};

const openProfilePage = (user) => {
  if (!user?.id) return;
  router.push(`/users/${user.id}/profile`);
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
  if (score === null || score === undefined || score === "") {
    return 0;
  }
  const numericScore = Number(score);
  if (Number.isNaN(numericScore)) {
    return 0;
  }
  return Math.round(numericScore);
};

// Транслитерация кириллицы в латиницу для логина
const TRANSLITERATE_MAP = {
  "\u0430": "a",
  "\u0431": "b",
  "\u0432": "v",
  "\u0433": "g",
  "\u0434": "d",
  "\u0435": "e",
  "\u0451": "yo",
  "\u0436": "zh",
  "\u0437": "z",
  "\u0438": "i",
  "\u0439": "j",
  "\u043a": "k",
  "\u043b": "l",
  "\u043c": "m",
  "\u043d": "n",
  "\u043e": "o",
  "\u043f": "p",
  "\u0440": "r",
  "\u0441": "s",
  "\u0442": "t",
  "\u0443": "u",
  "\u0444": "f",
  "\u0445": "kh",
  "\u0446": "ts",
  "\u0447": "ch",
  "\u0448": "sh",
  "\u0449": "sch",
  "\u044a": "",
  "\u044b": "y",
  "\u044c": "",
  "\u044d": "e",
  "\u044e": "yu",
  "\u044f": "ya",
};

const transliterate = (text) => [...text.toLowerCase()].map((ch) => TRANSLITERATE_MAP[ch] ?? ch).join("");

const generateLogin = (lastName, firstName) => {
  if (!lastName && !firstName) return "";
  const last = transliterate(lastName.trim()).replace(/[^a-z0-9]/g, "");
  const firstLetter = firstName ? transliterate(firstName.trim().charAt(0)).replace(/[^a-z0-9]/g, "") : "";
  return firstLetter ? `${last}_${firstLetter}` : last;
};

const createdCredentials = ref(null);
const getAdminPanelLink = () => {
  if (typeof window === "undefined" || !window.location?.origin) return "/admin";
  return `${window.location.origin}/admin`;
};

const openCreateModal = () => {
  formData.value = defaultForm();
  createdCredentials.value = null;
  isCreateCredentialsSynced.value = true;
  showCreateModal.value = true;
};

const openEditModal = (user) => {
  isCreateCredentialsSynced.value = false;
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

const syncCreateCredentials = () => {
  if (!showCreateModal.value || showEditModal.value || !isCreateCredentialsSynced.value) return;
  const firstName = formData.value.firstName?.trim();
  const lastName = formData.value.lastName?.trim();
  if (!firstName || !lastName) return;

  formData.value.login = generateLogin(lastName, firstName);
  formData.value.password = generatePasswordFromForm();
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
  showResetProgressModal.value = false;
  actionLoading.value = false;
  profileLoading.value = false;
  formData.value = defaultForm();
  selectedUser.value = null;
  selectedAssessment.value = null;
  userProfile.value = null;
  newPassword.value = "";
  generatedPassword.value = "";
  passwordGenerating.value = false;
  passwordApplying.value = false;
  isCreateCredentialsSynced.value = false;
  // createdCredentials сбрасывается только при закрытии credentials-модала
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

  const autoLogin = formData.value.login?.trim() || generateLogin(formData.value.lastName, formData.value.firstName);
  const autoPassword = formData.value.password?.trim() || generatePasswordFromForm();

  actionLoading.value = true;
  try {
    const safeFirstName = formData.value.firstName.trim();
    const safeLastName = formData.value.lastName.trim();

    await createUser({
      firstName: safeFirstName,
      lastName: safeLastName,
      branchId: Number(formData.value.branchId),
      positionId: Number(formData.value.positionId),
      roleId: Number(formData.value.roleId),
      login: autoLogin || undefined,
      password: autoPassword,
    });

    const credentialsMessage = [
      `Логин: ${autoLogin || "—"}`,
      `Пароль: ${autoPassword || "—"}`,
      `Ссылка на админ-панель: ${getAdminPanelLink()}`,
    ].join("\n");

    await loadUsers();
    createdCredentials.value = {
      name: `${safeLastName} ${safeFirstName}`,
      login: autoLogin,
      password: autoPassword,
      message: credentialsMessage,
    };
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
    const deletedUserId = Number(selectedUser.value.id);
    await deleteUser(deletedUserId);

    // Моментально обновляем локальный список, чтобы пользователь сразу исчезал из UI.
    users.value = users.value.filter((user) => Number(user.id) !== deletedUserId);
    totalUsers.value = Math.max(0, totalUsers.value - 1);
    selectedUserIds.value = selectedUserIds.value.filter((id) => Number(id) !== deletedUserId);
    if (users.value.length === 0 && pagination.value.page > 1) {
      pagination.value.page -= 1;
    }

    await loadUsers({ forceFresh: true });
    closeModals();
    showToast("Пользователь удален", "success");
  } catch (error) {
    console.error("Ошибка удаления пользователя", error);
    showToast(error.response?.data?.error || "Не удалось удалить пользователя", "error");
  } finally {
    actionLoading.value = false;
  }
};

const openResetProgressModal = (assessment) => {
  if (!assessment?.id) {
    showToast("Не удалось определить ID аттестации", "error");
    return;
  }
  selectedAssessment.value = {
    id: assessment.id,
    title: assessment.title,
  };
  showResetProgressModal.value = true;
};

const handleResetProgress = async () => {
  if (!selectedUser.value || !selectedAssessment.value) return;

  actionLoading.value = true;
  try {
    await resetAssessmentProgress(selectedUser.value.id, selectedAssessment.value.id);

    // Обновляем профиль пользователя
    await openProfilePage(selectedUser.value);

    showResetProgressModal.value = false;
    selectedAssessment.value = null;
    showToast("Прогресс аттестации успешно сброшен", "success");
  } catch (error) {
    console.error("Ошибка сброса прогресса", error);
    showToast(error.response?.data?.error || "Не удалось сбросить прогресс", "error");
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

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatTimeSpent = (seconds) => {
  const totalSeconds = Number(seconds);
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "—";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  if (hours > 0) {
    return `${hours}ч ${minutes}м ${secs}с`;
  }
  if (minutes > 0) {
    return `${minutes}м ${secs}с`;
  }
  return `${secs}с`;
};

const formatAssessmentResult = (summary) => {
  if (!summary) return "—";
  const passScore = Number(summary.pass_score_percent);
  const bestScore = Number(summary.best_score_percent);
  if (Number.isFinite(passScore) && Number.isFinite(bestScore)) {
    return bestScore >= passScore ? "Сдана" : "Не сдана";
  }
  return "—";
};
const normalizeUserProfile = (profile) => {
  const safeProfile = profile || {};
  const user = safeProfile.user || {};
  return {
    ...safeProfile,
    stats: safeProfile.stats || {},
    rank: safeProfile.rank || {},
    badges: safeProfile.badges || [],
    assessmentsSummary: safeProfile.assessmentsSummary || [],
    user,
    nextLevel: safeProfile.nextLevel || null,
    progressToNextLevel: safeProfile.progressToNextLevel ?? 0,
    userPoints: user.points ?? safeProfile.points ?? 0,
  };
};

const getBranchNameById = (id) => {
  if (!id) return "";
  const branch = references.value.branches.find((item) => String(item.id) === String(id));
  return branch ? formatBranchLabel(branch) : "";
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
  const baseSeed = baseSeedText ? [...baseSeedText].reduce((acc, char) => acc + char.charCodeAt(0), 0) : Date.now();
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
    isCreateCredentialsSynced.value = false;
  }
};

const openInviteModal = () => {
  inviteForm.value = { firstName: "", lastName: "", phone: "", positionId: "", branchId: "" };
  inviteErrors.value = {};
  inviteLink.value = "";
  showInviteModal.value = true;
};

const closeInviteModal = () => {
  showInviteModal.value = false;
  inviteLink.value = "";
  inviteCreatedUserId.value = null;
  inviteErrors.value = {};
};

const validateInviteForm = () => {
  const errors = {};
  if (!inviteForm.value.firstName.trim()) errors.firstName = "Введите имя";
  if (!inviteForm.value.lastName.trim()) errors.lastName = "Введите фамилию";
  if (!inviteForm.value.positionId) errors.positionId = "Выберите должность";
  if (!inviteForm.value.branchId) errors.branchId = "Выберите филиал";
  inviteErrors.value = errors;
  return Object.keys(errors).length === 0;
};

const handleInviteCreate = async () => {
  if (!validateInviteForm()) return;

  actionLoading.value = true;
  try {
    const { data } = await createInvitation({
      firstName: inviteForm.value.firstName.trim(),
      lastName: inviteForm.value.lastName.trim(),
      phone: inviteForm.value.phone.trim() || undefined,
      positionId: Number(inviteForm.value.positionId),
      branchId: Number(inviteForm.value.branchId),
    });
    const code = data?.invitation?.code;
    inviteCreatedUserId.value = data?.invitation?.invited_user_id || null;
    if (code) {
      const botUsername = BOT_USERNAME || "";
      inviteLink.value = botUsername ? `https://t.me/${botUsername}?startapp=${code}` : `Код приглашения: ${code}`;
    }
    await loadUsers();
    showToast("Приглашение создано", "success");
  } catch (error) {
    console.error("Ошибка создания приглашения", error);
    showToast(error.response?.data?.error || "Не удалось создать приглашение", "error");
  } finally {
    actionLoading.value = false;
  }
};

const copyInviteLink = async () => {
  if (!inviteLink.value) return;
  try {
    await navigator.clipboard.writeText(inviteLink.value);
    showToast("Ссылка скопирована", "success");
  } catch {
    showToast("Не удалось скопировать ссылку", "error");
  }
};

const copyText = async (text) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Скопировано", "success");
  } catch {
    showToast("Не удалось скопировать", "error");
  }
};

const openInvitedUserProfile = () => {
  const userId = Number(inviteCreatedUserId.value);
  if (!Number.isInteger(userId) || userId <= 0) {
    showToast("Пользователь приглашения еще не создан", "warning");
    closeInviteModal();
    return;
  }
  closeInviteModal();
  router.push(`/users/${userId}/profile`);
};

watch(
  () => [formData.value.firstName, formData.value.lastName, formData.value.branchId, formData.value.positionId, showCreateModal.value],
  () => {
    syncCreateCredentials();
  },
);
onMounted(async () => {
  await loadReferences();
  await loadUsers();
});
</script>

<style scoped>
.users-view {
  width: 100%;
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

.password-actions-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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

.warning-text {
  color: #f59e0b;
  background: #fef3c7;
  padding: 12px;
  border-radius: 6px;
  border-left: 4px solid #f59e0b;
}

.delete-warning {
  display: flex;
  gap: 12px;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-left: 4px solid #ef4444;
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 20px;
}

.delete-warning-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.delete-warning-title {
  font-weight: 600;
  font-size: 14px;
  color: #b91c1c;
  margin: 0 0 6px;
}

.delete-warning-list {
  margin: 0 0 8px;
  padding-left: 18px;
  font-size: 13px;
  color: #7f1d1d;
  line-height: 1.6;
}

.delete-warning-note {
  font-size: 13px;
  font-weight: 600;
  color: #b91c1c;
  margin: 0;
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
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: bold;
  color: white;
  flex-shrink: 0;
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

.history-header {
  display: grid;
  grid-template-columns: 2fr 1fr 0.7fr 1.1fr 0.8fr 0.8fr;
  gap: 12px;
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
  padding: 0 20px;
}

.history-line {
  display: grid;
  grid-template-columns: 2fr 1fr 0.7fr 1.1fr 0.8fr 0.8fr;
  gap: 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
  align-items: center;
}

.history-title {
  font-weight: 600;
  color: var(--color-heading);
  font-size: 14px;
}

.history-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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
.bulk-actions {
  display: grid;
  grid-template-columns: 140px minmax(200px, 1fr) minmax(200px, 1fr) minmax(200px, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--divider);
}

.bulk-selected {
  font-size: 13px;
  color: var(--text-secondary);
}

@media (max-width: 1023px) {
  .bulk-actions {
    grid-template-columns: 1fr;
  }
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.invite-success {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.invite-success-head {
  text-align: center;
}

.invite-success-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 12px;
  border-radius: 999px;
  background: #22c55e;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 700;
}

.invite-success-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.1;
  color: var(--text-primary);
}

.invite-link-block {
  border: 1px solid var(--divider);
  border-radius: 12px;
  padding: 14px;
}

.invite-link-label {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.invite-success-text {
  font-size: 15px;
  color: var(--text-primary);
  margin: 8px 0 0;
}

.invite-link-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.invite-hint {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 10px;
  padding: 10px 12px;
}

.invite-success-actions {
  margin-top: 4px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.credentials-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.credentials-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.credentials-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.credentials-label {
  font-size: 14px;
  color: var(--text-secondary);
  min-width: 60px;
}

.credentials-value {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  background: var(--surface-card, #f4f4f5);
  padding: 4px 10px;
  border-radius: 6px;
  color: var(--text-primary);
}

.credentials-hint {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  background: #fef3c7;
  border-left: 3px solid #f59e0b;
  padding: 8px 12px;
  border-radius: 4px;
}

.credentials-message {
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid var(--divider);
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.create-hint {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 12px 0 0;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: hsl(var(--muted));
  color: var(--text-secondary);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  flex-shrink: 0;
}

.status-pill-awaiting {
  background: hsl(var(--color-warning-subtle));
  color: hsl(var(--accent-orange));
}

.status-pill-awaiting .status-dot {
  background: hsl(var(--accent-orange));
}

.status-pill-active {
  background: hsl(var(--accent-green-soft));
  color: hsl(var(--accent-green));
}

.status-pill-active .status-dot {
  background: hsl(var(--accent-green));
}
</style>
