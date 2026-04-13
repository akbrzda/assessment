<template>
  <div class="course-editor-view">
    <div class="page-header">
      <Button variant="secondary" icon="arrow-left" @click="goBack">К списку курсов</Button>
      <div class="page-header-actions" v-if="isEditMode && course">
        <Badge :variant="getStatusVariant(course.status)" rounded>
          {{ getStatusLabel(course.status) }}
        </Badge>
        <Button
          v-if="course.status === 'draft'"
          variant="success"
          icon="send"
          :loading="publishing"
          @click="handlePublish"
        >
          Опубликовать
        </Button>
        <Button
          v-if="course.status === 'published'"
          variant="secondary"
          icon="archive"
          :loading="archiving"
          @click="handleArchive"
        >
          В архив
        </Button>
      </div>
    </div>

    <Preloader v-if="loading" />

    <template v-else>
      <Card class="editor-card">
        <div class="editor-grid">
          <Input
            v-model="form.title"
            label="Название курса"
            placeholder="Например: Стандарты обслуживания"
            :error="errors.title"
            required
          />
          <Select
            v-model="form.finalAssessmentId"
            label="Итоговая аттестация"
            :options="assessmentOptions"
            placeholder="Выберите аттестацию"
          />
          <Textarea
            v-model="form.description"
            class="grid-span-full"
            label="Описание курса"
            placeholder="Кратко опишите цель и содержание курса"
            :rows="4"
          />
        </div>

        <div class="editor-actions">
          <Button :loading="saving" icon="save" @click="saveCourse">
            {{ isEditMode ? "Сохранить изменения" : "Создать курс" }}
          </Button>
        </div>
      </Card>

      <Card v-if="isEditMode && course" class="modules-card">
        <div class="modules-header">
          <h2>Модули курса</h2>
          <p>Укажите порядок модулей и привяжите аттестации.</p>
        </div>

        <div v-if="publicationErrors.length > 0" class="publication-errors">
          <h3>Что нужно исправить перед публикацией</h3>
          <ul>
            <li v-for="(errorText, index) in publicationErrors" :key="`${index}-${errorText}`">
              {{ errorText }}
            </li>
          </ul>
        </div>

        <div v-if="course.modules.length === 0" class="empty-modules">
          <p>Модули еще не добавлены.</p>
        </div>

        <div v-else class="modules-list">
          <div v-for="moduleItem in course.modules" :key="moduleItem.id" class="module-item">
            <div class="module-item-grid">
              <Input
                v-model="moduleDrafts[moduleItem.id].title"
                label="Название"
                :error="moduleErrors[moduleItem.id]?.title"
                required
              />
              <Input
                v-model="moduleDrafts[moduleItem.id].orderIndex"
                type="number"
                min="1"
                label="Порядок"
              />
              <Select
                v-model="moduleDrafts[moduleItem.id].assessmentId"
                label="Аттестация модуля"
                :options="assessmentOptions"
                placeholder="Выберите аттестацию"
              />
              <Input
                v-model="moduleDrafts[moduleItem.id].estimatedMinutes"
                type="number"
                min="1"
                max="1440"
                label="Оценка времени (мин.)"
              />
              <div class="module-required-field">
                <label class="switch-label">
                  <input v-model="moduleDrafts[moduleItem.id].isRequired" type="checkbox" />
                  <span>Обязательный модуль</span>
                </label>
              </div>
              <Textarea
                v-model="moduleDrafts[moduleItem.id].description"
                class="grid-span-full"
                label="Описание"
                :rows="2"
              />
              <Textarea
                v-model="moduleDrafts[moduleItem.id].content"
                class="grid-span-full"
                label="Контент"
                :rows="3"
              />
            </div>

            <div class="module-item-actions">
              <Button
                size="sm"
                variant="secondary"
                icon="save"
                :loading="updatingModuleId === moduleItem.id"
                @click="saveModule(moduleItem.id)"
              >
                Сохранить модуль
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon="trash"
                :loading="deletingModuleId === moduleItem.id"
                @click="removeModule(moduleItem.id, moduleItem.title)"
              >
                Удалить
              </Button>
            </div>
          </div>
        </div>

        <div class="new-module">
          <h3>Новый модуль</h3>
          <div class="module-item-grid">
            <Input v-model="newModule.title" label="Название" :error="newModuleErrors.title" required />
            <Input v-model="newModule.orderIndex" type="number" min="1" label="Порядок" />
            <Select
              v-model="newModule.assessmentId"
              label="Аттестация модуля"
              :options="assessmentOptions"
              placeholder="Выберите аттестацию"
            />
            <Input v-model="newModule.estimatedMinutes" type="number" min="1" max="1440" label="Оценка времени (мин.)" />
            <Textarea v-model="newModule.description" class="grid-span-full" label="Описание" :rows="2" />
            <Textarea v-model="newModule.content" class="grid-span-full" label="Контент" :rows="3" />
          </div>
          <div class="new-module-actions">
            <label class="switch-label">
              <input v-model="newModule.isRequired" type="checkbox" />
              <span>Обязательный модуль</span>
            </label>
            <Button icon="plus" :loading="creatingModule" @click="addModule">Добавить модуль</Button>
          </div>
        </div>
      </Card>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Badge, Button, Card, Input, Preloader, Select, Textarea } from "../components/ui";
import {
  archiveCourse,
  createCourse,
  createCourseModule,
  deleteCourseModule,
  getCourseById,
  publishCourse,
  updateCourse,
  updateCourseModule,
} from "../api/courses";
import { getAssessments } from "../api/assessments";
import { useToast } from "../composables/useToast";

const route = useRoute();
const router = useRouter();
const { showToast } = useToast();

const loading = ref(false);
const saving = ref(false);
const creatingModule = ref(false);
const updatingModuleId = ref(null);
const deletingModuleId = ref(null);
const publishing = ref(false);
const archiving = ref(false);

const form = ref({
  title: "",
  description: "",
  finalAssessmentId: "",
});

const errors = ref({
  title: "",
});

const course = ref(null);
const moduleDrafts = ref({});
const moduleErrors = ref({});
const newModuleErrors = ref({ title: "" });
const assessmentOptions = ref([]);

const newModule = ref({
  title: "",
  description: "",
  content: "",
  orderIndex: "",
  assessmentId: "",
  isRequired: true,
  estimatedMinutes: "",
});

const isEditMode = computed(() => {
  return Number.isInteger(Number(route.params.id)) && Number(route.params.id) > 0;
});

const courseId = computed(() => Number(route.params.id));

const publicationErrors = computed(() => {
  return course.value?.publication?.errors || [];
});

const getStatusLabel = (status) => {
  const labels = {
    draft: "Черновик",
    published: "Опубликован",
    archived: "Архив",
  };
  return labels[status] || status;
};

const getStatusVariant = (status) => {
  const variants = {
    draft: "warning",
    published: "success",
    archived: "default",
  };
  return variants[status] || "default";
};

const getErrorMessage = (error, fallbackText) => {
  return error?.response?.data?.error || fallbackText;
};

const sanitizeOptionalNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resetNewModule = () => {
  newModule.value = {
    title: "",
    description: "",
    content: "",
    orderIndex: "",
    assessmentId: "",
    isRequired: true,
    estimatedMinutes: "",
  };
  newModuleErrors.value = { title: "" };
};

const syncModuleDrafts = (modules = []) => {
  const nextDrafts = {};
  for (const moduleItem of modules) {
    nextDrafts[moduleItem.id] = {
      title: moduleItem.title || "",
      description: moduleItem.description || "",
      content: moduleItem.content || "",
      orderIndex: String(moduleItem.orderIndex || ""),
      assessmentId: moduleItem.assessmentId ? String(moduleItem.assessmentId) : "",
      isRequired: Boolean(moduleItem.isRequired),
      estimatedMinutes: moduleItem.estimatedMinutes ? String(moduleItem.estimatedMinutes) : "",
    };
  }
  moduleDrafts.value = nextDrafts;
  moduleErrors.value = {};
};

const loadAssessments = async () => {
  try {
    const response = await getAssessments();
    const items = response.assessments || [];
    const options = items
      .map((assessmentItem) => ({
        value: String(assessmentItem.id),
        label: assessmentItem.title,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "ru"));

    assessmentOptions.value = [{ value: "", label: "Не выбрано" }, ...options];
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось загрузить список аттестаций"), "error");
  }
};

const applyCourseToForm = (courseItem) => {
  form.value = {
    title: courseItem.title || "",
    description: courseItem.description || "",
    finalAssessmentId: courseItem.finalAssessmentId ? String(courseItem.finalAssessmentId) : "",
  };
};

const loadCourse = async () => {
  if (!isEditMode.value) {
    course.value = null;
    form.value = {
      title: "",
      description: "",
      finalAssessmentId: "",
    };
    return;
  }

  loading.value = true;
  try {
    const response = await getCourseById(courseId.value);
    course.value = response.course;
    applyCourseToForm(response.course);
    syncModuleDrafts(response.course.modules || []);
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось загрузить курс"), "error");
    router.push("/courses");
  } finally {
    loading.value = false;
  }
};

const validateCourse = () => {
  errors.value = { title: "" };

  const title = form.value.title.trim();
  if (!title) {
    errors.value.title = "Укажите название курса";
    return false;
  }
  if (title.length < 3) {
    errors.value.title = "Название курса должно содержать минимум 3 символа";
    return false;
  }

  return true;
};

const saveCourse = async () => {
  if (!validateCourse()) {
    return;
  }

  const payload = {
    title: form.value.title.trim(),
    description: form.value.description.trim(),
    finalAssessmentId: sanitizeOptionalNumber(form.value.finalAssessmentId),
  };

  saving.value = true;
  try {
    if (isEditMode.value) {
      const response = await updateCourse(courseId.value, payload);
      course.value = {
        ...course.value,
        ...response.course,
      };
      showToast("Курс обновлен", "success");
      await loadCourse();
    } else {
      const response = await createCourse(payload);
      showToast("Курс создан", "success");
      await router.replace(`/courses/${response.course.id}/edit`);
      await loadCourse();
    }
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось сохранить курс"), "error");
  } finally {
    saving.value = false;
  }
};

const validateModuleDraft = (draft, targetErrors) => {
  targetErrors.title = "";

  const title = String(draft.title || "").trim();
  if (!title) {
    targetErrors.title = "Укажите название модуля";
    return false;
  }
  if (title.length < 2) {
    targetErrors.title = "Название модуля должно содержать минимум 2 символа";
    return false;
  }

  return true;
};

const addModule = async () => {
  const localErrors = { title: "" };
  if (!validateModuleDraft(newModule.value, localErrors)) {
    newModuleErrors.value = localErrors;
    return;
  }

  creatingModule.value = true;
  try {
    const payload = {
      title: newModule.value.title.trim(),
      description: (newModule.value.description || "").trim(),
      content: (newModule.value.content || "").trim(),
      orderIndex: sanitizeOptionalNumber(newModule.value.orderIndex),
      assessmentId: sanitizeOptionalNumber(newModule.value.assessmentId),
      isRequired: Boolean(newModule.value.isRequired),
      estimatedMinutes: sanitizeOptionalNumber(newModule.value.estimatedMinutes),
    };

    const response = await createCourseModule(courseId.value, payload);
    course.value = response.course;
    syncModuleDrafts(response.course.modules || []);
    resetNewModule();
    showToast("Модуль добавлен", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось добавить модуль"), "error");
  } finally {
    creatingModule.value = false;
  }
};

const saveModule = async (moduleId) => {
  const draft = moduleDrafts.value[moduleId];
  if (!draft) {
    return;
  }

  const localErrors = { title: "" };
  if (!validateModuleDraft(draft, localErrors)) {
    moduleErrors.value = {
      ...moduleErrors.value,
      [moduleId]: localErrors,
    };
    return;
  }

  updatingModuleId.value = moduleId;
  try {
    const payload = {
      title: draft.title.trim(),
      description: (draft.description || "").trim(),
      content: (draft.content || "").trim(),
      orderIndex: sanitizeOptionalNumber(draft.orderIndex),
      assessmentId: sanitizeOptionalNumber(draft.assessmentId),
      isRequired: Boolean(draft.isRequired),
      estimatedMinutes: sanitizeOptionalNumber(draft.estimatedMinutes),
    };

    const response = await updateCourseModule(moduleId, payload);
    course.value = response.course;
    syncModuleDrafts(response.course.modules || []);
    showToast("Модуль обновлен", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось обновить модуль"), "error");
  } finally {
    updatingModuleId.value = null;
  }
};

const removeModule = async (moduleId, title) => {
  if (!window.confirm(`Удалить модуль "${title}"?`)) {
    return;
  }

  deletingModuleId.value = moduleId;
  try {
    const response = await deleteCourseModule(moduleId);
    course.value = response.course;
    syncModuleDrafts(response.course.modules || []);
    showToast("Модуль удален", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось удалить модуль"), "error");
  } finally {
    deletingModuleId.value = null;
  }
};

const handlePublish = async () => {
  if (!course.value || !window.confirm(`Опубликовать курс "${course.value.title}"?`)) {
    return;
  }

  publishing.value = true;
  try {
    await publishCourse(course.value.id);
    showToast("Курс опубликован", "success");
    await loadCourse();
  } catch (error) {
    const validationErrors = error?.response?.data?.validationErrors;
    if (Array.isArray(validationErrors) && validationErrors.length > 0) {
      showToast(validationErrors.join("; "), "error", 7000);
      await loadCourse();
      return;
    }

    showToast(getErrorMessage(error, "Не удалось опубликовать курс"), "error");
  } finally {
    publishing.value = false;
  }
};

const handleArchive = async () => {
  if (!course.value || !window.confirm(`Перевести курс "${course.value.title}" в архив?`)) {
    return;
  }

  archiving.value = true;
  try {
    await archiveCourse(course.value.id);
    showToast("Курс архивирован", "success");
    await loadCourse();
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось архивировать курс"), "error");
  } finally {
    archiving.value = false;
  }
};

const goBack = () => {
  router.push("/courses");
};

onMounted(async () => {
  loading.value = true;
  await Promise.all([loadAssessments(), loadCourse()]);
  loading.value = false;
});
</script>

<style scoped>
.course-editor-view {
  width: 100%;
}

.page-header {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.page-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.editor-card,
.modules-card {
  margin-bottom: 20px;
}

.editor-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 12px;
}

.grid-span-full {
  grid-column: 1 / -1;
}

.editor-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.modules-header {
  margin-bottom: 12px;
}

.modules-header h2 {
  margin: 0 0 4px;
}

.modules-header p {
  margin: 0;
  color: var(--text-secondary);
}

.publication-errors {
  border: 1px solid #ef444466;
  border-radius: 12px;
  background: #ef444411;
  padding: 12px;
  margin-bottom: 12px;
}

.publication-errors h3 {
  margin: 0 0 8px;
  font-size: 15px;
}

.publication-errors ul {
  margin: 0;
  padding-left: 18px;
  color: var(--text-secondary);
}

.empty-modules {
  border: 1px dashed var(--divider);
  border-radius: 12px;
  padding: 18px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.modules-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.module-item {
  border: 1px solid var(--divider);
  border-radius: 12px;
  padding: 12px;
  background: var(--bg-secondary);
}

.module-item-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.module-item-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.module-required-field {
  display: flex;
  align-items: center;
  min-height: 44px;
}

.new-module {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--divider);
}

.new-module h3 {
  margin: 0 0 10px;
}

.new-module-actions {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.switch-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.switch-label input {
  width: 16px;
  height: 16px;
}

@media (max-width: 1024px) {
  .editor-grid,
  .module-item-grid {
    grid-template-columns: 1fr;
  }

  .new-module-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .page-header-actions {
    justify-content: flex-end;
  }
}
</style>

