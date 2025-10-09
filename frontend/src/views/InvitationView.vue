<template>
  <div class="page-container">
    <div class="container">
      <!-- Page Header -->
      <div class="page-header mb-24">
        <h1 class="title-large">Приглашение</h1>
        <p class="body-medium text-secondary">Подтвердите участие в системе аттестаций</p>
      </div>

      <!-- Invitation Info -->
      <div v-if="invitation" class="card invitation-card">
        <div class="invitation-header mb-16">
          <div class="invitation-icon">👋</div>
          <h2 class="title-medium">Вы приглашены!</h2>
        </div>

        <div class="invitation-details">
          <div class="detail-item">
            <span class="detail-label">Имя:</span>
            <span class="detail-value">{{ invitation.firstName }} {{ invitation.lastName }}</span>
          </div>

          <div class="detail-item">
            <span class="detail-label">Филиал:</span>
            <span class="detail-value">{{ invitation.branchName }}</span>
          </div>

          <div class="detail-item">
            <span class="detail-label">Роль:</span>
            <span class="detail-value">{{ invitation.roleName }}</span>
          </div>

          <div class="detail-item">
            <span class="detail-label">Действительно до:</span>
            <span class="detail-value">{{ formattedExpiryDate }}</span>
          </div>
        </div>

        <div class="invitation-actions">
          <button class="btn btn-primary btn-full" @click="acceptInvitation" :disabled="isLoading">
            {{ isLoading ? "Принимаем..." : "Принять приглашение" }}
          </button>
        </div>
      </div>

      <!-- No Invitation -->
      <div v-else class="card empty-state">
        <div class="empty-icon">❌</div>
        <h3 class="title-small mb-8">Приглашение недоступно</h3>
        <p class="body-small text-secondary">Приглашение не найдено или истекло. Попросите администратора отправить новую ссылку.</p>

        <div class="empty-actions">
          <button class="btn btn-secondary" @click="goToRegistration">Зарегистрироваться самостоятельно</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "../stores/user";
import { useTelegramStore } from "../stores/telegram";

export default {
  name: "InvitationView",
  setup() {
    const router = useRouter();
    const userStore = useUserStore();
    const telegramStore = useTelegramStore();

    const invitation = computed(() => userStore.invitation);
    const isLoading = computed(() => userStore.isLoading);

    const formattedExpiryDate = computed(() => {
      if (!invitation.value?.expiresAt) {
        return "—";
      }
      return new Date(invitation.value.expiresAt).toLocaleString("ru-RU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    });

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
          telegramStore.showAlert(result.error || "Ошибка принятия приглашения");
          telegramStore.hapticFeedback("notification", "error");
        }
      } catch (error) {
        console.error("Ошибка принятия приглашения", error);
        telegramStore.showAlert("Ошибка принятия приглашения");
        telegramStore.hapticFeedback("notification", "error");
      }
    }

    function goToRegistration() {
      router.push("/registration");
    }

    onMounted(async () => {
      // Страница отображает информацию о приглашении или сообщение об отсутствии
      // Логика перенаправления обрабатывается роутером
    });

    return {
      invitation,
      isLoading,
      formattedExpiryDate,
      acceptInvitation,
      goToRegistration,
    };
  },
};
</script>

<style scoped>
.invitation-card {
  max-width: 500px;
  margin: 0 auto;
  padding: 32px 24px;
  text-align: center;
}

.invitation-header {
  text-align: center;
}

.invitation-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.invitation-details {
  margin: 24px 0;
  text-align: left;
}

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
  font-size: 48px;
  margin-bottom: 16px;
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
