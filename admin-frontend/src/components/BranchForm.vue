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
import { ref, onMounted } from "vue";
import { getBranchById, createBranch, updateBranch } from "../api/branches";
import Preloader from "./ui/Preloader.vue";
import Input from "./ui/Input.vue";
import Button from "./ui/Button.vue";

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
});
const branchStats = ref(null);
const errors = ref({});

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

const loadBranch = async () => {
  if (!props.branchId) return;

  loading.value = true;
  try {
    const data = await getBranchById(props.branchId);
    form.value.name = data.branch.name;
    form.value.city = data.branch.city || "";
    branchStats.value = {
      employees_count: data.branch.employees_count,
      assessments_completed: data.branch.assessments_completed,
      avg_score: toNumber(data.branch.avg_score),
    };
  } catch (error) {
    console.error("Load branch error:", error);
    alert("Ошибка загрузки филиала");
  } finally {
    loading.value = false;
  }
};

const handleSubmit = async () => {
  // Валидация всех полей перед отправкой
  validateField("name");
  validateField("city");

  if (Object.keys(errors.value).length > 0) {
    alert("Пожалуйста, исправьте ошибки в форме");
    return;
  }

  loading.value = true;
  try {
    if (props.branchId) {
      await updateBranch(props.branchId, form.value);
      alert("Филиал обновлен");
    } else {
      await createBranch(form.value);
      alert("Филиал создан");
    }
    emit("submit");
  } catch (error) {
    console.error("Save branch error:", error);
    const errorMessage = error.response?.data?.error || "Ошибка сохранения филиала";
    alert(errorMessage);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (props.branchId) {
    loadBranch();
  }
});
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
}
</style>
