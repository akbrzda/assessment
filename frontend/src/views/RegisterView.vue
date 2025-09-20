<template>
  <PageContainer
    title="Регистрация"
    subtitle="Заполните данные, чтобы продолжить"
  >
    <InfoCard v-if="invitation" title="Приглашение">
      <p class="invite-text">
        Вы приглашены как <strong>{{ invitation.roleName }}</strong>
        в филиал <strong>{{ invitation.branchName }}</strong>.
      </p>
      <p class="invite-text">
        Код: <code>{{ invitation.code }}</code>
      </p>
    </InfoCard>

    <form class="form" @submit.prevent="handleSubmit">
      <label class="form__field">
        <span>Имя</span>
        <BaseInput
          v-model="form.firstName"
          autocomplete="given-name"
          :readonly="isInviteLocked"
          placeholder="Имя"
        />
      </label>
      <label class="form__field">
        <span>Фамилия</span>
        <BaseInput
          v-model="form.lastName"
          autocomplete="family-name"
          :readonly="isInviteLocked"
          placeholder="Фамилия"
        />
      </label>
      <label class="form__field">
        <span>Должность</span>
        <BaseSelect v-model.number="form.positionId" :disabled="isInviteLocked">
          <option value="" disabled>Выберите должность</option>
          <option v-for="position in positions" :key="position.id" :value="position.id">
            {{ position.name }}
          </option>
        </BaseSelect>
      </label>
      <label class="form__field">
        <span>Филиал</span>
        <BaseSelect v-model.number="form.branchId" :disabled="isInviteLocked">
          <option value="" disabled>Выберите филиал</option>
          <option v-for="branch in branches" :key="branch.id" :value="branch.id">
            {{ branch.name }}
          </option>
        </BaseSelect>
      </label>
    </form>

    <p v-if="storeError" class="error">{{ storeError }}</p>
  </PageContainer>
</template>

<script setup>
import { reactive, watch, onMounted, onBeforeUnmount, computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import PageContainer from '../components/PageContainer.vue';
import InfoCard from '../components/InfoCard.vue';
import { useAppStore } from '../store/appStore';
import BaseInput from '../components/common/BaseInput.vue';
import BaseSelect from '../components/common/BaseSelect.vue';
import {
  setMainButton,
  hideMainButton,
  showAlert,
  showMainButtonProgress,
  hideMainButtonProgress
} from '../services/telegram';

const router = useRouter();
const appStore = useAppStore();

const form = reactive({
  firstName: appStore.defaults.firstName,
  lastName: appStore.defaults.lastName,
  positionId: '',
  branchId: '',
  inviteCode: appStore.invitation?.code || ''
});

const branches = computed(() => appStore.references.branches || []);
const allPositions = computed(() => appStore.references.positions || []);

function findPositionByName(name) {
  if (!name) {
    return null;
  }
  const normalized = String(name).toLowerCase();
  return allPositions.value.find((item) => item.name.toLowerCase() === normalized) || null;
}

const managerPositionId = computed(() => {
  const manager = findPositionByName('управляющий') || findPositionByName('manager');
  return manager ? manager.id : null;
});

const positions = computed(() => {
  const list = allPositions.value;
  const inviteRole = invitation.value?.roleName?.toLowerCase();
  if (inviteRole === 'управляющий' || inviteRole === 'manager') {
    return list;
  }
  return list.filter((item) => {
    const name = item.name.toLowerCase();
    return name !== 'управляющий' && name !== 'manager';
  });
});
const invitation = computed(() => appStore.invitation);
const storeError = computed(() => appStore.error);
const isInviteLocked = computed(() => Boolean(invitation.value));
const isSubmitting = ref(false);

function validate() {
  if (!form.firstName || form.firstName.length < 2) {
    return 'Укажите корректное имя';
  }
  if (!form.lastName || form.lastName.length < 2) {
    return 'Укажите корректную фамилию';
  }
  if (!form.positionId) {
    return 'Выберите должность';
  }
  if (!form.branchId) {
    return 'Выберите филиал';
  }
  return null;
}

async function handleSubmit() {
  const validationError = validate();
  if (validationError) {
    showAlert(validationError);
    return;
  }

  if (isSubmitting.value) {
    return;
  }

  isSubmitting.value = true;
  syncMainButton();

  try {
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      positionId: Number(form.positionId),
      branchId: Number(form.branchId)
    };
    if (form.inviteCode) {
      payload.inviteCode = form.inviteCode;
    }
    await appStore.submitRegistration(payload);
    router.replace({ name: 'dashboard' });
  } catch (submitError) {
    showAlert(submitError.message || 'Не удалось зарегистрироваться');
  } finally {
    isSubmitting.value = false;
    hideMainButtonProgress();
    syncMainButton();
  }
}

let cleanupMainButton = () => {};

function syncMainButton() {
  const valid = !validate();
  cleanupMainButton();
  cleanupMainButton = setMainButton({
    text: isSubmitting.value ? 'Отправляем...' : 'Зарегистрироваться',
    isVisible: isSubmitting.value ? true : valid,
    onClick: handleSubmit
  });
  if (isSubmitting.value) {
    showMainButtonProgress();
  } else {
    hideMainButtonProgress();
  }
}

onMounted(() => {
  syncMainButton();
});

onBeforeUnmount(() => {
  cleanupMainButton();
  hideMainButton();
});

watch(
  () => [appStore.defaults.firstName, appStore.defaults.lastName],
  ([firstName, lastName]) => {
    if (isSubmitting.value) {
      return;
    }
    if (!form.firstName) {
      form.firstName = firstName;
    }
    if (!form.lastName) {
      form.lastName = lastName;
    }
  }
);

watch(
  [invitation, managerPositionId],
  ([value, managerId]) => {
    if (isSubmitting.value) {
      return;
    }
    if (!value) {
      form.inviteCode = '';
      if (form.positionId && managerId && form.positionId === Number(managerId)) {
        form.positionId = '';
      }
      return;
    }
    if (value.firstName) {
      form.firstName = value.firstName;
    }
    if (value.lastName) {
      form.lastName = value.lastName;
    }
    if (value.branchId) {
      form.branchId = Number(value.branchId);
    }
    if (value.code) {
      form.inviteCode = value.code;
    }
    form.positionId = managerId ? Number(managerId) : '';
    if (value.roleName) {
      const matched = findPositionByName(value.roleName);
      if (matched) {
        form.positionId = Number(matched.id);
      }
    }
  },
  { immediate: true }
);

watch(
  () => [form.firstName, form.lastName, form.positionId, form.branchId, form.inviteCode],
  () => {
    if (isSubmitting.value) {
      return;
    }
    syncMainButton();
  }
);
</script>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--tg-theme-hint-color, #6f7a8b);
}

.error {
  color: #d62d30;
  font-size: 13px;
}

.invite-text {
  margin: 0;
  font-size: 14px;
}

code {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 6px;
}
</style>
