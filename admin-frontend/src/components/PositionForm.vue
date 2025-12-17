<template>
  <div>
    <Preloader v-if="loading" />
    <form v-else @submit.prevent="handleSubmit" class="form-container">
      <Input
        v-model="form.name"
        label="Название должности"
        placeholder="Например: Продавец"
        required
        :error="errors.name"
        @blur="validateField('name')"
      />

      <div v-if="positionId && positionStats" class="stats-section">
        <h4 class="stats-title">Статистика</h4>
        <div class="stats-grid-3">
          <div class="stat-item">
            <div class="stat-label">Сотрудников</div>
            <div class="stat-value">{{ positionStats.employees_count }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Аттестаций</div>
            <div class="stat-value">{{ positionStats.assessments_completed || 0 }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Средний балл</div>
            <div class="stat-value">{{ formatAvgScore(positionStats.avg_score) }}</div>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <Button type="button" variant="secondary" @click="$emit('cancel')">Отмена</Button>
        <Button type="submit" :disabled="!form.name.trim()" variant="primary">
          {{ positionId ? "Сохранить" : "Создать" }}
        </Button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
import { createPosition, getPositionById, updatePosition } from "../api/positions";
import Preloader from "./ui/Preloader.vue";
import Input from "./ui/Input.vue";
import Button from "./ui/Button.vue";

const props = defineProps({
  positionId: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits(["submit", "cancel"]);

const loading = ref(false);
const form = ref({ name: "" });
const errors = ref({});
const positionStats = ref(null);

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

const resetForm = () => {
  form.value = { name: "" };
  errors.value = {};
  positionStats.value = null;
};

const validateField = (field) => {
  const value = form.value[field];
  let error = null;

  if (field === "name") {
    if (!value || !value.trim()) {
      error = "Название обязательно";
    } else if (value.trim().length < 2) {
      error = "Минимум 2 символа";
    } else if (value.trim().length > 100) {
      error = "Максимум 100 символов";
    }
  }

  if (error) {
    errors.value[field] = error;
  } else {
    delete errors.value[field];
  }
};

const loadPosition = async () => {
  if (!props.positionId) return;

  loading.value = true;
  try {
    const data = await getPositionById(props.positionId);
    form.value.name = data.position.name;
    positionStats.value = {
      employees_count: data.position.employees_count,
      assessments_completed: data.position.assessments_completed,
      avg_score: toNumber(data.position.avg_score),
    };
  } catch (error) {
    console.error("Load position error:", error);
    alert("Ошибка загрузки должности");
  } finally {
    loading.value = false;
  }
};

const handleSubmit = async () => {
  validateField("name");

  if (Object.keys(errors.value).length > 0) {
    alert("Проверьте корректность полей");
    return;
  }

  loading.value = true;
  try {
    const payload = { name: form.value.name.trim() };
    if (props.positionId) {
      await updatePosition(props.positionId, payload);
      alert("Должность обновлена");
    } else {
      await createPosition(payload);
      alert("Должность создана");
    }
    emit("submit");
  } catch (error) {
    console.error("Save position error:", error);
    const errorMessage = error.response?.data?.error || "Ошибка сохранения должности";
    alert(errorMessage);
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.positionId,
  () => {
    resetForm();
    if (props.positionId) {
      loadPosition();
    }
  }
);

onMounted(() => {
  if (props.positionId) {
    loadPosition();
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
  margin: 0 0 16px;
}

.stats-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
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
