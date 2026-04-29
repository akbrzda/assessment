<template>
  <div class="badges-manager">
    <Card title="Управление бейджами" icon="Award">
      <template #header>
        <div class="card-header-content">
          <Icon name="Award" class="card-header-icon" />
          <h3 class="card-title">Управление бейджами</h3>
          <Button @click="showCreateModal = true" variant="primary" icon="plus" size="md" class="add-button">Добавить бейдж</Button>
        </div>
      </template>

      <!-- Список бейджей -->
      <div class="badges-grid">
        <div v-if="badges.length === 0" class="empty-state">Бейджи не настроены</div>
        <div v-for="badge in badges" :key="badge.id" class="badge-card">
          <div class="badge-icon-wrapper" :style="{ backgroundColor: badge.color + '20' }">
            <img v-if="badge.icon_url" :src="apiUrl + badge.icon_url" :alt="badge.name" class="badge-icon-img" />
            <span v-else class="badge-icon-emoji">{{ badge.icon || "🏅" }}</span>
          </div>
          <div class="badge-info">
            <h4 class="badge-name">{{ badge.name }}</h4>
            <p class="badge-description">{{ badge.description || "Нет описания" }}</p>
            <div class="badge-meta">
              <span class="badge-code">{{ badge.code }}</span>
              <span class="badge-points">{{ badge.points_reward }} очков</span>
            </div>
            <div class="badge-condition">
              <span class="condition-label">Условие:</span>
              <span class="condition-value">{{ getConditionLabel(badge.condition_type) }}</span>
            </div>
            <div class="badge-status">
              <span v-if="badge.is_active" class="badge badge-success">Активен</span>
              <span v-else class="badge badge-inactive">Неактивен</span>
            </div>
          </div>
          <div class="badge-actions">
            <Button @click="editBadge(badge)" variant="ghost" size="sm" icon="pencil" title="Редактировать" />
            <Button @click="confirmDelete(badge)" variant="danger" size="sm" icon="trash" title="Удалить" />
          </div>
        </div>

        <!-- Модальное окно создания/редактирования -->
        <Modal :show="showModal" :title="editingBadge ? 'Редактировать бейдж' : 'Новый бейдж'" @close="closeModal" size="lg">
          <div class="form-grid">
            <div class="form-section">
              <h4 class="section-title">Основная информация</h4>
              <Input
                v-model="formData.code"
                type="text"
                label="Код"
                placeholder="perfect_run"
                :disabled="!!editingBadge"
                hint="Уникальный идентификатор бейджа"
                required
              />
              <Input v-model="formData.name" type="text" label="Название" placeholder="Без ошибок" required />
              <Textarea v-model="formData.description" label="Описание" placeholder="Описание бейджа" :rows="3" />
              <Input v-model.number="formData.points_reward" type="number" label="Очков за получение" placeholder="0" />
            </div>

            <div class="form-section">
              <h4 class="section-title">Визуальное оформление</h4>
              <div class="form-group">
                <label>Цвет</label>
                <div class="color-picker-wrapper">
                  <input v-model="formData.color" type="color" class="form-color-input" />
                  <Input v-model="formData.color" type="text" placeholder="#10B981" />
                </div>
              </div>
              <Input
                v-model="formData.icon"
                type="text"
                label="Иконка (эмодзи)"
                placeholder="🏅"
                maxlength="2"
                hint="Или загрузите изображение ниже"
              />
              <div class="form-group">
                <label>Загрузить изображение</label>
                <input type="file" @change="handleFileChange" accept="image/*" class="form-file-input" />
                <small>JPG, PNG, GIF, SVG (макс. 2MB)</small>
                <div v-if="previewUrl" class="image-preview">
                  <img :src="previewUrl" alt="Preview" />
                  <Button @click="clearImage" type="button" variant="danger" size="sm">Удалить</Button>
                </div>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4 class="section-title">Условия получения</h4>
            <Select v-model="formData.condition_type" label="Тип условия" :options="conditionTypeOptions" />

            <!-- Динамические поля в зависимости от типа условия -->
            <div v-if="formData.condition_type === 'score_threshold'" class="form-group">
              <Input v-model.number="conditionParams.min_score" type="number" label="Минимальный балл (%)" placeholder="90" min="0" max="100" />
            </div>

            <div v-if="formData.condition_type === 'speed'" class="form-group">
              <Input
                v-model.number="conditionParams.max_time_percent"
                type="number"
                label="Максимальное время (% от таймера)"
                placeholder="40"
                min="0"
                max="100"
              />
            </div>

            <div v-if="formData.condition_type === 'streak'" class="form-group">
              <Input v-model.number="conditionParams.min_streak" type="number" label="Минимальная серия побед" placeholder="5" min="1" />
            </div>

            <div v-if="formData.condition_type === 'top_rank'" class="form-group">
              <Select
                v-model="conditionParams.scope"
                label="Область рейтинга"
                :options="[
                  { value: 'global', label: 'Глобальный' },
                  { value: 'branch', label: 'По филиалу' },
                  { value: 'position', label: 'По должности' },
                  { value: 'monthly', label: 'За месяц' },
                ]"
              />
              <Input v-model.number="conditionParams.rank" type="number" label="Место в рейтинге" placeholder="1" min="1" class="mt-2" />
            </div>
          </div>

          <div class="form-group inline-checkbox">
            <label>
              <input v-model="formData.is_active" type="checkbox" class="native-checkbox" />
              <span>Активен</span>
            </label>
          </div>
          <template #footer>
            <Button variant="secondary" @click="closeModal">Отмена</Button>
            <Button :loading="saving" @click="saveBadge">{{ editingBadge ? "Сохранить" : "Создать" }}</Button>
          </template>
        </Modal>
      </div>
    </Card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from "vue";
import badgesApi from "@/api/badges";
import Card from "@/components/ui/Card.vue";
import Modal from "@/components/ui/Modal.vue";
import Button from "@/components/ui/Button.vue";
import Input from "@/components/ui/Input.vue";
import Select from "@/components/ui/Select.vue";
import Textarea from "@/components/ui/Textarea.vue";
import Icon from "@/components/ui/Icon.vue";
import { API_BASE_URL } from "@/env";
import { useToast } from "@/composables/useToast";

const apiBaseUrl = API_BASE_URL || "http://localhost:3001/api";
const apiUrl = apiBaseUrl.replace("/api", "");

const badges = ref([]);
const loading = ref(false);
const saving = ref(false);
const showModal = ref(false);
const showCreateModal = computed({
  get: () => showModal.value && !editingBadge.value,
  set: (val) => {
    if (val) {
      editingBadge.value = null;
      showModal.value = true;
    }
  },
});
const editingBadge = ref(null);
const selectedFile = ref(null);
const previewUrl = ref(null);
const { showToast } = useToast();

const formData = ref({
  code: "",
  name: "",
  description: "",
  icon: "🏅",
  color: "#10B981",
  condition_type: "manual",
  condition_data: null,
  points_reward: 0,
  is_active: true,
  sort_order: 0,
});

const conditionParams = ref({});

const conditionTypeOptions = [
  { value: "manual", label: "Ручная выдача" },
  { value: "perfect_score", label: "Идеальный результат (100%)" },
  { value: "score_threshold", label: "Порог успешности" },
  { value: "speed", label: "Быстрое прохождение" },
  { value: "all_tests", label: "Все тесты пройдены" },
  { value: "streak", label: "Серия побед" },
  { value: "top_rank", label: "Топ рейтинга" },
  { value: "custom", label: "Пользовательское условие" },
];

// Отслеживание изменений параметров условий
watch(
  conditionParams,
  (newParams) => {
    formData.value.condition_data = newParams;
  },
  { deep: true },
);

// Загрузка бейджей
const loadBadges = async () => {
  loading.value = true;
  try {
    const data = await badgesApi.getBadges();
    badges.value = data.badges || [];
  } catch (error) {
    console.error("Ошибка загрузки бейджей:", error);
    showToast("Не удалось загрузить бейджи", "error");
  } finally {
    loading.value = false;
  }
};

// Метки для типов условий
const getConditionLabel = (type) => {
  const labels = {
    manual: "Ручная выдача",
    perfect_score: "Идеальный результат (100%)",
    score_threshold: "Порог успешности",
    speed: "Быстрое прохождение",
    all_tests: "Все тесты пройдены",
    streak: "Серия побед",
    top_rank: "Топ рейтинга",
    custom: "Пользовательское",
  };
  return labels[type] || type;
};

// Редактирование бейджа
const editBadge = (badge) => {
  editingBadge.value = badge;
  formData.value = {
    code: badge.code,
    name: badge.name,
    description: badge.description || "",
    icon: badge.icon || "🏅",
    color: badge.color || "#10B981",
    condition_type: badge.condition_type || "manual",
    condition_data: badge.condition_data,
    points_reward: badge.points_reward || 0,
    is_active: badge.is_active,
    sort_order: badge.sort_order || 0,
  };

  // Парсинг condition_data
  try {
    conditionParams.value = typeof badge.condition_data === "string" ? JSON.parse(badge.condition_data) : badge.condition_data || {};
  } catch (e) {
    conditionParams.value = {};
  }

  if (badge.icon_url) {
    previewUrl.value = apiUrl + badge.icon_url;
  }

  showModal.value = true;
};

// Обработка выбора файла
const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    previewUrl.value = URL.createObjectURL(file);
  }
};

// Очистка изображения
const clearImage = () => {
  selectedFile.value = null;
  previewUrl.value = null;
};

// Сохранение бейджа
const saveBadge = async () => {
  if (!formData.value.code || !formData.value.name) {
    showToast("Заполните обязательные поля", "warning");
    return;
  }

  saving.value = true;
  try {
    let badgeId;

    if (editingBadge.value) {
      await badgesApi.updateBadge(editingBadge.value.id, formData.value);
      badgeId = editingBadge.value.id;
    } else {
      const result = await badgesApi.createBadge(formData.value);
      badgeId = result.badgeId;
    }

    // Загрузка иконки если выбрана
    if (selectedFile.value && badgeId) {
      await badgesApi.uploadBadgeIcon(badgeId, selectedFile.value);
    }

    await loadBadges();
    closeModal();
  } catch (error) {
    console.error("Ошибка сохранения бейджа:", error);
    if (error.response?.data?.error) {
      showToast(error.response.data.error, "error");
    } else {
      showToast("Не удалось сохранить бейдж", "error");
    }
  } finally {
    saving.value = false;
  }
};

// Подтверждение удаления
const confirmDelete = (badge) => {
  if (confirm(`Удалить бейдж "${badge.name}"?`)) {
    deleteBadge(badge.id);
  }
};

// Удаление бейджа
const deleteBadge = async (id) => {
  try {
    await badgesApi.deleteBadge(id);
    await loadBadges();
  } catch (error) {
    console.error("Ошибка удаления бейджа:", error);
    if (error.response?.data?.error) {
      showToast(error.response.data.error, "error");
    } else {
      showToast("Не удалось удалить бейдж", "error");
    }
  }
};

// Закрытие модального окна
const closeModal = () => {
  showModal.value = false;
  editingBadge.value = null;
  selectedFile.value = null;
  previewUrl.value = null;
  conditionParams.value = {};
  formData.value = {
    code: "",
    name: "",
    description: "",
    icon: "🏅",
    color: "#10B981",
    condition_type: "manual",
    condition_data: null,
    points_reward: 0,
    is_active: true,
    sort_order: 0,
  };
};

onMounted(() => {
  loadBadges();
});
</script>

<style scoped>
.badges-manager {
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

/* Сетка бейджей */
.badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.badge-card {
  background: var(--surface-card);
  border: 1px solid var(--divider);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.2s;
}

.badge-card:hover {
  border-color: var(--ring);
  transform: translateY(-2px);
}

.badge-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.badge-icon-img {
  width: 60px;
  height: 60px;
  object-fit: contain;
}

.badge-icon-emoji {
  font-size: 48px;
}

.badge-info {
  flex: 1;
}

.badge-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.badge-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.badge-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.badge-code {
  padding: 4px 8px;
  background: var(--bg-secondary);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  border: 1px solid var(--divider);
}

.badge-points {
  padding: 4px 8px;
  background: var(--accent-green-soft);
  color: var(--accent-green);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.badge-condition {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
}

.condition-label {
  color: var(--text-secondary);
}

.condition-value {
  color: var(--text-primary);
  font-weight: 500;
}

.badge-status {
  margin-top: 8px;
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

.badge-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--divider);
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 48px;
  color: var(--text-secondary);
  font-size: 14px;
}

/* Форма */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-bottom: 24px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--divider);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 14px;
}

.form-group small {
  font-size: 12px;
  color: var(--text-secondary);
}

.inline-checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-primary);
}

.native-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--accent-blue);
}

.color-picker-wrapper {
  display: flex;
  gap: 12px;
  align-items: center;
}

.form-color-input {
  width: 60px;
  height: 40px;
  border: 1px solid var(--divider);
  border-radius: 12px;
  cursor: pointer;
}

.form-file-input {
  padding: 8px;
  border: 1px solid var(--divider);
  border-radius: 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}

.image-preview {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.image-preview img {
  width: 100px;
  height: 100px;
  object-fit: contain;
  border: 1px solid var(--divider);
  border-radius: 12px;
  padding: 8px;
  background: var(--bg-primary);
}

@media (max-width: 1024px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .badges-grid {
    grid-template-columns: 1fr;
  }
}
</style>
