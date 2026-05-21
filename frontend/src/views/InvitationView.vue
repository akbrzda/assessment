<template>
  <div class="page-container">
    <div class="container invitation-page">
      <div class="invite-hero">
        <div>
          <h1 class="title-large invite-title">Приглашение</h1>
          <p class="body-medium invite-subtitle">Подтвердите участие в системе аттестаций</p>
        </div>
        <div class="invite-hero-art" aria-hidden="true">
          <MailCheck />
        </div>
      </div>

      <div v-if="alreadyRegisteredError" class="card empty-state">
        <div class="empty-icon">
          <XCircle />
        </div>
        <h3 class="title-small mb-8">Вы уже зарегистрированы</h3>
        <p class="body-small text-secondary">Эта ссылка-приглашение недоступна, так как вы уже зарегистрированы в системе под другим аккаунтом.</p>
      </div>

      <div v-else-if="invitation" class="card invitation-card">
        <div class="invitation-details">
          <div class="detail-item">
            <div class="detail-icon detail-icon--violet">
              <User />
            </div>
            <div class="detail-content">
              <span class="detail-label">ФИО</span>
              <span class="detail-value">{{ fullName }}</span>
            </div>
          </div>

          <div v-if="invitation.positionName" class="detail-item">
            <div class="detail-icon detail-icon--green">
              <BriefcaseBusiness />
            </div>
            <div class="detail-content">
              <span class="detail-label">Должность</span>
              <span class="detail-value">{{ invitation.positionName }}</span>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon detail-icon--orange">
              <Building2 />
            </div>
            <div class="detail-content">
              <span class="detail-label">Филиал</span>
              <span class="detail-value">{{ invitation.branchName }}</span>
            </div>
          </div>
        </div>

        <div class="invite-steps">
          <div class="invite-step">
            <CheckCircle2 />
            <span>Шаг 1: убедитесь, что ФИО, должность и филиал указаны верно.</span>
          </div>
          <div class="invite-step">
            <Phone />
            <span>Шаг 2: нажмите кнопку ниже и поделитесь номером телефона.</span>
          </div>
          <div class="invite-step">
            <ShieldCheck />
            <span>Шаг 3: система сверит номер с приглашением и активирует доступ.</span>
          </div>
        </div>

        <label class="invite-confirm">
          <input v-model="confirmDataChecked" type="checkbox" />
          <span>Подтверждаю, что мои данные в приглашении указаны корректно.</span>
        </label>

        <div class="invitation-actions">
          <button
            class="btn btn-primary btn-full invitation-button"
            @click="acceptInvitation"
            :disabled="isLoading || isRequestingContact || !confirmDataChecked"
          >
            <span>{{ buttonText }}</span>
            <ArrowRight />
          </button>
          <p class="invitation-actions-hint">После нажатия откроется системный запрос на передачу номера телефона.</p>
          <div v-if="errorMessage" class="error-banner" role="alert">{{ errorMessage }}</div>
        </div>
      </div>

      <div v-else-if="isLoading" class="card empty-state">
        <h3 class="title-small mb-8">Загружаем приглашение</h3>
        <p class="body-small text-secondary">Пожалуйста, подождите...</p>
      </div>

      <div v-else-if="inviteFlow.hasInviteCode" class="card empty-state">
        <div class="empty-icon">
          <XCircle />
        </div>
        <h3 class="title-small mb-8">Приглашение недоступно</h3>
        <p class="body-small text-secondary">Приглашение не найдено или истекло. Попросите администратора отправить новую ссылку.</p>
      </div>

      <div v-else class="card empty-state">
        <div class="empty-icon">
          <MailCheck />
        </div>
        <h3 class="title-small mb-8">Вход только по приглашению</h3>
        <p class="body-small text-secondary">{{ welcomeText }}</p>
        <p class="body-small text-secondary mt-8">Попросите руководителя или администратора отправить персональную ссылку-приглашение.</p>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ArrowRight, BriefcaseBusiness, Building2, CheckCircle2, Hand, MailCheck, Phone, ShieldCheck, User, XCircle } from "lucide-vue-next";
import { useUserStore } from "../stores/user";
import { useTelegramStore } from "../stores/telegram";

export default {
  name: "InvitationView",
  components: {
    ArrowRight,
    BriefcaseBusiness,
    Building2,
    CheckCircle2,
    Hand,
    MailCheck,
    Phone,
    ShieldCheck,
    User,
    XCircle,
  },
  setup() {
    const router = useRouter();
    const userStore = useUserStore();
    const telegramStore = useTelegramStore();

    const alreadyRegisteredError = ref(false);
    const confirmDataChecked = ref(false);
    const isRequestingContact = ref(false);
    const errorMessage = ref("");
    const invitation = computed(() => userStore.invitation);
    const inviteFlow = computed(() => userStore.inviteFlow || { hasInviteCode: false, inviteCodeValid: false, registrationByInvitationOnly: true });
    const isLoading = computed(() => userStore.isLoading);
    const welcomeText = computed(() => {
      const firstName = userStore.registrationDefaults?.firstName || telegramStore.user?.first_name || "";
      return firstName
        ? `${firstName}, у вас пока нет активного приглашения для входа в систему.`
        : "У вас пока нет активного приглашения для входа в систему.";
    });
    const fullName = computed(() => {
      if (!invitation.value) {
        return "";
      }

      const parts = [invitation.value.lastName, invitation.value.firstName, invitation.value.middleName].filter(Boolean);
      return parts.join(" ");
    });
    const buttonText = computed(() => {
      if (isRequestingContact.value) {
        return "Ожидаем подтверждение номера...";
      }
      if (isLoading.value) {
        return "Подтверждаем приглашение...";
      }
      return "Подтвердить данные и войти";
    });

    async function acceptInvitation() {
      errorMessage.value = "";
      if (!invitation.value) {
        errorMessage.value = "Приглашение недоступно.";
        telegramStore.showAlert("Приглашение недоступно.");
        return;
      }
      if (!confirmDataChecked.value) {
        errorMessage.value = "Отметьте подтверждение данных, чтобы продолжить.";
        telegramStore.showAlert("Отметьте подтверждение данных, чтобы продолжить.");
        return;
      }

      try {
        let contactPayload = null;
        try {
          isRequestingContact.value = true;
          contactPayload = await telegramStore.requestContactPayload();
        } catch (contactError) {
          const msg = contactError.message || "Чтобы продолжить, нужно поделиться номером телефона.";
          errorMessage.value = msg;
          telegramStore.showAlert(msg);
          telegramStore.hapticFeedback("notification", "error");
          return;
        } finally {
          isRequestingContact.value = false;
        }

        const result = await userStore.acceptInvitation(contactPayload);
        if (result.success) {
          telegramStore.hapticFeedback("notification", "success");
          router.replace({ name: "dashboard" });
        } else {
          const errMsg = result.error || "Ошибка принятия приглашения";
          if (errMsg.includes("уже зарегистрирован") || errMsg.includes("already registered")) {
            alreadyRegisteredError.value = true;
          } else {
            errorMessage.value = errMsg;
            telegramStore.showAlert(errMsg);
          }
          telegramStore.hapticFeedback("notification", "error");
        }
      } catch (error) {
        console.error("Ошибка принятия приглашения", error);
        errorMessage.value = "Ошибка принятия приглашения";
        telegramStore.showAlert("Ошибка принятия приглашения");
        telegramStore.hapticFeedback("notification", "error");
      }
    }

    onMounted(async () => {
      // Страница отображает информацию о приглашении или сообщение об отсутствии
    });

    watch(
      () => ({
        hasInviteCode: Boolean(inviteFlow.value?.hasInviteCode),
        registrationByInvitationOnly: Boolean(inviteFlow.value?.registrationByInvitationOnly),
        loading: Boolean(isLoading.value),
      }),
      (state) => {
        // Если инвайта нет и регистрация без инвайта разрешена — уводим на регистрацию.
        if (!state.loading && !state.hasInviteCode && !state.registrationByInvitationOnly) {
          router.replace({ name: "registration" });
        }
      },
      { immediate: true },
    );

    return {
      invitation,
      inviteFlow,
      isLoading,
      isRequestingContact,
      welcomeText,
      fullName,
      alreadyRegisteredError,
      confirmDataChecked,
      errorMessage,
      buttonText,
      acceptInvitation,
    };
  },
};
</script>

<style scoped>
.invitation-page {
  padding-top: 12px;
}

.invite-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.invite-title {
  margin-bottom: 8px;
}

.invite-subtitle {
  max-width: 280px;
  font-size: 18px;
  line-height: 1.4;
  color: var(--text-secondary);
}

.invite-hero-art {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6355f5;
  background:
    radial-gradient(circle at 30% 15%, rgba(99, 85, 245, 0.28), transparent 55%),
    linear-gradient(160deg, rgba(99, 85, 245, 0.15), rgba(99, 85, 245, 0.04));
}

.invite-hero-art svg {
  width: 32px;
  height: 32px;
}

.invitation-intro-title {
  margin-bottom: 4px;
}

.invitation-icon,
.detail-icon {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.invitation-icon svg,
.detail-icon svg {
  width: 26px;
  height: 26px;
}

.invitation-icon--violet,
.detail-icon--violet {
  color: #6355f5;
  background: rgba(99, 85, 245, 0.11);
}

.detail-icon--green {
  color: #24b67f;
  background: rgba(36, 182, 127, 0.14);
}

.detail-icon--orange {
  color: #f1a400;
  background: rgba(241, 164, 0, 0.14);
}

.invitation-details {
  margin: 4px 0 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid var(--divider);
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.detail-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.invite-steps {
  margin: 0 0 14px;
  padding: 0 2px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.invite-step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 1.4;
}
.invite-step svg {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  color: #6355f5;
  flex-shrink: 0;
}
.invite-confirm {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin: 0 0 16px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(99, 85, 245, 0.06);
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.35;
}
.invite-confirm input {
  margin-top: 2px;
}

.invitation-actions {
  margin-top: 10px;
}

.invitation-button {
  min-height: 60px;
  border-radius: 18px;
  padding: 14px 22px;
  justify-content: space-between;
  background: linear-gradient(92deg, #6355f5 0%, #4f46e5 100%);
  font-size: 18px;
  font-weight: 700;
}

.invitation-button:disabled {
  background: linear-gradient(92deg, #8a80f7 0%, #726be9 100%);
}

.invitation-button svg {
  width: 22px;
  height: 22px;
}
.invitation-actions-hint {
  margin: 10px 2px 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.error-banner {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #fee2e2;
  color: #b91c1c;
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
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

@media (max-width: 480px) {
  .invite-hero {
    align-items: center;
    margin-bottom: 16px;
  }

  .invite-hero-art {
    width: 64px;
    height: 64px;
    border-radius: 14px;
  }

  .invite-hero-art svg {
    width: 32px;
    height: 32px;
  }

  .invite-subtitle {
    font-size: 16px;
  }

  .invitation-card,
  .empty-state {
    margin: 0;
    padding: 16px;
  }

  .detail-item:first-child {
    padding-top: 0;
  }
  .detail-item {
    gap: 10px;
    padding: 14px 0;
  }

  .invitation-icon,
  .detail-icon {
    width: 50px;
    height: 50px;
    border-radius: 16px;
  }

  .detail-value {
    font-size: 14px;
  }

  .invitation-button {
    min-height: 54px;
    font-size: 16px;
  }

  .invite-step {
    font-size: 14px;
  }

  .invite-confirm {
    font-size: 14px;
  }
}
</style>
