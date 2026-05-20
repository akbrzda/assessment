<template>
  <div class="page-container">
    <div class="container">
      <div class="registration-card">
        <div class="welcome-section">
          <h1 class="title-large mb-8">Вход в систему</h1>
          <p class="body-medium text-secondary">
            Подтвердите номер телефона. Если номер уже есть в системе, мы автоматически подключим ваш профиль.
          </p>
        </div>

        <div class="registration-actions">
          <button type="button" class="btn btn-primary btn-full" :disabled="isLoading || isRequestingContact" @click="handlePhoneVerification">
            {{ buttonText }}
          </button>
        </div>

        <p class="body-small text-secondary help-text">Если номер не найден, понадобится персональная ссылка-приглашение от администратора.</p>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useTelegramStore } from "../stores/telegram";
import { useUserStore } from "../stores/user";

export default {
  name: "RegistrationView",
  setup() {
    const router = useRouter();
    const telegramStore = useTelegramStore();
    const userStore = useUserStore();
    const isRequestingContact = ref(false);

    const isLoading = computed(() => userStore.isLoading);
    const buttonText = computed(() => {
      if (isRequestingContact.value) {
        return "Ожидаем подтверждение номера...";
      }
      if (isLoading.value) {
        return "Проверяем номер...";
      }
      return "Подтвердить номер телефона";
    });

    async function handlePhoneVerification() {
      let contactPayload = null;
      try {
        isRequestingContact.value = true;
        contactPayload = await telegramStore.requestContactPayload();
      } catch (contactError) {
        telegramStore.showAlert(contactError.message || "Не удалось подтвердить номер телефона");
        telegramStore.hapticFeedback("notification", "error");
        return;
      } finally {
        isRequestingContact.value = false;
      }

      const result = await userStore.register({ contact: contactPayload });

      if (result.success) {
        telegramStore.hapticFeedback("notification", "success");
        router.replace({ name: "dashboard" });
        return;
      }

      telegramStore.showAlert(result.error || "Профиль не найден. Запросите ссылку-приглашение у администратора.");
      telegramStore.hapticFeedback("notification", "error");
    }

    onMounted(async () => {
      if (!userStore.isInitialized) {
        await userStore.ensureStatus();
      }

      if (userStore.isAuthenticated) {
        router.replace({ name: "dashboard" });
      }
    });

    return {
      isLoading,
      isRequestingContact,
      buttonText,
      handlePhoneVerification,
    };
  },
};
</script>

<style scoped>
.registration-card {
  max-width: 420px;
  margin: 20px auto 0;
  padding: 28px 22px;
  background-color: var(--bg-secondary);
  border-radius: 16px;
}

.welcome-section {
  margin-bottom: 24px;
  text-align: center;
}

.text-secondary {
  color: var(--text-secondary);
}

.help-text {
  margin-top: 12px;
  text-align: center;
}

@media (max-width: 480px) {
  .registration-card {
    margin-top: 10px;
    padding: 24px 18px;
  }
}
</style>
