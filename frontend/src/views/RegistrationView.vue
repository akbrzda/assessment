<template>
  <div class="page-container">
    <div class="container">
      <div class="registration-card">
        <div class="welcome-section">
          <h1 class="title-large mb-8">Регистрация</h1>
          <p class="body-medium text-secondary">
            {{ invitation ? "Заполните данные для завершения регистрации" : "Заполните данные для создания аккаунта" }}
          </p>
        </div>
        <form @submit.prevent="handleRegistration" class="registration-form">
          <div class="form-group">
            <label class="form-label">Имя</label>
            <input
              v-model="form.firstName"
              type="text"
              class="form-input"
              :class="{ error: errors.firstName }"
              :readonly="isInviteLocked"
              placeholder="Введите ваше имя"
              required
            />
            <div v-if="errors.firstName" class="form-error">{{ errors.firstName }}</div>
          </div>

          <div class="form-group">
            <label class="form-label">Фамилия</label>
            <input
              v-model="form.lastName"
              type="text"
              class="form-input"
              :class="{ error: errors.lastName }"
              :readonly="isInviteLocked"
              placeholder="Введите вашу фамилию"
              required
            />
            <div v-if="errors.lastName" class="form-error">{{ errors.lastName }}</div>
          </div>

          <div class="form-group">
            <label class="form-label">Должность</label>
            <select v-model="form.positionId" class="form-select" :class="{ error: errors.positionId }" :disabled="isInviteLocked" required>
              <option value="">Выберите должность</option>
              <option v-for="position in positions" :key="position.id" :value="position.id">
                {{ position.name }}
              </option>
            </select>
            <div v-if="errors.positionId" class="form-error">{{ errors.positionId }}</div>
          </div>

          <div class="form-group">
            <label class="form-label">Филиал</label>
            <select v-model="form.branchId" class="form-select" :class="{ error: errors.branchId }" :disabled="isInviteLocked" required>
              <option value="">Выберите филиал</option>
              <option v-for="branch in branches" :key="branch.id" :value="branch.id">
                {{ branch.name }}
              </option>
            </select>
            <div v-if="errors.branchId" class="form-error">{{ errors.branchId }}</div>
          </div>

          <div class="registration-actions">
            <button type="submit" class="btn btn-primary btn-full" :disabled="!isFormValid || isLoading">
              {{ isLoading ? "Регистрация..." : "Зарегистрироваться" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { reactive, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useTelegramStore } from "../stores/telegram";
import { useUserStore } from "../stores/user";

export default {
  name: "RegistrationView",
  setup() {
    const router = useRouter();
    const telegramStore = useTelegramStore();
    const userStore = useUserStore();

    const form = reactive({
      firstName: "",
      lastName: "",
      positionId: "",
      branchId: "",
      inviteCode: "",
    });

    const errors = reactive({
      firstName: "",
      lastName: "",
      positionId: "",
      branchId: "",
    });

    const isLoading = computed(() => userStore.isLoading);
    const branches = computed(() => userStore.references.branches || []);
    const invitation = computed(() => userStore.invitation);
    const isInviteLocked = computed(() => Boolean(invitation.value));

    // Функция для поиска должности по имени
    function findPositionByName(name) {
      if (!name) return null;
      const normalized = String(name).toLowerCase();
      return userStore.references.positions.find((item) => item.name.toLowerCase() === normalized) || null;
    }

    const managerPositionId = computed(() => {
      const manager = findPositionByName("управляющий") || findPositionByName("manager");
      return manager ? manager.id : null;
    });

    // Фильтрация должностей - скрываем "Управляющий" если это не приглашение на эту роль
    const positions = computed(() => {
      const list = userStore.references.positions || [];
      const inviteRole = invitation.value?.roleName?.toLowerCase();
      if (inviteRole === "управляющий" || inviteRole === "manager") {
        return list;
      }
      return list.filter((item) => {
        const name = item.name.toLowerCase();
        return name !== "управляющий" && name !== "manager";
      });
    });

    const isFormValid = computed(() => {
      return form.firstName.trim() && form.lastName.trim() && form.positionId && form.branchId;
    });

    function validateForm() {
      errors.firstName = form.firstName.trim() ? "" : "Введите имя";
      errors.lastName = form.lastName.trim() ? "" : "Введите фамилию";
      errors.positionId = form.positionId ? "" : "Выберите должность";
      errors.branchId = form.branchId ? "" : "Выберите филиал";

      return !Object.values(errors).some((error) => error);
    }

    async function handleRegistration() {
      if (!validateForm()) return;

      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        positionId: Number(form.positionId),
        branchId: Number(form.branchId),
      };

      // Добавляем код приглашения если есть
      if (form.inviteCode) {
        payload.inviteCode = form.inviteCode;
      }

      const result = await userStore.register(payload);

      if (result.success) {
        telegramStore.hapticFeedback("notification", "success");
        router.replace({ name: "dashboard" });
      } else {
        telegramStore.showAlert(result.error || "Ошибка регистрации");
        telegramStore.hapticFeedback("notification", "error");
      }
    }

    onMounted(async () => {
      // Проверяем статус пользователя
      if (!userStore.isInitialized) {
        await userStore.ensureStatus();
      }

      if (userStore.isAuthenticated) {
        router.push("/dashboard");
        return;
      }

      // Загружаем справочники
      await userStore.loadReferences();

      // Автозаполнение из Telegram и сохраненных значений
      const telegramUser = telegramStore.user;
      const defaults = userStore.registrationDefaults || {};

      form.firstName = telegramUser?.first_name || defaults.firstName || "";
      form.lastName = telegramUser?.last_name || defaults.lastName || "";

      // Обработка приглашений как в старом фронте
      const invitationData = userStore.invitation;
      if (invitationData) {
        if (invitationData.firstName) {
          form.firstName = invitationData.firstName;
        }
        if (invitationData.lastName) {
          form.lastName = invitationData.lastName;
        }
        if (invitationData.branchId) {
          form.branchId = Number(invitationData.branchId);
        }
        if (invitationData.code) {
          form.inviteCode = invitationData.code;
        }

        // Автоматический выбор должности для управляющего
        const managerId = managerPositionId.value;
        form.positionId = managerId ? Number(managerId) : "";

        if (invitationData.roleName) {
          const matched = findPositionByName(invitationData.roleName);
          if (matched) {
            form.positionId = Number(matched.id);
          }
        }
      }
    });

    return {
      form,
      errors,
      isLoading,
      isFormValid,
      branches,
      positions,
      invitation,
      isInviteLocked,
      handleRegistration,
    };
  },
};
</script>

<style scoped>
.registration-card {
  max-width: 400px;
  margin: 0 auto;
  padding: 32px 24px;
  background-color: var(--bg-secondary);
  border-radius: 16px;
  margin-top: 20px;
}

.welcome-section {
  margin-bottom: 32px;
  text-align: center;
}

.registration-form {
  margin-bottom: 0;
}

.form-input.error,
.form-select.error {
  border-color: var(--error);
}

.form-input:read-only,
.form-select:disabled {
  background-color: var(--bg-secondary);
  cursor: not-allowed;
  opacity: 0.7;
}

.text-secondary {
  color: var(--text-secondary);
}

@media (max-width: 480px) {
  .registration-card {
    margin-top: 10px;
    padding: 24px 20px;
  }
}
</style>
