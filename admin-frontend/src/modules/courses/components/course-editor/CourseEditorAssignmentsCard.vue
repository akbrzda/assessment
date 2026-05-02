<template>
  <Card class="assignments-card">
    <div class="assignments-header">
      <h2>Назначение курса</h2>
      <p>Если ни одна должность и ни один филиал не выбраны — курс виден всем.</p>
    </div>

    <div class="targets-grid">
      <div class="targets-group">
        <h3>Целевые должности</h3>
        <div v-if="positionOptions.length === 0" class="targets-empty">Загрузка...</div>
        <div v-else class="checkbox-list">
          <label v-for="pos in positionOptions" :key="pos.id" class="checkbox-item">
            <input v-model="selectedPositionIdsModel" type="checkbox" :value="pos.id" />
            <span>{{ pos.name }}</span>
          </label>
        </div>
      </div>

      <div class="targets-group">
        <h3>Целевые филиалы</h3>
        <div v-if="branchOptions.length === 0" class="targets-empty">Загрузка...</div>
        <div v-else class="checkbox-list">
          <label v-for="branch in branchOptions" :key="branch.id" class="checkbox-item">
            <input v-model="selectedBranchIdsModel" type="checkbox" :value="branch.id" />
            <span>{{ branch.name }}</span>
          </label>
        </div>
      </div>
    </div>

    <div class="manual-assignments">
      <h3>Ручные назначения</h3>

      <div class="add-assignment">
        <Input v-model="newAssignmentUserIdModel" label="ID пользователя" type="number" min="1" placeholder="Введите ID" />
        <DatePicker v-model="newAssignmentDeadlineAtModel" label="Индивидуальный дедлайн" />
        <Button :loading="addingAssignment" icon="plus" @click="emit('add-assignment')">Добавить</Button>
      </div>

      <div v-if="assignments.length === 0" class="targets-empty">Ручных назначений нет.</div>
      <table v-else class="assignments-table">
        <thead>
          <tr>
            <th>Пользователь</th>
            <th>Должность</th>
            <th>Филиал</th>
            <th>Кем назначен</th>
            <th>Когда</th>
            <th>Дедлайн</th>
            <th>Статус</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in assignments" :key="a.userId">
            <td>{{ a.name }}</td>
            <td>{{ a.positionTitle || "—" }}</td>
            <td>{{ a.branchTitle || "—" }}</td>
            <td>{{ a.assignedBy || "—" }}</td>
            <td>{{ formatAssignedAt(a.assignedAt) }}</td>
            <td>{{ formatAssignedAt(a.deadlineAt) }}</td>
            <td>{{ a.status === "closed" ? "Закрыт" : "Активен" }}</td>
            <td>
              <Button
                v-if="a.status !== 'closed'"
                size="sm"
                variant="secondary"
                icon="archive"
                :loading="closingAssignmentUserId === a.userId"
                @click="emit('close-assignment', a.userId)"
              />
              <Button size="sm" variant="danger" icon="trash" :loading="removingAssignmentUserId === a.userId" @click="emit('remove-assignment', a.userId)" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>

<script setup>
import { computed } from "vue";

import { Button, Card, DatePicker, Input } from "@/components/ui";

const props = defineProps({
  positionOptions: { type: Array, required: true },
  branchOptions: { type: Array, required: true },
  selectedPositionIds: { type: Array, required: true },
  selectedBranchIds: { type: Array, required: true },
  assignments: { type: Array, required: true },
  newAssignmentUserId: { type: [String, Number], default: "" },
  newAssignmentDeadlineAt: { type: String, default: "" },
  addingAssignment: { type: Boolean, required: true },
  closingAssignmentUserId: { type: [Number, String, null], default: null },
  removingAssignmentUserId: { type: [Number, String, null], default: null },
  formatAssignedAt: { type: Function, required: true },
});

const emit = defineEmits([
  "update:selected-position-ids",
  "update:selected-branch-ids",
  "update:new-assignment-user-id",
  "update:new-assignment-deadline-at",
  "add-assignment",
  "close-assignment",
  "remove-assignment",
]);

const selectedPositionIdsModel = computed({
  get: () => props.selectedPositionIds,
  set: (value) => emit("update:selected-position-ids", value),
});

const selectedBranchIdsModel = computed({
  get: () => props.selectedBranchIds,
  set: (value) => emit("update:selected-branch-ids", value),
});

const newAssignmentUserIdModel = computed({
  get: () => props.newAssignmentUserId,
  set: (value) => emit("update:new-assignment-user-id", value),
});

const newAssignmentDeadlineAtModel = computed({
  get: () => props.newAssignmentDeadlineAt,
  set: (value) => emit("update:new-assignment-deadline-at", value),
});
</script>

<style scoped>
.assignments-card {
  margin-top: 16px;
  box-shadow: var(--course-shadow);
}

.assignments-card :deep(.card-content) {
  background: var(--course-surface);
  border: 1px solid var(--course-border);
  border-radius: var(--course-radius-lg);
  padding: 24px;
}

.assignments-header {
  margin-bottom: 14px;
}

.assignments-header h2 {
  margin: 0 0 4px;
}

.assignments-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.targets-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 16px;
}

.targets-group {
  border-radius: 12px;
  padding: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
  border: 1px solid var(--divider);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.targets-group h3 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.targets-empty {
  color: var(--text-secondary);
  font-size: 14px;
  padding: 8px 0;
}

.checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid var(--divider);
  border-radius: 10px;
  background: var(--bg-primary);
  padding: 10px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  cursor: pointer;
  min-height: 28px;
}

.checkbox-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  cursor: pointer;
}

.manual-assignments {
  border-top: 1px solid var(--divider);
  padding-top: 16px;
  margin-top: 8px;
}

.manual-assignments h3 {
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 700;
}

.add-assignment {
  display: grid;
  grid-template-columns: minmax(180px, 220px) minmax(180px, 240px) auto;
  align-items: end;
  gap: 12px;
  margin-bottom: 14px;
}

.add-assignment .input-wrapper {
  width: 200px;
}

.assignments-table {
  width: 100%;
  border: 1px solid var(--divider);
  border-radius: 10px;
  overflow: hidden;
  border-collapse: collapse;
  font-size: 14px;
}

.assignments-table th,
.assignments-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid var(--divider);
}

.assignments-table th {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: var(--bg-secondary);
}

.assignments-table tbody tr:hover td {
  background: #fafcff;
}

@media (max-width: 1024px) {
  .targets-grid {
    grid-template-columns: 1fr;
  }
  .add-assignment {
    grid-template-columns: 1fr;
  }
}
</style>
