<template>
  <div class="assessment-edit-form">
    <Card padding="lg">
      <Preloader v-if="loading" />

      <div v-else>
        <!-- Основная информация -->
        <section class="form-section">
          <h3 class="section-title">Основная информация</h3>

          <Input v-model="formData.title" type="text" label="Название" placeholder="Название аттестации" required />

          <Textarea v-model="formData.description" label="Описание" :rows="3" placeholder="Описание аттестации" />
        </section>

        <!-- Параметры -->
        <section class="form-section">
          <h3 class="section-title">Параметры</h3>

          <div class="form-grid">
            <Input v-model="formData.openAt" type="date" label="Дата открытия" required />

            <Input v-model="formData.closeAt" type="date" label="Дата закрытия" required />

            <Input v-model="formData.timeLimitMinutes" type="number" label="Время на прохождение (мин)" :min="1" required />

            <Input v-model="formData.passScorePercent" type="number" label="Проходной балл (%)" :min="0" :max="100" required />

            <Input v-model="formData.maxAttempts" type="number" label="Максимум попыток" :min="1" :max="3" required />
          </div>
        </section>

        <!-- Назначения -->
        <section class="form-section">
          <h3 class="section-title">Назначение</h3>

          <div class="form-group">
            <label>Филиалы</label>
            <div class="checkbox-group">
              <label v-for="branch in references.branches" :key="branch.id" class="checkbox-label">
                <input type="checkbox" :value="branch.id" v-model="selectedBranches" />
                <span>{{ branch.name }}</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>Должности</label>
            <div class="checkbox-group">
              <label v-for="position in references.positions" :key="position.id" class="checkbox-label">
                <input type="checkbox" :value="position.id" v-model="selectedPositions" />
                <span>{{ position.name }}</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>Конкретные сотрудники</label>
            <Input v-model="userSearchQuery" placeholder="Поиск сотрудников..." />
            <div class="checkbox-group">
              <label v-for="user in filteredUsers" :key="user.id" class="checkbox-label">
                <input type="checkbox" :value="user.id" v-model="selectedUsers" />
                <span>{{ user.first_name }} {{ user.last_name }}</span>
              </label>
            </div>
          </div>

          <!-- Предпросмотр назначенных пользователей -->
          <div v-if="assignedUsersPreview.length > 0" class="assigned-preview">
            <div class="preview-header">
              <strong>Будет назначено пользователей: {{ assignedUsersPreview.length }}</strong>
            </div>
            <div class="preview-list">
              <div v-for="user in assignedUsersPreview.slice(0, 10)" :key="user.id" class="preview-user">
                {{ user.first_name }} {{ user.last_name }} — {{ user.position_name || "без должности" }} ({{ user.branch_name || "без филиала" }})
              </div>
              <div v-if="assignedUsersPreview.length > 10" class="preview-more">И ещё {{ assignedUsersPreview.length - 10 }} пользователей...</div>
            </div>
          </div>
        </section>

        <!-- Вопросы -->
        <section class="form-section">
          <h3 class="section-title">Вопросы ({{ formData.questions.length }})</h3>

          <div v-if="formData.questions.length === 0" class="empty-state">
            <p>Нет вопросов</p>
          </div>

          <div v-else class="questions-list">
            <Card v-for="(question, qIndex) in formData.questions" :key="qIndex" class="question-card" padding="md">
              <div class="question-header">
                <h4>Вопрос {{ qIndex + 1 }}</h4>
                <Button size="sm" variant="danger" icon="trash" @click="removeQuestion(qIndex)">Удалить</Button>
              </div>

              <Input v-model="question.text" label="Текст вопроса" placeholder="Введите текст вопроса" required />

              <div class="form-group">
                <label>Варианты ответов</label>
                <div class="options-list">
                  <div v-for="(option, oIndex) in question.options" :key="oIndex" class="option-item">
                    <Input v-model="option.text" placeholder="Вариант ответа" required />
                    <label class="checkbox-label">
                      <input type="checkbox" v-model="option.isCorrect" />
                      <span>Правильный</span>
                    </label>
                    <Button size="sm" variant="danger" icon="x" @click="removeOption(qIndex, oIndex)" />
                  </div>
                </div>
                <Button size="sm" variant="secondary" icon="plus" @click="addOption(qIndex)">Добавить вариант</Button>
              </div>
            </Card>
          </div>

          <Button icon="plus" @click="addQuestion">Добавить вопрос</Button>
        </section>

        <!-- Кнопки действий -->
        <div class="form-actions">
          <Button variant="secondary" @click="$emit('cancel')">Отмена</Button>
          <Button variant="primary" @click="handleSubmit" :disabled="submitting">
            {{ submitting ? "Сохранение..." : "Сохранить изменения" }}
          </Button>
        </div>
      </div>
    </Card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { updateAssessment } from "../api/assessments";
import { getReferences } from "../api/users";
import { getUsers } from "../api/users";
import Card from "./ui/Card.vue";
import Input from "./ui/Input.vue";
import Textarea from "./ui/Textarea.vue";
import Button from "./ui/Button.vue";
import Preloader from "./ui/Preloader.vue";

const props = defineProps({
  assessment: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["submit", "cancel"]);

const loading = ref(false);
const submitting = ref(false);
const references = ref({ branches: [], positions: [] });
const allUsers = ref([]);
const userSearchQuery = ref("");

const selectedBranches = ref([]);
const selectedPositions = ref([]);
const selectedUsers = ref([]);

const formData = ref({
  title: "",
  description: "",
  openAt: "",
  closeAt: "",
  timeLimitMinutes: 30,
  passScorePercent: 70,
  maxAttempts: 3,
  questions: [],
});

const filteredUsers = computed(() => {
  if (!userSearchQuery.value) return allUsers.value;
  const query = userSearchQuery.value.toLowerCase();
  return allUsers.value.filter((user) => user.first_name.toLowerCase().includes(query) || user.last_name.toLowerCase().includes(query));
});

// Подсчёт пользователей, которые будут назначены
const assignedUsersPreview = computed(() => {
  const userIds = new Set();

  // Если выбраны и филиалы И должности - пересечение
  if (selectedBranches.value.length > 0 && selectedPositions.value.length > 0) {
    allUsers.value.forEach((user) => {
      if (selectedBranches.value.includes(user.branch_id) && selectedPositions.value.includes(user.position_id)) {
        userIds.add(user.id);
      }
    });
  } else {
    // Если только филиалы
    if (selectedBranches.value.length > 0) {
      allUsers.value.forEach((user) => {
        if (selectedBranches.value.includes(user.branch_id)) {
          userIds.add(user.id);
        }
      });
    }

    // Если только должности
    if (selectedPositions.value.length > 0) {
      allUsers.value.forEach((user) => {
        if (selectedPositions.value.includes(user.position_id)) {
          userIds.add(user.id);
        }
      });
    }
  }

  // Добавить напрямую выбранных пользователей
  selectedUsers.value.forEach((userId) => {
    userIds.add(userId);
  });

  return Array.from(userIds)
    .map((userId) => allUsers.value.find((u) => u.id === userId))
    .filter(Boolean);
});

const loadReferences = async () => {
  try {
    const data = await getReferences();
    references.value = data;
  } catch (error) {
    console.error("Load references error:", error);
  }
};

const loadUsers = async () => {
  try {
    const data = await getUsers({});
    allUsers.value = data.users || [];
  } catch (error) {
    console.error("Load users error:", error);
  }
};

const addQuestion = () => {
  formData.value.questions.push({
    text: "",
    options: [
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
  });
};

const removeQuestion = (index) => {
  formData.value.questions.splice(index, 1);
};

const addOption = (questionIndex) => {
  formData.value.questions[questionIndex].options.push({ text: "", isCorrect: false });
};

const removeOption = (questionIndex, optionIndex) => {
  if (formData.value.questions[questionIndex].options.length > 2) {
    formData.value.questions[questionIndex].options.splice(optionIndex, 1);
  } else {
    alert("Должно быть минимум 2 варианта ответа");
  }
};

const formatDateForInput = (dateString) => {
  if (!dateString) return "";
  if (typeof dateString === "string" && dateString.includes("T")) {
    return dateString.split("T")[0];
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().split("T")[0];
};

const handleSubmit = async () => {
  // Валидация
  if (!formData.value.title || !formData.value.openAt || !formData.value.closeAt) {
    alert("Заполните все обязательные поля");
    return;
  }

  if (formData.value.questions.length === 0) {
    alert("Добавьте хотя бы один вопрос");
    return;
  }

  // Проверка вопросов
  for (const question of formData.value.questions) {
    if (!question.text) {
      alert("Все вопросы должны иметь текст");
      return;
    }
    if (question.options.length < 2) {
      alert("У каждого вопроса должно быть минимум 2 варианта ответа");
      return;
    }
    const correctCount = question.options.filter((opt) => opt.isCorrect).length;
    if (correctCount !== 1) {
      alert("У каждого вопроса должен быть ровно 1 правильный ответ");
      return;
    }
  }

  submitting.value = true;

  try {
    const data = {
      title: formData.value.title,
      description: formData.value.description,
      openAt: formData.value.openAt + "T00:00:00",
      closeAt: formData.value.closeAt + "T23:59:59",
      timeLimitMinutes: Number(formData.value.timeLimitMinutes),
      passScorePercent: Number(formData.value.passScorePercent),
      maxAttempts: Number(formData.value.maxAttempts),
      branchIds: selectedBranches.value,
      positionIds: selectedPositions.value,
      userIds: selectedUsers.value,
      questions: formData.value.questions,
    };

    await updateAssessment(props.assessment.id, data);
    alert("Аттестация обновлена успешно!");
    emit("submit");
  } catch (error) {
    console.error("Update assessment error:", error);
    alert(error.response?.data?.error || "Ошибка обновления аттестации");
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  loading.value = true;

  // Загрузить справочники и пользователей
  await Promise.all([loadReferences(), loadUsers()]);

  // Заполнить форму данными аттестации
  formData.value = {
    title: props.assessment.title,
    description: props.assessment.description || "",
    openAt: formatDateForInput(props.assessment.open_at),
    closeAt: formatDateForInput(props.assessment.close_at),
    timeLimitMinutes: props.assessment.time_limit_minutes,
    passScorePercent: props.assessment.pass_score_percent,
    maxAttempts: props.assessment.max_attempts,
    questions: props.assessment.questions.map((q) => ({
      text: q.question_text,
      options: q.options.map((opt) => ({
        text: opt.option_text,
        isCorrect: opt.is_correct === 1,
      })),
    })),
  };

  // Загрузить текущие назначения из accessibility
  if (props.assessment.accessibility) {
    const { branches, positions, users } = props.assessment.accessibility;

    if (branches && branches.length > 0) {
      selectedBranches.value = branches.map((b) => b.id);
    }

    if (positions && positions.length > 0) {
      selectedPositions.value = positions.map((p) => p.id);
    }

    if (users && users.length > 0) {
      selectedUsers.value = users.map((u) => u.id);
    }
  }

  loading.value = false;
});
</script>

<style scoped>
.assessment-edit-form {
  width: 100%;
}

.form-section {
  margin-bottom: 32px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--divider);
}

.form-section:last-of-type {
  border-bottom: none;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 24px 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.question-card {
  background: var(--bg-secondary);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.question-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.option-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: center;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 32px;
}

.empty-state {
  padding: 32px;
  text-align: center;
  color: var(--text-secondary);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.checkbox-label:hover {
  background: var(--bg-primary);
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-label span {
  flex: 1;
  color: var(--text-primary);
  font-size: 14px;
}

.assigned-preview {
  margin-top: 24px;
  padding: 16px;
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--divider);
}

.preview-header {
  margin-bottom: 12px;
  color: var(--text-primary);
  font-size: 14px;
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-user {
  padding: 6px 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-secondary);
}

.preview-more {
  padding: 6px 8px;
  font-size: 13px;
  color: var(--text-hint);
  font-style: italic;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
  }
}
</style>
