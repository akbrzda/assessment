<template>
  <PageContainer title="Приглашение" subtitle="Подтвердите участие">
    <InfoCard v-if="invitation" title="Новый управляющий">
      <p class="invite__line">
        Имя: <strong>{{ invitation.firstName }} {{ invitation.lastName }}</strong>
      </p>
      <p class="invite__line">
        Филиал: <strong>{{ invitation.branchName }}</strong>
      </p>
      <p class="invite__line">
        Роль: <strong>{{ invitation.roleName }}</strong>
      </p>
      <p class="invite__line">
        Действительно до: <strong>{{ formattedDate }}</strong>
      </p>
    </InfoCard>
    <p v-else class="invite__missing">
      Приглашение не найдено или истекло. Попросите суперадмина отправить новую ссылку.
    </p>
  </PageContainer>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import PageContainer from '../components/PageContainer.vue';
import InfoCard from '../components/InfoCard.vue';
import { useAppStore } from '../store/appStore';
import { setMainButton, hideMainButton, showAlert } from '../services/telegram';

const router = useRouter();
const appStore = useAppStore();

const invitation = computed(() => appStore.invitation);

const formattedDate = computed(() => {
  if (!invitation.value?.expiresAt) {
    return '—';
  }
  return new Date(invitation.value.expiresAt).toLocaleString('ru-RU');
});

async function proceed() {
  if (!invitation.value) {
    showAlert('Приглашение недоступно.');
    return;
  }
  await appStore.acceptInvitation();
  router.replace({ name: 'register' });
}

let cleanupButton = () => {};

onMounted(() => {
  if (!invitation.value) {
    router.replace({ name: 'register' });
    return;
  }

  cleanupButton = setMainButton({
    text: 'Принять приглашение',
    onClick: proceed
  });
});

onBeforeUnmount(() => {
  cleanupButton();
  hideMainButton();
});
</script>

<style scoped>
.invite__line {
  margin: 0;
  font-size: 14px;
}

.invite__missing {
  font-size: 14px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}
</style>
