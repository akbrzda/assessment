<template>
  <div class="page-container">
    <div class="container">
      <!-- Page Header -->
      <div class="page-header mb-24">
        <h1 class="title-large">Приглашение</h1>
        <p class="body-medium text-secondary">Подтвердите участие в системе аттестаций</p>
      </div>

      <!-- Ошибка: уже зарегистрирован -->
      <div v-if="alreadyRegisteredError" class="card empty-state">
        <div class="empty-icon">
          <XCircle />
        </div>
        <h3 class="title-small mb-8">Вы уже зарегистрированы</h3>
        <p class="body-small text-secondary">Эта ссылка-приглашение вам недоступна, так как вы уже зарегистрированы в системе под другим аккаунтом.</p>
      </div>

      <!-- Invitation Info -->
      <div v-else-if="invitation" class="card invitation-card">
        <div class="invitation-header mb-16">
          <div class="invitation-icon">
            <Hand />
          </div>
          <h2 class="title-medium">Вы приглашены!</h2>
        </div>

        <div class="invitation-details">
          <div class="detail-item">
            <span class="detail-label">ФИО:</span>
            <span class="detail-value">{{ invitation.lastName }} {{ invitation.firstName }}</span>
          </div>

          <div v-if="invitation.phone" class="detail-item">
            <span class="detail-label">Телефон:</span>
            <span class="detail-value">{{ invitation.phone }}</span>
          </div>

          <div v-if="invitation.positionName" class="detail-item">
            <span class="detail-label">Должность:</span>
            <span class="detail-value">{{ invitation.positionName }}</span>
          </div>

          <div class="detail-item">
            <span class="detail-label">Филиал:</span>
            <span class="detail-value">{{ invitation.branchName }}</span>
          </div>
        </div>

        <p class="body-small text-secondary mb-16">Проверьте данные. Если всё верно — нажмите кнопку для подтверждения.</p>

        <div class="invitation-actions">
          <button class="btn btn-primary btn-full" @click="acceptInvitation" :disabled="isLoading">
            {{ isLoading ? "Принимаем..." : "Подтвердить и войти" }}
          </button>
        </div>
      </div>

      <!-- No Invitation -->
      <div v-else class="card empty-state">
        <div class="empty-icon">
          <XCircle />
        </div>
        <h3 class="title-small mb-8">Приглашение недоступно</h3>
        <p class="body-small text-secondary">Приглашение не найдено или истекло. Попросите администратора отправить новую ссылку.</p>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { Hand, XCircle } from "lucide-vue-next";
import { useUserStore } from "../stores/user";
import { useTelegramStore } from "../stores/telegram";

export default {
  name: "InvitationView",
  components: {
    Hand,
    XCircle,
  },
  setup() {
    const router = useRouter();
    const userStore = useUserStore();
    const telegramStore = useTelegramStore();

    const alreadyRegisteredError = ref(false);
    const invitation = computed(() => userStore.invitation);
    const isLoading = computed(() => userStore.isLoading);

    async function acceptInvitation() {
      if (!invitation.value) {
        telegramStore.showAlert("Приглашение недоступно.");
        return;
      }

      try {
        const result = await userStore.acceptInvitation();
        if (result.success) {
          telegramStore.hapticFeedback("notification", "success");
          router.replace({ name: "dashboard" });
        } else {
          const errorMsg = result.error || "Ошибка принятия приглашения";
          if (errorMsg.includes("уже зарегистрирован") || errorMsg.includes("already registered")) {
            alreadyRegisteredError.value = true;
          } else {
            telegramStore.showAlert(errorMsg);
          }
          telegramStore.hapticFeedback("notification", "error");
        }
      } catch (error) {
        console.error("Ошибка принятия приглашения", error);
        telegramStore.showAlert("Ошибка принятия приглашения");
        telegramStore.hapticFeedback("notification", "error");
      }
    }

    onMounted(async () => {
      // Страница отображает информацию о приглашении или сообщение об отсутствии
    });

    return {
      invitation,
      isLoading,
      alreadyRegisteredError,
      acceptInvitation,
    };
  },
};
</script>

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 500;
  color: var(--text-secondary);
}

.detail-value {
  font-weight: 600;
  color: var(--text-primary);
}

.invitation-actions {
  margin-top: 24px;
}

.empty-state {
  max-width: 400px;
  margin: 0 auto;
  padding: 40px 24px;
  text-align: center;
}

.empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.empty-icon svg {
  width: 48px;
  height: 48px;
}

.empty-actions {
  margin-top: 24px;
}

@media (max-width: 480px) {
  .invitation-card,
  .empty-state {
    margin: 0 12px;
    padding: 24px 20px;
  }

  .detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
