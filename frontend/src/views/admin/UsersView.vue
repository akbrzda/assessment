<template>
  <div class="page-container">
    <div class="container">
      <!-- Page Header -->
      <div class="page-header mb-16">
        <h1 class="page-title">Управление пользователями</h1>
        <p class="page-description">{{ adminStore.totalUsers }} пользователей, {{ adminStore.activeUsers }} активных</p>
      </div>

      <!-- Search and Filters -->
      <div class="filter-section">
        <div class="search-input-wrapper">
          <SearchIcon class="search-icon" />
          <input v-model="searchQuery" type="text" placeholder="Поиск по имени, email или позиции..." class="search-input" />
        </div>

        <div class="filters-row">
          <select v-model="selectedBranch" class="filter-select">
            <option value="">Все филиалы</option>
            <option v-for="branch in adminStore.branches" :key="branch.id" :value="branch.id">
              {{ branch.name }}
            </option>
          </select>

          <select v-model="selectedRole" class="filter-select">
            <option value="">Все роли</option>
            <option value="user">Пользователь</option>
            <option value="manager">Менеджер</option>
            <option value="admin">Администратор</option>
          </select>

          <select v-model="selectedStatus" class="filter-select">
            <option value="">Все статусы</option>
            <option value="active">Активные</option>
            <option value="inactive">Неактивные</option>
          </select>
        </div>
      </div>

      <!-- Users List -->
      <div class="users-section">
        <div v-if="filteredUsers.length" class="users-grid">
          <div v-for="user in paginatedUsers" :key="user.id" class="user-card">
            <div class="user-header">
              <div class="user-avatar">
                <div class="avatar-placeholder">
                  {{ getInitials(user.firstName, user.lastName) }}
                </div>
              </div>

              <div class="user-info">
                <div class="user-name">{{ user.firstName }} {{ user.lastName }}</div>
                <div class="user-username">@{{ user.username }}</div>
                <div class="user-position">{{ user.position }}</div>
              </div>

              <div class="user-status">
                <span class="status-badge" :class="user.status">
                  {{ user.status === "active" ? "Активен" : "Неактивен" }}
                </span>
              </div>
            </div>

            <div class="user-details">
              <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value">{{ user.email }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Телефон:</span>
                <span class="detail-value">{{ user.phone }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Филиал:</span>
                <span class="detail-value">{{ user.branch }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Отдел:</span>
                <span class="detail-value">{{ user.department }}</span>
              </div>
            </div>

            <div class="user-stats">
              <div class="stat-item">
                <span class="stat-value">{{ user.assessmentsCompleted }}</span>
                <span class="stat-label">Аттестаций</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ user.averageScore }}%</span>
                <span class="stat-label">Средний балл</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ formatDate(user.lastSeen) }}</span>
                <span class="stat-label">Последняя активность</span>
              </div>
            </div>

            <div class="user-footer">
              <div class="user-role">
                <span class="role-badge" :class="user.role">
                  {{ getRoleDisplayName(user.role) }}
                </span>
              </div>

              <div class="user-actions">
                <button class="action-btn edit" @click="editUser(user)" title="Редактировать">
                  <EditIcon class="w-4 h-4" />
                </button>
                <button class="action-btn delete" @click="confirmDeleteUser(user)" title="Удалить">
                  <DeleteIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <div class="empty-icon">
            <UsersIcon class="w-16 h-16" />
          </div>
          <h3 class="empty-title">Пользователи не найдены</h3>
          <p class="empty-description">
            {{ searchQuery ? "Попробуйте изменить параметры поиска" : "Начните с добавления первого пользователя" }}
          </p>
          <button v-if="!searchQuery" class="btn btn-primary" @click="showAddUserModal = true">Добавить пользователя</button>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination">
          <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">
            <ChevronLeftIcon class="w-4 h-4" />
          </button>

          <span class="page-info"> Страница {{ currentPage }} из {{ totalPages }} </span>

          <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">
            <ChevronRightIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Add User Modal -->
    <div v-if="showAddUserModal" class="modal-overlay" @click="closeAddUserModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">Добавить пользователя</h2>
          <button class="modal-close" @click="closeAddUserModal">
            <CloseIcon class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="addUser" class="modal-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Имя *</label>
              <input v-model="newUser.firstName" type="text" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Фамилия *</label>
              <input v-model="newUser.lastName" type="text" class="form-input" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Username *</label>
            <input v-model="newUser.username" type="text" class="form-input" required />
          </div>

          <div class="form-group">
            <label class="form-label">Email *</label>
            <input v-model="newUser.email" type="email" class="form-input" required />
          </div>

          <div class="form-group">
            <label class="form-label">Телефон</label>
            <input v-model="newUser.phone" type="tel" class="form-input" />
          </div>

          <div class="form-group">
            <label class="form-label">Позиция *</label>
            <input v-model="newUser.position" type="text" class="form-input" required />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Филиал *</label>
              <select v-model="newUser.branchId" class="form-select" required>
                <option value="">Выберите филиал</option>
                <option v-for="branch in adminStore.branches" :key="branch.id" :value="branch.id">
                  {{ branch.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Отдел *</label>
              <input v-model="newUser.department" type="text" class="form-input" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Роль *</label>
            <select v-model="newUser.role" class="form-select" required>
              <option value="user">Пользователь</option>
              <option value="manager">Менеджер</option>
              <option value="admin">Администратор</option>
            </select>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="closeAddUserModal">Отмена</button>
            <button type="submit" class="btn btn-primary">Добавить пользователя</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="cancelDeleteUser">
      <div class="modal-content delete-modal" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">Удалить пользователя</h2>
        </div>

        <div class="modal-body">
          <p>
            Вы действительно хотите удалить пользователя <strong>{{ userToDelete?.firstName }} {{ userToDelete?.lastName }}</strong
            >?
          </p>
          <p class="warning-text">Это действие нельзя будет отменить.</p>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-outline" @click="cancelDeleteUser">Отмена</button>
          <button type="button" class="btn btn-danger" @click="executeDeleteUser">Удалить</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from "vue";
import { useAdminStore } from "../../stores/admin";
import { useUnsavedChanges } from "../../composables/useUnsavedChanges";
import PlusIcon from "../../components/icons/PlusIcon.vue";
import SearchIcon from "../../components/icons/SearchIcon.vue";
import EditIcon from "../../components/icons/EditIcon.vue";
import DeleteIcon from "../../components/icons/DeleteIcon.vue";
import CloseIcon from "../../components/icons/CloseIcon.vue";
import UsersIcon from "../../components/icons/UsersIcon.vue";
import ChevronLeftIcon from "../../components/icons/ChevronLeftIcon.vue";
import ChevronRightIcon from "../../components/icons/ChevronRightIcon.vue";

export default {
  name: "UsersView",
  components: {
    PlusIcon,
    SearchIcon,
    EditIcon,
    DeleteIcon,
    CloseIcon,
    UsersIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
  },
  setup() {
    const adminStore = useAdminStore();
    const { markAsUnsaved, markAsSaved } = useUnsavedChanges("users-admin");

    // State
    const searchQuery = ref("");
    const selectedBranch = ref("");
    const selectedRole = ref("");
    const selectedStatus = ref("");
    const currentPage = ref(1);
    const usersPerPage = 12;

    const showAddUserModal = ref(false);
    const showDeleteModal = ref(false);
    const userToDelete = ref(null);

    const newUser = ref({
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      phone: "",
      position: "",
      branchId: "",
      department: "",
      role: "user",
      status: "active",
    });

    // Watch for changes in form to track unsaved changes
    watch(
      newUser,
      () => {
        if (showAddUserModal.value && isFormDirty()) {
          markAsUnsaved();
        }
      },
      { deep: true }
    );

    // Check if form has any data
    const isFormDirty = () => {
      const emptyForm = {
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        phone: "",
        position: "",
        branchId: "",
        department: "",
        role: "user",
        status: "active",
      };

      return Object.keys(emptyForm).some((key) => newUser.value[key] !== emptyForm[key]);
    };

    // Computed
    const filteredUsers = computed(() => {
      let users = adminStore.users;

      // Search filter
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        users = users.filter(
          (user) =>
            user.firstName.toLowerCase().includes(query) ||
            user.lastName.toLowerCase().includes(query) ||
            user.username.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.position.toLowerCase().includes(query)
        );
      }

      // Branch filter
      if (selectedBranch.value) {
        const branch = adminStore.branches.find((b) => b.id === parseInt(selectedBranch.value));
        if (branch) {
          users = users.filter((user) => user.branch === branch.name);
        }
      }

      // Role filter
      if (selectedRole.value) {
        users = users.filter((user) => user.role === selectedRole.value);
      }

      // Status filter
      if (selectedStatus.value) {
        users = users.filter((user) => user.status === selectedStatus.value);
      }

      return users;
    });

    const totalPages = computed(() => {
      return Math.ceil(filteredUsers.value.length / usersPerPage);
    });

    const paginatedUsers = computed(() => {
      const start = (currentPage.value - 1) * usersPerPage;
      const end = start + usersPerPage;
      return filteredUsers.value.slice(start, end);
    });

    // Watch for filter changes to reset pagination
    watch([searchQuery, selectedBranch, selectedRole, selectedStatus], () => {
      currentPage.value = 1;
    });

    // Methods
    const getInitials = (firstName, lastName) => {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    };

    const getRoleDisplayName = (role) => {
      const roleMap = {
        user: "Пользователь",
        manager: "Менеджер",
        admin: "Администратор",
      };
      return roleMap[role] || role;
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString("ru-RU");
    };

    const closeAddUserModal = () => {
      showAddUserModal.value = false;
      markAsSaved(); // Mark as saved when closing modal
      resetNewUser();
    };

    const resetNewUser = () => {
      newUser.value = {
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        phone: "",
        position: "",
        branchId: "",
        department: "",
        role: "user",
        status: "active",
      };
    };

    const addUser = () => {
      try {
        // В текущей версии создание пользователя недоступно — показать уведомление
        adminStore.addUser();
      } catch (error) {
        window.alert(error.message || "Создание пользователя недоступно. Используйте приглашения.");
      }
      closeAddUserModal();
    };

    const editUser = (user) => {
      // TODO: Implement edit functionality
      console.log("Edit user:", user);
    };

    const confirmDeleteUser = (user) => {
      userToDelete.value = user;
      showDeleteModal.value = true;
    };

    const cancelDeleteUser = () => {
      userToDelete.value = null;
      showDeleteModal.value = false;
    };

    const executeDeleteUser = () => {
      if (userToDelete.value) {
        adminStore
          .deleteUser(userToDelete.value.id)
          .catch((error) => {
            window.alert(error.message || "Не удалось удалить пользователя");
          })
          .finally(() => {
            cancelDeleteUser();
          });
      }
    };

    onMounted(() => {
      adminStore.initialize().catch((error) => {
        console.error("Не удалось загрузить данные админ-панели", error);
      });
    });

    return {
      adminStore,
      searchQuery,
      selectedBranch,
      selectedRole,
      selectedStatus,
      currentPage,
      showAddUserModal,
      showDeleteModal,
      userToDelete,
      newUser,
      filteredUsers,
      paginatedUsers,
      totalPages,
      getInitials,
      getRoleDisplayName,
      formatDate,
      closeAddUserModal,
      addUser,
      editUser,
      confirmDeleteUser,
      cancelDeleteUser,
      executeDeleteUser,
    };
  },
};
</script>

<style scoped>
.admin-users {
  background-color: var(--bg-primary);
  min-height: 100vh;
  padding-bottom: 80px;
}
.page-header {
  padding-top: 20px;
}

.filter-section {
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--divider);
  padding: 12px;
  margin-bottom: 24px;
  border-radius: 16px;
}
.btn svg {
  color: #fff;
  width: 20px;
  height: 20px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.page-description {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0;
}

.search-filters {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-input-wrapper {
  position: relative;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: var(--text-secondary);
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 48px;
  border: 2px solid var(--divider);
  border-radius: 12px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 16px;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-blue);
}

.filters-row {
  margin-top: 12px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-select {
  padding: 10px 16px;
  border: 2px solid var(--divider);
  border-radius: 8px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  min-width: 160px;
}

.users-section {
  padding: 0;
}

.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.user-card {
  background-color: var(--bg-secondary);
  border-radius: 16px;
  padding: 6px 12px;
  border: 1px solid var(--divider);
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: var(--accent-blue);
}

.user-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.user-avatar {
  flex-shrink: 0;
}

.avatar-placeholder {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  font-weight: 600;
}

.user-info {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.user-username {
  font-size: 14px;
  color: var(--text-secondary);
}

.user-position {
  font-size: 14px;
  color: var(--text-primary);
  margin: 0;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.active {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--success);
}

.status-badge.inactive {
  background-color: rgba(156, 163, 175, 0.2);
  color: var(--text-secondary);
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  font-size: 14px;
  color: var(--text-secondary);
  min-width: 80px;
}

.detail-value {
  font-size: 14px;
  color: var(--text-primary);
  text-align: right;
  word-break: break-word;
}

.user-stats {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  flex: 1;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.user-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--divider);
}

.role-badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.role-badge.user {
  background-color: rgba(59, 130, 246, 0.1);
  color: var(--accent-blue);
}

.role-badge.manager {
  background-color: rgba(245, 158, 11, 0.1);
  color: var(--warning);
}

.role-badge.admin {
  background-color: rgba(139, 92, 246, 0.1);
  color: var(--accent-purple);
}

.user-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.edit {
  background-color: rgba(59, 130, 246, 0.1);
  color: var(--accent-blue);
}

.action-btn.edit:hover {
  background-color: rgba(59, 130, 246, 0.2);
}

.action-btn.delete {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--error);
}

.action-btn.delete:hover {
  background-color: rgba(239, 68, 68, 0.2);
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  margin-bottom: 24px;
  color: var(--text-secondary);
}

.empty-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.empty-description {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0 0 24px 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.5;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 32px;
}

.page-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid var(--divider);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: var(--text-secondary);
}

/* Modal Styles */

.form-row {
  display: flex;
  gap: 16px;
}

.form-group {
  margin-bottom: 20px;
  flex: 1;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--divider);
  border-radius: 8px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 16px;
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--accent-blue);
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.delete-modal .modal-body {
  text-align: center;
}

.warning-text {
  color: var(--error);
  font-size: 14px;
  margin-top: 8px;
}

@media (max-width: 768px) {
  .header-top {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .search-filters {
    gap: 12px;
  }

  .filters-row {
    flex-direction: column;
  }

  .filter-select {
    min-width: auto;
  }

  .users-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .user-header {
    gap: 12px;
    text-align: center;
  }

  .user-stats {
    justify-content: space-around;
  }

  .form-row {
    flex-direction: column;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }
}
</style>
