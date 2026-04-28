<template>
  <div>
    <Preloader v-if="loading" />
    <form v-else @submit.prevent="handleSubmit" class="form-container">
      <!-- Название филиала -->
      <Input
        v-model="form.name"
        label="Название филиала"
        placeholder="Например: Центральный офис"
        required
        :error="errors.name"
        @blur="validateField('name')"
      />

      <!-- Город -->
      <Input v-model="form.city" label="Город" placeholder="Например: Москва" :error="errors.city" @blur="validateField('city')" />

      <!-- Видимость -->
      <label class="checkbox-field">
        <input v-model="form.isVisibleInMiniapp" type="checkbox" />
        <div>
          <span class="checkbox-title">Показывать филиал в миниапп</span>
          <p class="checkbox-description">Если выключить, филиал останется доступен только администраторам и руководителям</p>
        </div>
      </label>

      <!-- Статистика (только при редактировании) -->
      <div v-if="branchId && branchStats" class="stats-section">
        <h4 class="stats-title">Статистика филиала</h4>
        <div class="stats-grid-3">
          <div class="stat-item">
            <div class="stat-label">Сотрудников</div>
            <div class="stat-value">
              {{ branchStats.employees_count }}
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Аттестаций</div>
            <div class="stat-value">
              {{ branchStats.assessments_completed || 0 }}
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Средний балл</div>
            <div class="stat-value">
              {{ formatAvgScore(branchStats.avg_score) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Управляющие -->
      <div class="managers-section">
        <div class="managers-header">
          <div>
            <h4 class="section-title">Управляющие</h4>
            <p class="section-description">Назначьте сотрудников с ролью управляющего или суперадмина</p>
          </div>
          <span class="manager-count">{{ branchManagers.length }}</span>
        </div>

        <div v-if="branchManagers.length" class="managers-list">
          <div v-for="manager in branchManagers" :key="manager.id" class="manager-item">
            <div class="manager-info">
              <p class="manager-name">
                {{ manager.first_name }} {{ manager.last_name }}
                <span class="manager-role">{{ formatManagerRole(manager) }}</span>
              </p>
              <p v-if="branchId && manager.assigned_at" class="manager-meta">Назначен {{ formatManagerDate(manager.assigned_at) }}</p>
              <p v-else-if="!branchId" class="manager-meta pending">Будет назначен после создания</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon="x"
              :disabled="managerActionLoading"
              title="Убрать управляющего"
              @click="handleRemoveManager(manager.id)"
            />
          </div>
        </div>
        <p v-else class="managers-empty">Управляющие не назначены</p>

        <div class="manager-actions">
          <Select
            v-model.number="selectedManagerId"
            label="Назначить управляющего"
            :options="managerOptions"
            placeholder="Выберите управляющего"
            :disabled="managersLoading || managerActionLoading || availableManagers.length === 0"
          />
          <Button
            type="button"
            variant="secondary"
            :disabled="!selectedManagerId || managerActionLoading || managersLoading"
            @click="handleAssignManager"
          >
            Назначить
          </Button>
        </div>

        <p v-if="!branchId" class="pending-hint">Назначения сохранятся автоматически после создания филиала</p>
      </div>

      <!-- Кнопки -->
      <div class="form-actions">
        <Button type="button" @click="$emit('cancel')" variant="secondary">Отмена</Button>
        <Button type="submit" :disabled="!form.name.trim()" variant="primary">
          {{ branchId ? "Сохранить" : "Создать" }}
        </Button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { getBranchById, createBranch, updateBranch, getManagers, assignManager, removeManager } from "../api/branches";
import Preloader from "./ui/Preloader.vue";
import Input from "./ui/Input.vue";
import Button from "./ui/Button.vue";
import Select from "./ui/Select.vue";
import { useToast } from "../composables/useToast";

const props = defineProps({
  branchId: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits(["submit", "cancel"]);

const loading = ref(false);
const form = ref({
  name: "",
  city: "",
  isVisibleInMiniapp: true,
});
const branchStats = ref(null);
const errors = ref({});
const branchManagers = ref([]);
const availableManagers = ref([]);
const selectedManagerId = ref(null);
const pendingManagerIds = ref([]);
const managersLoading = ref(false);
const managerActionLoading = ref(false);
const { showToast } = useToast();

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const formatAvgScore = (value) => {
  const numeric = toNumber(value);
  return numeric === null ? "Нет данных" : `${numeric.toFixed(1)}%`;
};

const resetFormState = () => {
  form.value = {
    name: "",
    city: "",
    isVisibleInMiniapp: true,
  };
  branchStats.value = null;
  errors.value = {};
  branchManagers.value = [];
  availableManagers.value = [];
  selectedManagerId.value = null;
  pendingManagerIds.value = [];
};

const validateField = (fieldName) => {
  const value = form.value[fieldName];
  let error = null;

  if (fieldName === "name") {
    if (!value || !value.trim()) {
      error = "Название филиала обязательно";
    } else if (value.trim().length < 2) {
      error = "Название должно содержать не менее 2 символов";
    } else if (value.trim().length > 100) {
      error = "Название не должно превышать 100 символов";
    }
  }

  if (fieldName === "city") {
    if (value && value.trim().length > 100) {
      error = "Город не должен превышать 100 символов";
    }
  }

  if (error) {
    errors.value[fieldName] = error;
  } else {
    delete errors.value[fieldName];
  }
};

const formatManagerRole = (manager) => {
  const role = manager?.role || manager?.role_name;
  return role === "superadmin" ? "Суперадмин" : "Управляющий";
};

const formatManagerDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const managerOptions = computed(() => {
  const assignedIds = new Set(branchManagers.value.map((manager) => manager.id));
  return availableManagers.value.map((manager) => ({
    value: manager.id,
    label: `${manager.first_name} ${manager.last_name}${
      manager.role === "superadmin" ? " (Суперадмин)" : ""
    }${manager.branches_count ? ` — ${manager.branches_count} филиалов` : ""}`,
    disabled: assignedIds.has(manager.id),
  }));
});

const loadAvailableManagers = async () => {
  managersLoading.value = true;
  try {
    const data = await getManagers();
    availableManagers.value = data.managers || [];
  } catch (error) {
    console.error("Load managers error:", error);
    showToast("Ошибка загрузки управляющих", "error");
  } finally {
    managersLoading.value = false;
  }
};

const loadBranch = async (withLoader = true) => {
  if (!props.branchId) return;

  if (withLoader) {
    loading.value = true;
  }
  try {
    const data = await getBranchById(props.branchId);
    form.value.name = data.branch.name;
    form.value.city = data.branch.city || "";
    form.value.isVisibleInMiniapp = data.branch.is_visible_in_miniapp === 1;
    branchStats.value = {
      employees_count: data.branch.employees_count,
      assessments_completed: data.branch.assessments_completed,
      avg_score: toNumber(data.branch.avg_score),
    };
    branchManagers.value = data.branch.managers || [];
    availableManagers.value = data.availableManagers || [];
    pendingManagerIds.value = [];
  } catch (error) {
    console.error("Load branch error:", error);
    showToast("Ошибка загрузки филиала", "error");
  } finally {
    if (withLoader) {
      loading.value = false;
    }
  }
};

const assignPendingManagers = async (branchId) => {
  if (!branchId || pendingManagerIds.value.length === 0) {
    return;
  }
  const failed = [];
  for (const managerId of pendingManagerIds.value) {
    try {
      await assignManager(branchId, managerId);
    } catch (error) {
      console.error("Assign pending manager error:", error);
      failed.push(managerId);
    }
  }
  if (failed.length > 0) {
    const names = failed
      .map((id) => {
        const manager = availableManagers.value.find((item) => item.id === id);
        return manager ? `${manager.first_name} ${manager.last_name}` : id;
      })
      .join(", ");
    showToast(`Не удалось назначить управляющих: ${names}`, "warning");
  }
  pendingManagerIds.value = [];
};

const handleAssignManager = async () => {
  if (!selectedManagerId.value) {
    return;
  }
  const manager = availableManagers.value.find((item) => item.id === selectedManagerId.value);
  if (!manager) {
    return;
  }

  if (!props.branchId) {
    if (!pendingManagerIds.value.includes(manager.id)) {
      pendingManagerIds.value = [...pendingManagerIds.value, manager.id];
      branchManagers.value = [...branchManagers.value, manager];
    }
    selectedManagerId.value = null;
    return;
  }

  managerActionLoading.value = true;
  try {
    await assignManager(props.branchId, manager.id);
    await loadBranch(false);
    showToast("Управляющий назначен", "success");
  } catch (error) {
    console.error("Assign manager error:", error);
    const errorMessage = error.response?.data?.error || "Ошибка назначения управляющего";
    showToast(errorMessage, "error");
  } finally {
    managerActionLoading.value = false;
    selectedManagerId.value = null;
  }
};

const handleRemoveManager = async (managerId) => {
  if (!managerId) return;

  if (!props.branchId) {
    pendingManagerIds.value = pendingManagerIds.value.filter((id) => id !== managerId);
    branchManagers.value = branchManagers.value.filter((manager) => manager.id !== managerId);
    return;
  }

  if (!confirm("Убрать управляющего из филиала?")) {
    return;
  }

  managerActionLoading.value = true;
  try {
    await removeManager(props.branchId, managerId);
    await loadBranch(false);
    showToast("Управляющий удален", "success");
  } catch (error) {
    console.error("Remove manager error:", error);
    const errorMessage = error.response?.data?.error || "Ошибка удаления управляющего";
    showToast(errorMessage, "error");
  } finally {
    managerActionLoading.value = false;
  }
};

const handleSubmit = async () => {
  // Валидация всех полей перед отправкой
  validateField("name");
  validateField("city");

  if (Object.keys(errors.value).length > 0) {
    showToast("Пожалуйста, исправьте ошибки в форме", "warning");
    return;
  }

  loading.value = true;
  try {
    const payload = {
      name: form.value.name.trim(),
      city: form.value.city?.trim() || "",
      isVisibleInMiniapp: Boolean(form.value.isVisibleInMiniapp),
    };
    if (props.branchId) {
      await updateBranch(props.branchId, payload);
      showToast("Филиал обновлен", "success");
    } else {
      const result = await createBranch(payload);
      await assignPendingManagers(result?.branchId);
      showToast("Филиал создан", "success");
    }
    emit("submit");
  } catch (error) {
    console.error("Save branch error:", error);
    const errorMessage = error.response?.data?.error || "Ошибка сохранения филиала";
    showToast(errorMessage, "error");
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.branchId,
  (newValue) => {
    resetFormState();
    if (newValue) {
      loadBranch();
    } else {
      loadAvailableManagers();
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.form-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-section {
  padding: 16px;
  background-color: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--divider);
}

.stats-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.stats-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  font-size: 14px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 12px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.checkbox-field {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 0;
}

.checkbox-field input {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  accent-color: var(--accent-blue);
}

.checkbox-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.checkbox-description {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.managers-section {
  padding: 16px;
  border: 1px solid var(--divider);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.managers-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-description {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.manager-count {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}

.managers-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.manager-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--divider);
}

.manager-item:last-child {
  border-bottom: none;
}

.manager-info {
  flex: 1;
}

.manager-name {
  margin: 0;
  font-weight: 600;
  color: var(--text-primary);
}

.manager-role {
  margin-left: 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.manager-meta {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.manager-meta.pending {
  color: var(--accent-blue);
}

.managers-empty {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  font-style: italic;
}

.manager-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pending-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--divider);
}

@media (max-width: 768px) {
  .stats-grid-3 {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .manager-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .manager-actions {
    flex-direction: column;
  }
}
</style>
