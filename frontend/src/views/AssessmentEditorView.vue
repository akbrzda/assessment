<template>
  <div class="page-container">
    <div class="container">
      <!-- Page Header -->
      <div class="page-header mb-24">
        <h1 class="title-large">{{ isEdit ? 'Редактировать аттестацию' : 'Создать аттестацию' }}</h1>
        <p class="body-medium text-secondary">{{ isEdit ? 'Измените параметры аттестации' : 'Заполните данные для новой аттестации' }}</p>
      </div>

      <form @submit.prevent="handleSubmit" class="assessment-form">
        <!-- Основная информация -->
        <div class="card form-section">
          <h2 class="section-title">Основная информация</h2>
          
          <div class="form-group">
            <label class="form-label">Название аттестации</label>
            <input
              v-model="form.title"
              type="text"
              class="form-input"
              :class="{ error: errors.title }"
              placeholder="Например, Проверка знаний меню"
              required
            />
            <div v-if="errors.title" class="form-error">{{ errors.title }}</div>
          </div>

          <div class="form-group">
            <label class="form-label">Описание</label>
            <textarea
              v-model="form.description"
              class="form-textarea"
              :class="{ error: errors.description }"
              placeholder="Краткое описание аттестации"
              rows="4"
            ></textarea>
            <div v-if="errors.description" class="form-error">{{ errors.description }}</div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Дата открытия</label>
              <input
                v-model="form.openAt"
                type="datetime-local"
                class="form-input"
                :class="{ error: errors.openAt }"
                required
              />
              <div v-if="errors.openAt" class="form-error">{{ errors.openAt }}</div>
            </div>

            <div class="form-group">
              <label class="form-label">Дата закрытия</label>
              <input
                v-model="form.closeAt"
                type="datetime-local"
                class="form-input"
                :class="{ error: errors.closeAt }"
                required
              />
              <div v-if="errors.closeAt" class="form-error">{{ errors.closeAt }}</div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Таймер (минуты)</label>
              <input
                v-model.number="form.timeLimitMinutes"
                type="number"
                class="form-input"
                :class="{ error: errors.timeLimitMinutes }"
                min="1"
                max="240"
                required
              />
              <div v-if="errors.timeLimitMinutes" class="form-error">{{ errors.timeLimitMinutes }}</div>
            </div>

            <div class="form-group">
              <label class="form-label">Порог прохождения (%)</label>
              <input
                v-model.number="form.passScorePercent"
                type="number"
                class="form-input"
                :class="{ error: errors.passScorePercent }"
                min="0"
                max="100"
                required
              />
              <div v-if="errors.passScorePercent" class="form-error">{{ errors.passScorePercent }}</div>
            </div>

            <div class="form-group">
              <label class="form-label">Максимум попыток</label>
              <input
                v-model.number="form.maxAttempts"
                type="number"
                class="form-input"
                :class="{ error: errors.maxAttempts }"
                min="1"
                max="5"
                required
              />
              <div v-if="errors.maxAttempts" class="form-error">{{ errors.maxAttempts }}</div>
            </div>
          </div>
        </div>

        <!-- Назначение -->
        <div class="card form-section">
          <h2 class="section-title">Назначение</h2>
          <p class="body-small text-secondary mb-16">Выберите филиалы, сотрудников и/или должности для назначения аттестации</p>

          <div class="assignment-grid">
            <!-- Филиалы -->
            <div class="assignment-column">
              <h3 class="column-title">Филиалы</h3>
              <div v-if="userStore.isSuperAdmin" class="checkbox-list">
                <label
                  v-for="branch in references.branches"
                  :key="branch.id"
                  class="checkbox-item"
                >
                  <input
                    type="checkbox"
                    :value="branch.id"
                    v-model="form.branchIds"
                  />
                  <span>{{ branch.name }}</span>
                </label>
              </div>
              <div v-else class="info-text">
                <p>Аттестация доступна в вашем филиале: {{ userStore.user?.branchName }}</p>
              </div>
            </div>

            <!-- Сотрудники -->
            <div class="assignment-column">
              <h3 class="column-title">Сотрудники</h3>
              <div v-if="availableUsers.length" class="checkbox-list">
                <label
                  v-for="user in availableUsers"
                  :key="user.id"
                  class="checkbox-item"
                >
                  <input
                    type="checkbox"
                    :value="user.id"
                    v-model="form.userIds"
                  />
                  <span>{{ user.lastName }} {{ user.firstName }} • {{ user.positionName }}</span>
                </label>
              </div>
              <div v-else class="info-text">
                <p>Нет доступных сотрудников</p>
              </div>
            </div>

            <!-- Должности -->
            <div class="assignment-column">
              <h3 class="column-title">Должности</h3>
              <div v-if="filteredPositions.length" class="checkbox-list">
                <label
                  v-for="position in filteredPositions"
                  :key="position.id"
                  class="checkbox-item"
                >
                  <input
                    type="checkbox"
                    :value="position.id"
                    v-model="form.positionIds"
                  />
                  <span>{{ position.name }}</span>
                </label>
              </div>
              <div v-else class="info-text">
                <p>Справочник должностей не загружен</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Вопросы -->
        <div class="card form-section">
          <div class="section-header">
            <h2 class="section-title">Вопросы</h2>
            <button type="button" class="btn btn-secondary" @click="addQuestion">
              Добавить вопрос
            </button>
          </div>

          <div v-if="!form.questions.length" class="empty-questions">
            <p class="body-small text-secondary">Добавьте хотя бы один вопрос для аттестации</p>
          </div>

          <div v-for="(question, questionIndex) in form.questions" :key="question.uid" class="question-card">
            <div class="question-header">
              <h3 class="question-title">Вопрос {{ questionIndex + 1 }}</h3>
              <button type="button" class="btn-danger-text" @click="removeQuestion(questionIndex)">
                Удалить
              </button>
            </div>

            <div class="form-group">
              <textarea
                v-model="question.text"
                class="form-textarea"
                placeholder="Введите текст вопроса"
                rows="3"
                required
              ></textarea>
            </div>

            <div class="options-section">
              <h4 class="options-title">Варианты ответов</h4>
              
              <div v-for="(option, optionIndex) in question.options" :key="option.uid" class="option-item">
                <label class="option-radio">
                  <input
                    type="radio"
                    :name="`question-${question.uid}`"
                    :value="optionIndex"
                    v-model="question.correctIndex"
                  />
                  <span class="radio-label">Правильный</span>
                </label>
                
                <input
                  v-model="option.text"
                  type="text"
                  class="form-input option-input"
                  placeholder="Введите вариант ответа"
                  required
                />
                
                <button
                  v-if="question.options.length > 2"
                  type="button"
                  class="btn-remove"
                  @click="removeOption(questionIndex, optionIndex)"
                >
                  ✕
                </button>
              </div>

              <button
                v-if="question.options.length < 6"
                type="button"
                class="btn btn-outline"
                @click="addOption(questionIndex)"
              >
                Добавить вариант
              </button>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="handleCancel">
            Отмена
          </button>
          <button type="submit" class="btn btn-primary" :disabled="!isFormValid || isLoading">
            {{ isLoading ? 'Сохранение...' : (isEdit ? 'Сохранить изменения' : 'Создать аттестацию') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "../stores/user";
import { useTelegramStore } from "../stores/telegram";
import { apiClient } from "../services/apiClient";

export default {
  name: "AssessmentEditorView",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const userStore = useUserStore();
    const telegramStore = useTelegramStore();

    const isLoading = ref(false);
    const isEdit = computed(() => Boolean(route.params.id));
    const assessmentId = computed(() => route.params.id);
    
    const form = reactive({
      title: "",
      description: "",
      openAt: "",
      closeAt: "",
      timeLimitMinutes: 30,
      passScorePercent: 70,
      maxAttempts: 1,
      branchIds: [],
      userIds: [],
      positionIds: [],
      questions: []
    });

    const errors = reactive({});
    const references = ref({ branches: [], positions: [] });
    const availableUsers = ref([]);

    // Фильтруем должности - управляющие не могут назначать аттестации на должность "Управляющий"
    const filteredPositions = computed(() => {
      const allPositions = references.value.positions || [];
      
      // Суперадмин видит все должности
      if (userStore.isSuperAdmin) {
        return allPositions;
      }
      
      // Остальные не видят должность "Управляющий"
      return allPositions.filter((position) => {
        const name = position.name.toLowerCase();
        return name !== 'управляющий' && name !== 'manager';
      });
    });

    const isFormValid = computed(() => {
      return (
        form.title.trim() &&
        form.description.trim() &&
        form.openAt &&
        form.closeAt &&
        form.timeLimitMinutes > 0 &&
        form.passScorePercent >= 0 &&
        form.passScorePercent <= 100 &&
        form.maxAttempts > 0 &&
        form.questions.length > 0 &&
        form.questions.every(q => 
          q.text.trim() && 
          q.options.length >= 2 && 
          q.options.every(o => o.text.trim()) &&
          q.correctIndex !== null
        )
      );
    });

    function generateUID() {
      return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    function addQuestion() {
      form.questions.push({
        uid: generateUID(),
        text: "",
        options: [
          { uid: generateUID(), text: "" },
          { uid: generateUID(), text: "" }
        ],
        correctIndex: null
      });
    }

    function removeQuestion(index) {
      form.questions.splice(index, 1);
    }

    function addOption(questionIndex) {
      form.questions[questionIndex].options.push({
        uid: generateUID(),
        text: ""
      });
    }

    function removeOption(questionIndex, optionIndex) {
      const question = form.questions[questionIndex];
      question.options.splice(optionIndex, 1);
      
      // Корректируем индекс правильного ответа если нужно
      if (question.correctIndex === optionIndex) {
        question.correctIndex = null;
      } else if (question.correctIndex > optionIndex) {
        question.correctIndex--;
      }
    }

    function validateForm() {
      const newErrors = {};

      if (!form.title.trim()) {
        newErrors.title = "Введите название аттестации";
      }

      if (!form.description.trim()) {
        newErrors.description = "Введите описание";
      }

      if (!form.openAt) {
        newErrors.openAt = "Выберите дату открытия";
      }

      if (!form.closeAt) {
        newErrors.closeAt = "Выберите дату закрытия";
      }

      if (form.openAt && form.closeAt && new Date(form.openAt) >= new Date(form.closeAt)) {
        newErrors.closeAt = "Дата закрытия должна быть позже даты открытия";
      }

      if (form.timeLimitMinutes <= 0) {
        newErrors.timeLimitMinutes = "Таймер должен быть больше 0";
      }

      if (form.passScorePercent < 0 || form.passScorePercent > 100) {
        newErrors.passScorePercent = "Порог должен быть от 0 до 100";
      }

      if (form.maxAttempts <= 0) {
        newErrors.maxAttempts = "Количество попыток должно быть больше 0";
      }

      Object.assign(errors, newErrors);
      return Object.keys(newErrors).length === 0;
    }

    function toUtcIso(value) {
      if (!value) {
        return null;
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return null;
      }
      return date.toISOString();
    }

    function toLocalInputValue(value) {
      if (!value) {
        return "";
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return "";
      }
      const localMs = date.getTime() - date.getTimezoneOffset() * 60000;
      return new Date(localMs).toISOString().slice(0, 16);
    }

    async function handleSubmit() {
      if (!validateForm()) {
        telegramStore.showAlert("Проверьте правильность заполнения формы");
        return;
      }

      isLoading.value = true;

      try {
        const payload = {
          ...form,
          openAt: toUtcIso(form.openAt),
          closeAt: toUtcIso(form.closeAt),
          clientTimezoneOffsetMinutes: -new Date().getTimezoneOffset(),
          questions: form.questions.map((question) => ({
            text: question.text.trim(),
            options: question.options.map((option, index) => ({
              text: option.text.trim(),
              isCorrect: question.correctIndex === index
            }))
          }))
        };

        if (isEdit.value) {
          await apiClient.updateAssessment(assessmentId.value, payload);
          telegramStore.showAlert("Аттестация обновлена");
        } else {
          await apiClient.createAssessment(payload);
          telegramStore.showAlert("Аттестация создана");
        }

        telegramStore.hapticFeedback("notification", "success");
        router.push("/admin/assessments");
      } catch (error) {
        console.error("Ошибка сохранения аттестации", error);
        telegramStore.showAlert(error.message || "Ошибка сохранения");
        telegramStore.hapticFeedback("notification", "error");
      } finally {
        isLoading.value = false;
      }
    }

    function handleCancel() {
      router.back();
    }

    async function loadData() {
      try {
        isLoading.value = true;

        // Загружаем справочники
        await userStore.loadReferences();
        references.value = userStore.references;

        // Загружаем пользователей
        if (userStore.isAdmin) {
          const response = await apiClient.listUsers();
          const users = Array.isArray(response) ? response : (response.users || []);
          availableUsers.value = users.filter(u => u.roleName === "employee");
        }

        // Если редактирование, загружаем данные аттестации
        if (isEdit.value) {
          const response = await apiClient.getAssessmentDetail(assessmentId.value);
          const assessment = response?.assessment || response || null;

          if (!assessment) {
            throw new Error("Аттестация не найдена");
          }
          
          Object.assign(form, {
            title: assessment.title || "",
            description: assessment.description || "",
            openAt: toLocalInputValue(assessment.openAt),
            closeAt: toLocalInputValue(assessment.closeAt),
            timeLimitMinutes: assessment.timeLimitMinutes || 30,
            passScorePercent: assessment.passScorePercent || 70,
            maxAttempts: assessment.maxAttempts || 1,
            branchIds: assessment.branchIds || [],
            userIds: assessment.userIds || [],
            positionIds: assessment.positionIds || [],
            questions: (assessment.questions || []).map((question) => {
              const options = Array.isArray(question.options) ? question.options : [];

              let detectedCorrectIndex = null;
              const normalizedOptions = options.map((option, index) => {
                const text = typeof option === "string" ? option : option?.text;
                const isCorrect = typeof option === "object" ? Boolean(option.isCorrect) : false;

                if (isCorrect) {
                  detectedCorrectIndex = index;
                }

                return {
                  uid: generateUID(),
                  text: text || ""
                };
              });

              return {
                uid: generateUID(),
                text: question.text || "",
                options: normalizedOptions.length
                  ? normalizedOptions
                  : [
                      { uid: generateUID(), text: "" },
                      { uid: generateUID(), text: "" }
                    ],
                correctIndex:
                  detectedCorrectIndex != null
                    ? detectedCorrectIndex
                    : typeof question.correctIndex === "number"
                    ? question.correctIndex
                    : null
              };
            })
          });
        } else {
          // Для нового создания добавляем один вопрос
          addQuestion();
          
          // Если не суперадмин, автоматически выбираем текущий филиал
          if (!userStore.isSuperAdmin && userStore.user?.branchId) {
            form.branchIds = [userStore.user.branchId];
          }
        }
      } catch (error) {
        console.error("Ошибка загрузки данных", error);
        telegramStore.showAlert("Ошибка загрузки данных");
      } finally {
        isLoading.value = false;
      }
    }

    onMounted(() => {
      loadData();
    });

    return {
      isEdit,
      isLoading,
      form,
      errors,
      references,
      availableUsers,
      isFormValid,
      userStore,
      filteredPositions,
      addQuestion,
      removeQuestion,
      addOption,
      removeOption,
      handleSubmit,
      handleCancel
    };
  }
};
</script>

<style scoped>
.assessment-form {
  max-width: 800px;
  margin: 0 auto;
}

.form-section {
  margin-bottom: 24px;
  padding: 24px;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text-primary);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.assignment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.assignment-column {
  min-height: 200px;
}

.column-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.checkbox-item:hover {
  background-color: var(--bg-secondary);
}

.info-text {
  padding: 16px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  color: var(--text-secondary);
}

.empty-questions {
  text-align: center;
  padding: 32px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 24px;
}

.question-card {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  background-color: var(--bg-secondary);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.question-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-danger-text {
  background: none;
  border: none;
  color: var(--error);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.btn-danger-text:hover {
  background-color: var(--error-bg);
}

.options-section {
  margin-top: 16px;
}

.options-title {
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.option-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.option-radio {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 80px;
}

.radio-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.option-input {
  flex: 1;
}

.btn-remove {
  background: none;
  border: none;
  color: var(--error);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  font-size: 16px;
  line-height: 1;
  transition: background-color 0.2s;
}

.btn-remove:hover {
  background-color: var(--error-bg);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px 0;
  border-top: 1px solid var(--border-color);
  margin-top: 32px;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .assignment-grid {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .question-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .option-item {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .option-radio {
    min-width: auto;
  }
}
</style>
