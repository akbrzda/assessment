<template>
  <Modal :show="show" title="Пригласить сотрудника" @close="emit('close')">
    <div v-if="inviteLink" class="invite-success">
      <div class="invite-success-head">
        <div class="invite-success-icon">✓</div>
        <h3 class="invite-success-title">Приглашение создано!</h3>
        <p class="invite-success-text">Сотрудник получит ссылку для доступа к системе.</p>
      </div>
      <div class="invite-link-block">
        <p class="invite-link-label">Ссылка для приглашения</p>
        <div class="invite-link-row">
          <Input v-model="inviteLinkModel" readonly />
          <Button size="sm" icon="Copy" variant="secondary" @click="emit('copy-link')">Скопировать</Button>
        </div>
      </div>
      <p class="invite-hint">Ссылка активна 7 дней. Пока сотрудник не активировал профиль, он не появится в активных пользователях.</p>
      <div class="invite-success-actions">
        <Button variant="secondary" @click="emit('close')">Закрыть</Button>
        <Button @click="emit('open-profile')">Перейти к пользователю</Button>
      </div>
    </div>
    <div v-else>
      <div class="form-container">
        <div v-if="inviteForm.existingUserId" class="invite-existing-note">
          Создается приглашение для существующего пользователя админ-панели.
        </div>
        <div class="form-row">
          <Input v-model="inviteForm.lastName" label="Фамилия" placeholder="Иванов" required :error="inviteErrors.lastName" />
          <Input v-model="inviteForm.firstName" label="Имя" placeholder="Иван" required :error="inviteErrors.firstName" />
        </div>
        <Input v-model="inviteForm.phone" label="Номер телефона" placeholder="+7 (999) 000-00-00" :error="inviteErrors.phone" />
        <Select
          v-model.number="inviteForm.positionId"
          label="Должность"
          :options="positionOptions"
          placeholder="Выберите должность"
          required
          :error="inviteErrors.positionId"
        />
        <Select
          v-model.number="inviteForm.branchId"
          label="Филиал (Город)"
          :options="branchOptions"
          placeholder="Выберите филиал"
          required
          :error="inviteErrors.branchId"
        />
      </div>
      <div class="modal-actions">
        <Button variant="secondary" @click="emit('close')">Отмена</Button>
        <Button :loading="actionLoading" @click="emit('create')">Создать приглашение</Button>
      </div>
    </div>
  </Modal>
</template>

<script setup>
import { computed } from "vue";

import { Button, Input, Modal, Select } from "@/components/ui";

const props = defineProps({
  show: { type: Boolean, required: true },
  inviteLink: { type: String, default: "" },
  inviteForm: { type: Object, required: true },
  inviteErrors: { type: Object, required: true },
  branchOptions: { type: Array, required: true },
  positionOptions: { type: Array, required: true },
  actionLoading: { type: Boolean, required: true },
});

const emit = defineEmits(["close", "copy-link", "open-profile", "create"]);

const inviteLinkModel = computed({
  get: () => props.inviteLink,
  set: () => {},
});
</script>

<style scoped>
.form-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.invite-success {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.invite-success-head {
  text-align: center;
}

.invite-success-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 12px;
  border-radius: 999px;
  background: #22c55e;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 700;
}

.invite-success-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.1;
  color: var(--text-primary);
}

.invite-link-block {
  border: 1px solid var(--divider);
  border-radius: 12px;
  padding: 14px;
}

.invite-link-label {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.invite-success-text {
  font-size: 15px;
  color: var(--text-primary);
  margin: 8px 0 0;
}

.invite-link-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.invite-hint {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 10px;
  padding: 10px 12px;
}

.invite-success-actions {
  margin-top: 4px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.invite-existing-note {
  border: 1px solid #c7d2fe;
  border-radius: 10px;
  background: #eef2ff;
  color: #3730a3;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.4;
}
</style>
