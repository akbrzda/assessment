<template>
  <PageContainer title="Настройки" subtitle="Доступ только суперадмину">
    <SettingsTabs :tabs="tabs" v-model="activeTab" />
    <div class="tab-content">
      <UserManagementPanel v-if="activeTab === 'users'" />
      <InvitationsPanel v-else-if="activeTab === 'invitations'" />
      <AssessmentsPanel v-else-if="activeTab === 'assessments'" />
    </div>
  </PageContainer>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageContainer from '../components/PageContainer.vue';
import SettingsTabs from '../components/settings/SettingsTabs.vue';
import InvitationsPanel from '../components/invitations/InvitationsPanel.vue';
import UserManagementPanel from '../components/settings/UserManagementPanel.vue';
import AssessmentsPanel from '../components/assessments/AssessmentsPanel.vue';
import { showBackButton, hideBackButton } from '../services/telegram';

const tabs = [
  { value: 'users', label: 'Пользователи' },
  { value: 'invitations', label: 'Приглашения' },
  { value: 'assessments', label: 'Аттестации' }
];

const route = useRoute();
const router = useRouter();

function resolveTab(value) {
  return tabs.some((tab) => tab.value === value) ? value : 'users';
}

const activeTab = ref(resolveTab(route.query.tab));

watch(
  () => route.query.tab,
  (value) => {
    const resolved = resolveTab(value);
    if (resolved !== activeTab.value) {
      activeTab.value = resolved;
    }
  }
);

watch(
  activeTab,
  (value) => {
    if (route.query.tab === value) {
      return;
    }
    router.replace({
      name: 'settings',
      query: { ...route.query, tab: value }
    });
  }
);

let cleanupBack = () => {};

onMounted(() => {
  cleanupBack = showBackButton(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.replace({ name: 'dashboard' });
    }
  });
});

onBeforeUnmount(() => {
  cleanupBack();
  hideBackButton();
});
</script>

<style scoped>
.tab-content {
  margin-top: 16px;
}

.placeholder {
  padding: 16px;
  border-radius: 12px;
  border: 1px dashed rgba(0, 0, 0, 0.2);
  text-align: center;
  color: var(--tg-theme-hint-color, #6f7a8b);
}
</style>
