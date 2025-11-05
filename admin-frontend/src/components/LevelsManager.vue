<template>
  <div class="levels-manager">
    <Card title="Управление уровнями" icon="Layers">
      <template #header>
        <div class="card-header-content">
          <Icon name="Layers" class="card-header-icon" />
          <h3 class="card-title">Управление уровнями</h3>
          <Button @click="showCreateModal = true" variant="primary" icon="plus" size="md" class="add-button">Добавить уровень</Button>
        </div>
      </template>
      <!-- Статистика 
      <div v-if="stats.length > 0" class="stats-grid">
        <div v-for="stat in stats" :key="stat.level_number" class="stat-card">
          <div class="stat-level">Уровень {{ stat.level_number }}</div>
          <div class="stat-name">{{ stat.name }}</div>
          <div class="stat-users">{{ stat.users_count }} пользователей</div>
          <div class="stat-points">От {{ stat.min_points }} очков</div>
        </div>
      </div>-->

      <!-- Список уровней -->
      <div class="levels-list">
        <div v-if="levels.length === 0" class="empty-state">Уровни не настроены</div>
        <div v-for="level in levels" :key="level.level_number" class="level-card">
          <div class="level-info">
            <div class="level-number" :style="{ backgroundColor: level.color }">{{ level.level_number }}</div>
            <div class="level-details">
              <div class="level-name">{{ level.name }}</div>
              <div class="level-description">{{ level.description || "Нет описания" }}</div>
              <div class="level-points">
                Минимум очков: <strong>{{ level.min_points }}</strong>
              </div>
              <div class="level-meta">
                <span v-if="level.is_active" class="badge badge-success">Активен</span>
                <span v-else class="badge badge-inactive">Неактивен</span>
              </div>
            </div>
          </div>
          <div class="level-actions">
            <Button @click="editLevel(level)" variant="ghost" size="sm" title="Редактировать">
              <Icon name="pencil" class="icon" />
            </Button>
            <Button @click="confirmDelete(level)" variant="danger" size="sm" title="Удалить">
              <Icon name="trash" class="icon" />
            </Button>
          </div>
        </div>

        <!-- Действия -->
        <div class="actions-panel">
          <Button @click="recalculateLevels" variant="secondary" :disabled="recalculating" icon="refresh-ccw">
            <span v-if="recalculating">Пересчитываем...</span>
            <span v-else>Пересчитать уровни всех пользователей</span>
          </Button>
        </div>
      </div>

      <!-- Модальное окно создания/редактирования -->
      <Modal :show="showModal" :title="editingLevel ? 'Редактировать уровень' : 'Новый уровень'" @close="closeModal">
        <Input v-model.number="formData.level_number" type="number" label="Номер уровня" placeholder="1" :disabled="!!editingLevel" required />
        <Input
          v-model="formData.code"
          type="text"
          label="Код"
          placeholder="novice"
          :disabled="!!editingLevel"
          hint="Используется в системе для идентификации"
          required
        />
        <Input v-model="formData.name" type="text" label="Название" placeholder="Новичок" required />
        <Textarea v-model="formData.description" label="Описание" placeholder="Описание уровня" :rows="3" />
        <Input
          v-model.number="formData.min_points"
          type="number"
          label="Минимум очков"
          placeholder="0"
          hint="Количество очков для достижения этого уровня"
          required
        />
        <div class="form-group">
          <label>Цвет</label>
          <div class="color-picker-wrapper">
            <input v-model="formData.color" type="color" class="form-color-input" />
            <Input v-model="formData.color" type="text" placeholder="#6366F1" />
          </div>
        </div>
        <Checkbox v-model="formData.is_active" label="Активен" />
        <template #footer>
          <Button variant="secondary" @click="closeModal">Отмена</Button>
          <Button :loading="saving" @click="saveLevel">{{ editingLevel ? "Сохранить" : "Создать" }}</Button>
        </template>
      </Modal>
    </Card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import levelsApi from "../api/levels";
import Card from "./ui/Card.vue";
import Modal from "./ui/Modal.vue";
import Button from "./ui/Button.vue";
import Input from "./ui/Input.vue";
import Checkbox from "./ui/Checkbox.vue";
import Textarea from "./ui/Textarea.vue";
import Icon from "./ui/Icon.vue";

const levels = ref([]);
const stats = ref([]);
const loading = ref(false);
const saving = ref(false);
const recalculating = ref(false);
const showModal = ref(false);
const showCreateModal = computed({
  get: () => showModal.value && !editingLevel.value,
  set: (val) => {
    if (val) {
      editingLevel.value = null;
      showModal.value = true;
    }
  },
});
const editingLevel = ref(null);

const formData = ref({
  level_number: null,
  code: "",
  name: "",
  description: "",
  min_points: 0,
  color: "#6366F1",
  is_active: true,
  sort_order: 0,
});

// Загрузка данных
const loadLevels = async () => {
  loading.value = true;
  try {
    const data = await levelsApi.getLevels();
    levels.value = data.levels || [];
  } catch (error) {
    console.error("Ошибка загрузки уровней:", error);
    alert("Не удалось загрузить уровни");
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try {
    const data = await levelsApi.getLevelsStats();
    stats.value = data.stats || [];
  } catch (error) {
    console.error("Ошибка загрузки статистики:", error);
  }
};

// Редактирование уровня
const editLevel = (level) => {
  editingLevel.value = level;
  formData.value = {
    level_number: level.level_number,
    code: level.code,
    name: level.name,
    description: level.description || "",
    min_points: level.min_points,
    color: level.color || "#6366F1",
    is_active: level.is_active,
    sort_order: level.sort_order,
  };
  showModal.value = true;
};

// Сохранение уровня
const saveLevel = async () => {
  if (!formData.value.name || !formData.value.code || formData.value.min_points === null) {
    alert("Заполните все обязательные поля");
    return;
  }

  saving.value = true;
  try {
    if (editingLevel.value) {
      await levelsApi.updateLevel(editingLevel.value.level_number, formData.value);
    } else {
      await levelsApi.createLevel(formData.value);
    }
    await loadLevels();
    await loadStats();
    closeModal();
  } catch (error) {
    console.error("Ошибка сохранения уровня:", error);
    if (error.response?.data?.error) {
      alert(error.response.data.error);
    } else {
      alert("Не удалось сохранить уровень");
    }
  } finally {
    saving.value = false;
  }
};

// Подтверждение удаления
const confirmDelete = (level) => {
  if (confirm(`Удалить уровень "${level.name}" (${level.level_number})?`)) {
    deleteLevel(level.level_number);
  }
};

// Удаление уровня
const deleteLevel = async (levelNumber) => {
  try {
    await levelsApi.deleteLevel(levelNumber);
    await loadLevels();
    await loadStats();
  } catch (error) {
    console.error("Ошибка удаления уровня:", error);
    if (error.response?.data?.error) {
      alert(error.response.data.error);
    } else {
      alert("Не удалось удалить уровень");
    }
  }
};

// Пересчёт уровней
const recalculateLevels = async () => {
  if (!confirm("Пересчитать уровни для всех пользователей на основе их текущих очков?")) {
    return;
  }

  recalculating.value = true;
  try {
    const result = await levelsApi.recalculateLevels();
    alert(result.message || "Уровни успешно пересчитаны");
    await loadStats();
  } catch (error) {
    console.error("Ошибка пересчёта уровней:", error);
    alert("Не удалось пересчитать уровни");
  } finally {
    recalculating.value = false;
  }
};

// Закрытие модального окна
const closeModal = () => {
  showModal.value = false;
  editingLevel.value = null;
  formData.value = {
    level_number: null,
    code: "",
    name: "",
    description: "",
    min_points: 0,
    color: "#6366F1",
    is_active: true,
    sort_order: 0,
  };
};

onMounted(() => {
  loadLevels();
  loadStats();
});
</script>

<style scoped>
.levels-manager {
  width: 100%;
}

.card-header-content {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
  width: 100%;
}

.card-header-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--text-primary);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.5;
  flex: 1;
}

.add-button {
  margin-left: auto;
}

/* Статистика */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--surface-card);
  border-radius: 12px;
  padding: 16px;
}

.stat-level {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.stat-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.stat-users {
  font-size: 14px;
  color: var(--text-primary);
}

.stat-points {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* Список уровней */
.levels-list {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

.level-card {
  background: var(--surface-card);
  border: 1px solid var(--divider);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}

.level-card:hover {
  border-color: var(--ring);
  transform: translateY(-2px);
}

.level-info {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  flex: 1;
}

.level-number {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.level-details {
  flex: 1;
}

.level-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.level-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.level-points {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.level-meta {
  display: flex;
  gap: 8px;
}

.badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.badge-success {
  background: var(--accent-green-soft);
  color: var(--accent-green);
}

.badge-inactive {
  background: #6b72801a;
  color: #6b7280;
}

.level-actions {
  display: flex;
  gap: 12px;
}

.level-actions .icon {
  width: 16px;
  height: 16px;
}

/* Панель действий */
.actions-panel {
  display: flex;
  justify-content: center;
  padding: 24px 0;
  border-top: 1px solid var(--divider);
}

.empty-state {
  text-align: center;
  padding: 48px;
  color: var(--text-secondary);
  font-size: 14px;
}

@media (max-width: 768px) {
  .level-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .level-actions {
    width: 100%;
    justify-content: flex-end;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--divider);
  }

  .stats-grid,
  .levels-list {
    grid-template-columns: 1fr;
  }
}
</style>
