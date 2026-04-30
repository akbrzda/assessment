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
        <div class="invitation-intro">
          <div class="invitation-icon invitation-icon--violet">
            <Hand />
          </div>
          <div>
            <h2 class="title-medium invitation-intro-title">Вы приглашены!</h2>
            <p class="body-medium text-secondary">Проверьте данные и подтвердите участие</p>
          </div>
        </div>

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

        <div class="invite-note">
          <div class="detail-icon detail-icon--violet">
            <ShieldCheck />
          </div>
          <div>
            <p class="title-small invite-note-title">Проверьте данные</p>
            <p class="body-medium text-secondary">Если всё верно — нажмите кнопку для подтверждения.</p>
          </div>
        </div>

        <div class="invitation-actions">
          <button class="btn btn-primary btn-full invitation-button" @click="acceptInvitation" :disabled="isLoading">
            <span>{{ isLoading ? "Принимаем..." : "Подтвердить и войти" }}</span>
            <ArrowRight />
          </button>
        </div>
      </div>

      <div v-else-if="!isLoading" class="card empty-state">
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
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Hand,
  MailCheck,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-vue-next";
import { useUserStore } from "../stores/user";
import { useTelegramStore } from "../stores/telegram";

export default {
  name: "InvitationView",
  components: {
    ArrowRight,
    BriefcaseBusiness,
    Building2,
    Hand,
    MailCheck,
    ShieldCheck,
    User,
    XCircle,
  },
  setup() {
    const router = useRouter();
    const userStore = useUserStore();
    const telegramStore = useTelegramStore();

    const alreadyRegisteredError = ref(false);
    const invitation = computed(() => userStore.invitation);
    const isLoading = computed(() => userStore.isLoading);
    const fullName = computed(() => {
      if (!invitation.value) {
        return "";
      }

      const parts = [invitation.value.lastName, invitation.value.firstName, invitation.value.middleName].filter(Boolean);
      return parts.join(" ");
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
      fullName,
      alreadyRegisteredError,
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
  width: 124px;
  height: 124px;
  border-radius: 28px;
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
  width: 62px;
  height: 62px;
}

.invitation-card {
  padding: 20px;
  border-radius: 20px;
}

.invitation-intro {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--divider);
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
  font-size: 17px;
  font-weight: 500;
  color: var(--text-secondary);
}

.detail-value {
  font-size: 21px;
  font-weight: 600;
  color: var(--text-primary);
}

.invite-note {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(99, 85, 245, 0.06);
}

.invite-note-title {
  margin-bottom: 4px;
  font-size: 18px;
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
    width: 94px;
    height: 94px;
    border-radius: 20px;
  }

  .invite-hero-art svg {
    width: 46px;
    height: 46px;
  }

  .invite-subtitle {
    font-size: 16px;
  }

  .invitation-card,
  .empty-state {
    margin: 0;
    padding: 16px;
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
    font-size: 19px;
  }

  .invitation-button {
    min-height: 54px;
    font-size: 16px;
  }
}
</style>
