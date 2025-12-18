<template>
  <div class="category-manager">
    <!-- Форма добавления категории -->
    <div class="add-category-section">
      <h3 class="section-title">Добавить категорию</h3>
      <form @submit.prevent="handleCreate" class="form-grid">
        <Input v-model="newCategory.name" type="text" label="Название категории" required />
        <Textarea v-model="newCategory.description" label="Описание (необязательно)" placeholder="Описание" :rows="2" />
        <Button @click="handleCreate" variant="primary">Добавить</Button>
      </form>
    </div>

    <!-- Список категорий -->
    <Preloader v-if="loading" />
    <div v-else class="categories-list">
      <div v-for="category in categories" :key="category.id" class="category-item">
        <!-- Режим просмотра -->
        <div v-if="editingId !== category.id" class="category-view">
          <div class="category-content">
            <div class="category-name">
              {{ category.name }}
              <span class="category-count"> ({{ category.questions_count }} вопросов) </span>
            </div>
            <div v-if="category.description" class="category-desc">
              {{ category.description }}
            </div>
          </div>
          <div class="category-actions">
            <Button variant="ghost" size="sm" icon="pencil" @click="startEdit(category)" title="Редактировать" />
            <Button
              variant="danger"
              size="sm"
              icon="trash"
              @click="confirmDelete(category)"
              :disabled="category.questions_count > 0"
              title="Удалить"
            />
          </div>
        </div>

        <!-- Режим редактирования -->
        <form v-else @submit.prevent="handleUpdate(category.id)" class="form-edit">
          <Input v-model="editForm.name" type="text" required />
          <Textarea v-model="editForm.description" label="Описание" :rows="2" />
          <div class="form-actions">
            <Button @click="handleUpdate(category.id)" variant="primary" fullWidth>Сохранить</Button>
            <Button @click="cancelEdit" variant="secondary" fullWidth>Отмена</Button>
          </div>
        </form>
      </div>

      <div v-if="categories.length === 0" class="empty-state">Нет категорий</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getCategories, createCategory, updateCategory, deleteCategory } from "../api/questionBank";
import Preloader from "./ui/Preloader.vue";
import Input from "./ui/Input.vue";
import Button from "./ui/Button.vue";
import Textarea from "./ui/Textarea.vue";
import { useToast } from "../composables/useToast";

const emit = defineEmits(["updated"]);

const loading = ref(false);
const categories = ref([]);
const newCategory = ref({
  name: "",
  description: "",
});

const editingId = ref(null);
const editForm = ref({
  name: "",
  description: "",
});
const { showToast } = useToast();

const loadCategories = async () => {
  loading.value = true;
  try {
    const data = await getCategories();
    categories.value = data.categories;
  } catch (error) {
    console.error("Load categories error:", error);
  } finally {
    loading.value = false;
  }
};

const handleCreate = async () => {
  if (!newCategory.value.name) return;

  try {
    await createCategory(newCategory.value);
    newCategory.value = { name: "", description: "" };
    await loadCategories();
    emit("updated");
    showToast("Категория создана", "success");
  } catch (error) {
    console.error("Create category error:", error);
    showToast("Ошибка создания категории", "error");
  }
};

const startEdit = (category) => {
  editingId.value = category.id;
  editForm.value = {
    name: category.name,
    description: category.description || "",
  };
};

const cancelEdit = () => {
  editingId.value = null;
  editForm.value = { name: "", description: "" };
};

const handleUpdate = async (id) => {
  try {
    await updateCategory(id, editForm.value);
    editingId.value = null;
    await loadCategories();
    emit("updated");
    showToast("Категория обновлена", "success");
  } catch (error) {
    console.error("Update category error:", error);
    showToast("Ошибка обновления категории", "error");
  }
};

const confirmDelete = async (category) => {
  if (category.questions_count > 0) {
    showToast("Нельзя удалить категорию с вопросами", "warning");
    return;
  }

  if (confirm(`Удалить категорию "${category.name}"?`)) {
    try {
      await deleteCategory(category.id);
      await loadCategories();
      emit("updated");
      showToast("Категория удалена", "success");
    } catch (error) {
      console.error("Delete category error:", error);
      showToast("Ошибка удаления категории", "error");
    }
  }
};

onMounted(() => {
  loadCategories();
});
</script>

<style scoped>
.category-manager {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.add-category-section {
  padding: 16px;
  background-color: var(--bg-secondary);
  border-radius: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.form-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--divider);
  border-radius: 12px;
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.15s ease;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--accent-blue);
}

.categories-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.category-item {
  padding: 12px;
  background-color: var(--surface-card);
  border: 1px solid var(--divider);
  border-radius: 12px;
}

.category-view {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.category-content {
  flex: 1;
}

.category-name {
  font-weight: 600;
  color: var(--text-primary);
}

.category-count {
  font-size: 12px;
  color: var(--text-secondary);
}

.category-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.category-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.form-edit {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  text-align: center;
  padding: 16px;
  color: var(--text-secondary);
  font-size: 14px;
}
</style>
