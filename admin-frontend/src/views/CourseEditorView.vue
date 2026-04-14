<template>
  <div class="course-editor-view">
    <div class="page-header">
      <Button variant="secondary" icon="arrow-left" @click="goBack">К списку курсов</Button>
      <div class="page-header-actions" v-if="isEditMode && course">
        <Badge :variant="getStatusVariant(course.status)" rounded>
          {{ getStatusLabel(course.status) }}
        </Badge>
        <Button v-if="course.status === 'draft'" variant="success" icon="send" :loading="publishing" @click="handlePublish"> Опубликовать </Button>
        <Button v-if="course.status === 'published'" variant="secondary" icon="archive" :loading="archiving" @click="handleArchive"> В архив </Button>
      </div>
    </div>

    <Preloader v-if="loading" />

    <template v-else>
      <Card class="editor-card">
        <div class="editor-grid">
          <Input v-model="form.title" label="Название курса" placeholder="Например: Стандарты обслуживания" :error="errors.title" required />
          <Select v-model="form.finalAssessmentId" label="Итоговая аттестация" :options="assessmentOptions" placeholder="Выберите аттестацию" />
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

      <Card v-if="isEditMode && course" class="sections-card">
        <div class="sections-header">
          <h2>Разделы курса</h2>
          <p>Каждый раздел содержит темы и обязательный тест для его завершения.</p>
        </div>

        <div v-if="publicationErrors.length > 0" class="publication-errors">
          <h3>Что нужно исправить перед публикацией</h3>
          <ul>
            <li v-for="(errorText, index) in publicationErrors" :key="`${index}-${errorText}`">
              {{ errorText }}
            </li>
          </ul>
        </div>

        <div v-if="!course.sections || course.sections.length === 0" class="empty-sections">
          <p>Разделы ещё не добавлены.</p>
        </div>

        <div class="sections-list">
          <div v-for="section in course.sections" :key="section.id" class="section-item">
            <!-- Строка раздела -->
            <div class="section-row">
              <span class="section-order">{{ section.orderIndex }}</span>
              <div class="section-info">
                <span class="section-name">{{ section.title }}</span>
                <span v-if="!section.isRequired" class="section-badge-optional">необязательный</span>
                <span v-if="!section.assessmentId" class="section-badge-error">нет теста</span>
                <span v-else class="section-badge-ok">тест привязан</span>
              </div>
              <div class="section-actions">
                <Button size="sm" variant="ghost" :icon="sectionEditingId === section.id ? 'x' : 'pencil'" @click="toggleSectionEdit(section.id)">
                  {{ sectionEditingId === section.id ? "Закрыть" : "Редактировать" }}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon="trash"
                  :loading="deletingSectionId === section.id"
                  @click="removeSection(section.id, section.title)"
                >
                  Удалить
                </Button>
              </div>
            </div>

            <!-- Форма редактирования раздела -->
            <div v-if="sectionEditingId === section.id" class="section-edit-form">
              <div class="section-edit-grid">
                <Input v-model="sectionDrafts[section.id].title" label="Название раздела" :error="sectionErrors[section.id]?.title" required />
                <Input v-model="sectionDrafts[section.id].orderIndex" type="number" min="1" label="Порядок" />
                <Select
                  v-model="sectionDrafts[section.id].assessmentId"
                  label="Тест раздела"
                  :options="assessmentOptions"
                  placeholder="Выберите тест"
                />
                <Input v-model="sectionDrafts[section.id].estimatedMinutes" type="number" min="1" max="1440" label="Время (мин.)" />
                <div class="field-checkbox">
                  <label class="switch-label">
                    <input v-model="sectionDrafts[section.id].isRequired" type="checkbox" />
                    <span>Обязательный раздел</span>
                  </label>
                </div>
                <Textarea v-model="sectionDrafts[section.id].description" class="grid-span-full" label="Описание" :rows="2" />
              </div>
              <div class="section-edit-actions">
                <Button size="sm" icon="save" :loading="updatingSectionId === section.id" @click="saveSection(section.id)">Сохранить раздел</Button>
              </div>
            </div>

            <!-- Темы раздела -->
            <div class="topics-container">
              <div v-if="!section.topics || section.topics.length === 0" class="empty-topics">Тем нет.</div>
              <div v-else class="topics-list">
                <div v-for="topic in section.topics" :key="topic.id" class="topic-item">
                  <div class="topic-row">
                    <span class="topic-order">{{ topic.orderIndex }}</span>
                    <div class="topic-info">
                      <span class="topic-name">{{ topic.title }}</span>
                      <span v-if="topic.hasMaterial" class="topic-badge">материал</span>
                      <span v-if="topic.assessmentId" class="topic-badge">тест</span>
                    </div>
                    <div class="topic-actions">
                      <Button size="sm" variant="ghost" :icon="topicEditingId === topic.id ? 'x' : 'pencil'" @click="toggleTopicEdit(topic.id)" />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="trash"
                        :loading="deletingTopicId === topic.id"
                        @click="removeTopic(topic.id, topic.title)"
                      />
                    </div>
                  </div>
                  <!-- Форма редактирования темы -->
                  <div v-if="topicEditingId === topic.id" class="topic-edit-form">
                    <div class="topic-edit-grid">
                      <Input v-model="topicDrafts[topic.id].title" label="Название темы" :error="topicErrors[topic.id]?.title" required />
                      <Input v-model="topicDrafts[topic.id].orderIndex" type="number" min="1" label="Порядок" />
                      <Select v-model="topicDrafts[topic.id].assessmentId" label="Тест темы" :options="assessmentOptions" placeholder="Без теста" />
                      <div class="field-checkbox">
                        <label class="switch-label">
                          <input v-model="topicDrafts[topic.id].hasMaterial" type="checkbox" />
                          <span>Есть материал</span>
                        </label>
                      </div>
                      <Textarea
                        v-if="topicDrafts[topic.id].hasMaterial"
                        v-model="topicDrafts[topic.id].content"
                        class="grid-span-full"
                        label="Контент темы"
                        :rows="5"
                      />
                    </div>
                    <div class="topic-edit-actions">
                      <Button size="sm" icon="save" :loading="updatingTopicId === topic.id" @click="saveTopic(topic.id)">Сохранить тему</Button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Добавить тему -->
              <div v-if="newTopics[section.id]" class="new-topic">
                <h4>Новая тема</h4>
                <div class="topic-edit-grid">
                  <Input v-model="newTopics[section.id].title" label="Название темы" :error="newTopicErrors[section.id]?.title" required />
                  <Input v-model="newTopics[section.id].orderIndex" type="number" min="1" label="Порядок" />
                  <Select v-model="newTopics[section.id].assessmentId" label="Тест темы" :options="assessmentOptions" placeholder="Без теста" />
                  <div class="field-checkbox">
                    <label class="switch-label">
                      <input v-model="newTopics[section.id].hasMaterial" type="checkbox" />
                      <span>Есть материал</span>
                    </label>
                  </div>
                  <Textarea
                    v-if="newTopics[section.id].hasMaterial"
                    v-model="newTopics[section.id].content"
                    class="grid-span-full"
                    label="Контент темы"
                    :rows="4"
                  />
                </div>
                <div class="new-topic-actions">
                  <Button size="sm" icon="plus" :loading="creatingTopicSectionId === section.id" @click="addTopic(section.id)">Добавить тему</Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Добавить раздел -->
        <div class="new-section">
          <h3>Новый раздел</h3>
          <div class="section-edit-grid">
            <Input v-model="newSection.title" label="Название раздела" :error="newSectionErrors.title" required />
            <Input v-model="newSection.orderIndex" type="number" min="1" label="Порядок" />
            <Select v-model="newSection.assessmentId" label="Тест раздела" :options="assessmentOptions" placeholder="Выберите тест" />
            <Input v-model="newSection.estimatedMinutes" type="number" min="1" max="1440" label="Время (мин.)" />
            <div class="field-checkbox">
              <label class="switch-label">
                <input v-model="newSection.isRequired" type="checkbox" />
                <span>Обязательный раздел</span>
              </label>
            </div>
          </div>
          <div class="new-section-actions">
            <Button icon="plus" :loading="creatingSection" @click="addSection">Добавить раздел</Button>
          </div>
        </div>
      </Card>

      <!-- Блок назначения курса -->
      <Card v-if="isEditMode && course" class="assignments-card">
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
                <input type="checkbox" :value="pos.id" v-model="selectedPositionIds" />
                <span>{{ pos.name }}</span>
              </label>
            </div>
          </div>

          <div class="targets-group">
            <h3>Целевые филиалы</h3>
            <div v-if="branchOptions.length === 0" class="targets-empty">Загрузка...</div>
            <div v-else class="checkbox-list">
              <label v-for="branch in branchOptions" :key="branch.id" class="checkbox-item">
                <input type="checkbox" :value="branch.id" v-model="selectedBranchIds" />
                <span>{{ branch.name }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="targets-actions">
          <Button :loading="savingTargets" icon="save" @click="saveTargets">Сохранить назначения</Button>
        </div>

        <div class="manual-assignments">
          <h3>Ручные назначения</h3>

          <div class="add-assignment">
            <Input v-model="newAssignmentUserId" label="ID пользователя" type="number" min="1" placeholder="Введите ID" />
            <Button :loading="addingAssignment" icon="plus" @click="handleAddAssignment">Добавить</Button>
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
                <td>
                  <Button
                    size="sm"
                    variant="danger"
                    icon="trash"
                    :loading="removingAssignmentUserId === a.userId"
                    @click="handleRemoveAssignment(a.userId)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <!-- Блок участников с прогрессом -->
      <Card v-if="isEditMode && course" class="participants-card">
        <div class="participants-header">
          <h2>Участники</h2>
          <p>Пользователи, которые начали прохождение курса.</p>
          <Button size="sm" variant="ghost" icon="refresh-ccw" :loading="loadingParticipants" @click="loadParticipants">Обновить</Button>
        </div>

        <div v-if="loadingParticipants" class="participants-loading">Загрузка...</div>
        <div v-else-if="participants.length === 0" class="targets-empty">Участников ещё нет.</div>
        <table v-else class="assignments-table">
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Должность</th>
              <th>Филиал</th>
              <th>Статус</th>
              <th>Прогресс</th>
              <th>Начат</th>
              <th>Завершён</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in participants" :key="p.userId">
              <td>{{ p.name }}</td>
              <td>{{ p.positionTitle || "—" }}</td>
              <td>{{ p.branchTitle || "—" }}</td>
              <td>
                <span :class="['participant-status', `status-${p.status}`]">{{ getProgressStatusLabel(p.status) }}</span>
              </td>
              <td>{{ p.progressPercent }}%</td>
              <td>{{ formatAssignedAt(p.startedAt) }}</td>
              <td>{{ formatAssignedAt(p.completedAt) }}</td>
              <td class="participants-actions">
                <Button size="sm" variant="ghost" icon="eye" :loading="viewingProgressUserId === p.userId" @click="openUserProgress(p.userId)" />
                <Button
                  size="sm"
                  variant="danger"
                  icon="rotate-ccw"
                  :loading="resettingProgressUserId === p.userId"
                  @click="handleResetProgress(p.userId, p.name)"
                />
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Детальный прогресс одного пользователя -->
        <div v-if="selectedUserProgress" class="user-progress-detail">
          <div class="user-progress-header">
            <h3>Прогресс: {{ selectedUserName }}</h3>
            <Button
              size="sm"
              variant="ghost"
              icon="x"
              @click="
                selectedUserProgress = null;
                selectedUserName = '';
              "
              >Закрыть</Button
            >
          </div>
          <div v-for="section in selectedUserProgress.sections" :key="section.sectionId" class="progress-section">
            <div class="progress-section-header">
              <span class="progress-section-title">{{ section.orderIndex }}. {{ section.title }}</span>
              <span v-if="!section.isRequired" class="section-badge-optional">необязательный</span>
              <span :class="['participant-status', `status-${section.status}`]">{{ getProgressStatusLabel(section.status) }}</span>
              <span v-if="section.scorePercent !== null" class="progress-score">{{ section.scorePercent }}%</span>
            </div>
            <div v-for="topic in section.topics" :key="topic.topicId" class="progress-topic">
              <span class="progress-topic-title">{{ topic.orderIndex }}. {{ topic.title }}</span>
              <span v-if="topic.hasMaterial" class="topic-badge" :class="{ 'badge-done': topic.materialViewed }">материал</span>
              <span v-if="topic.hasAssessment" class="topic-badge" :class="{ 'badge-done': topic.status === 'completed' }">тест</span>
              <span :class="['participant-status', `status-${topic.status}`]">{{ getProgressStatusLabel(topic.status) }}</span>
              <span v-if="topic.scorePercent !== null" class="progress-score">{{ topic.scorePercent }}%</span>
            </div>
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
  createCourseSection,
  updateCourseSection,
  deleteCourseSection,
  createCourseTopic,
  updateCourseTopic,
  deleteCourseTopic,
  getCourseById,
  publishCourse,
  updateCourse,
  getCourseTargets,
  updateCourseTargets,
  getCourseAssignments,
  addCourseAssignment,
  removeCourseAssignment,
  getCourseUsers,
  getCourseUserProgress,
  resetCourseUserProgress,
} from "../api/courses";
import { getAssessments } from "../api/assessments";
import { getPositions } from "../api/positions";
import { getBranches } from "../api/branches";
import { useToast } from "../composables/useToast";

const route = useRoute();
const router = useRouter();
const { showToast } = useToast();

const loading = ref(false);
const saving = ref(false);
const publishing = ref(false);
const archiving = ref(false);

const sectionDrafts = ref({});
const sectionErrors = ref({});
const sectionEditingId = ref(null);
const updatingSectionId = ref(null);
const deletingSectionId = ref(null);
const creatingSection = ref(false);
const newSection = ref({ title: "", orderIndex: "", assessmentId: "", isRequired: true, estimatedMinutes: "", description: "" });
const newSectionErrors = ref({ title: "" });

const topicDrafts = ref({});
const topicErrors = ref({});
const topicEditingId = ref(null);
const updatingTopicId = ref(null);
const deletingTopicId = ref(null);
const newTopics = ref({});
const newTopicErrors = ref({});
const creatingTopicSectionId = ref(null);

const form = ref({
  title: "",
  description: "",
  finalAssessmentId: "",
});

const errors = ref({
  title: "",
});

const course = ref(null);
const assessmentOptions = ref([]);

const positionOptions = ref([]);
const branchOptions = ref([]);
const selectedPositionIds = ref([]);
const selectedBranchIds = ref([]);
const savingTargets = ref(false);
const assignments = ref([]);
const newAssignmentUserId = ref("");
const addingAssignment = ref(false);
const removingAssignmentUserId = ref(null);

const participants = ref([]);
const loadingParticipants = ref(false);
const resettingProgressUserId = ref(null);
const viewingProgressUserId = ref(null);
const selectedUserProgress = ref(null);
const selectedUserName = ref("");

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

const syncSectionDrafts = (sections = []) => {
  const nextDrafts = {};
  const nextTopicDrafts = {};
  const nextNewTopics = {};
  for (const section of sections) {
    nextDrafts[section.id] = {
      title: section.title || "",
      description: section.description || "",
      orderIndex: String(section.orderIndex || ""),
      assessmentId: section.assessmentId ? String(section.assessmentId) : "",
      isRequired: Boolean(section.isRequired),
      estimatedMinutes: section.estimatedMinutes ? String(section.estimatedMinutes) : "",
    };
    for (const topic of section.topics || []) {
      nextTopicDrafts[topic.id] = {
        title: topic.title || "",
        orderIndex: String(topic.orderIndex || ""),
        hasMaterial: Boolean(topic.hasMaterial),
        content: topic.content || "",
        assessmentId: topic.assessmentId ? String(topic.assessmentId) : "",
      };
    }
    nextNewTopics[section.id] = newTopics.value[section.id] || { title: "", orderIndex: "", hasMaterial: false, content: "", assessmentId: "" };
  }
  sectionDrafts.value = nextDrafts;
  sectionErrors.value = {};
  topicDrafts.value = nextTopicDrafts;
  topicErrors.value = {};
  newTopics.value = nextNewTopics;
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

const loadPositions = async () => {
  try {
    const data = await getPositions();
    positionOptions.value = data.positions || [];
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось загрузить должности"), "error");
  }
};

const loadBranches = async () => {
  try {
    const data = await getBranches();
    branchOptions.value = data.branches || [];
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось загрузить филиалы"), "error");
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
    const [courseResponse, targetsResponse, assignmentsResponse] = await Promise.all([
      getCourseById(courseId.value),
      getCourseTargets(courseId.value),
      getCourseAssignments(courseId.value),
    ]);
    course.value = courseResponse.course;
    applyCourseToForm(courseResponse.course);
    syncSectionDrafts(courseResponse.course.sections || []);
    selectedPositionIds.value = (targetsResponse.positions || []).map((p) => p.id);
    selectedBranchIds.value = (targetsResponse.branches || []).map((b) => b.id);
    assignments.value = assignmentsResponse.assignments || [];
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

const toggleSectionEdit = (sectionId) => {
  sectionEditingId.value = sectionEditingId.value === sectionId ? null : sectionId;
};

const toggleTopicEdit = (topicId) => {
  topicEditingId.value = topicEditingId.value === topicId ? null : topicId;
};

const resetNewSection = () => {
  newSection.value = { title: "", orderIndex: "", assessmentId: "", isRequired: true, estimatedMinutes: "", description: "" };
  newSectionErrors.value = { title: "" };
};

const addSection = async () => {
  if (!newSection.value.title.trim()) {
    newSectionErrors.value = { title: "Укажите название раздела" };
    return;
  }
  creatingSection.value = true;
  try {
    const payload = {
      title: newSection.value.title.trim(),
      description: (newSection.value.description || "").trim(),
      orderIndex: sanitizeOptionalNumber(newSection.value.orderIndex),
      assessmentId: sanitizeOptionalNumber(newSection.value.assessmentId),
      isRequired: Boolean(newSection.value.isRequired),
      estimatedMinutes: sanitizeOptionalNumber(newSection.value.estimatedMinutes),
    };
    const response = await createCourseSection(courseId.value, payload);
    course.value = response.course;
    syncSectionDrafts(response.course.sections || []);
    resetNewSection();
    showToast("Раздел добавлен", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось добавить раздел"), "error");
  } finally {
    creatingSection.value = false;
  }
};

const saveSection = async (sectionId) => {
  const draft = sectionDrafts.value[sectionId];
  if (!draft) return;
  if (!draft.title.trim()) {
    sectionErrors.value = { ...sectionErrors.value, [sectionId]: { title: "Укажите название" } };
    return;
  }
  updatingSectionId.value = sectionId;
  try {
    const payload = {
      title: draft.title.trim(),
      description: (draft.description || "").trim(),
      orderIndex: sanitizeOptionalNumber(draft.orderIndex),
      assessmentId: sanitizeOptionalNumber(draft.assessmentId),
      isRequired: Boolean(draft.isRequired),
      estimatedMinutes: sanitizeOptionalNumber(draft.estimatedMinutes),
    };
    const response = await updateCourseSection(sectionId, payload);
    course.value = response.course;
    syncSectionDrafts(response.course.sections || []);
    sectionEditingId.value = null;
    showToast("Раздел обновлён", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось обновить раздел"), "error");
  } finally {
    updatingSectionId.value = null;
  }
};

const removeSection = async (sectionId, title) => {
  if (!window.confirm(`Удалить раздел "${title}" и все его темы?`)) return;
  deletingSectionId.value = sectionId;
  try {
    const response = await deleteCourseSection(sectionId);
    course.value = response.course;
    syncSectionDrafts(response.course.sections || []);
    if (sectionEditingId.value === sectionId) sectionEditingId.value = null;
    showToast("Раздел удалён", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось удалить раздел"), "error");
  } finally {
    deletingSectionId.value = null;
  }
};

const addTopic = async (sectionId) => {
  const draft = newTopics.value[sectionId];
  if (!draft) return;
  if (!draft.title.trim()) {
    newTopicErrors.value = { ...newTopicErrors.value, [sectionId]: { title: "Укажите название темы" } };
    return;
  }
  if (!draft.hasMaterial && !sanitizeOptionalNumber(draft.assessmentId)) {
    showToast("Тема должна содержать материал или тест", "error");
    return;
  }
  creatingTopicSectionId.value = sectionId;
  try {
    const payload = {
      title: draft.title.trim(),
      orderIndex: sanitizeOptionalNumber(draft.orderIndex),
      hasMaterial: Boolean(draft.hasMaterial),
      content: draft.hasMaterial ? (draft.content || "").trim() || null : null,
      assessmentId: sanitizeOptionalNumber(draft.assessmentId),
    };
    const response = await createCourseTopic(sectionId, payload);
    course.value = response.course;
    syncSectionDrafts(response.course.sections || []);
    newTopics.value[sectionId] = { title: "", orderIndex: "", hasMaterial: false, content: "", assessmentId: "" };
    newTopicErrors.value = { ...newTopicErrors.value, [sectionId]: null };
    showToast("Тема добавлена", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось добавить тему"), "error");
  } finally {
    creatingTopicSectionId.value = null;
  }
};

const saveTopic = async (topicId) => {
  const draft = topicDrafts.value[topicId];
  if (!draft) return;
  if (!draft.title.trim()) {
    topicErrors.value = { ...topicErrors.value, [topicId]: { title: "Укажите название" } };
    return;
  }
  updatingTopicId.value = topicId;
  try {
    const payload = {
      title: draft.title.trim(),
      orderIndex: sanitizeOptionalNumber(draft.orderIndex),
      hasMaterial: Boolean(draft.hasMaterial),
      content: draft.hasMaterial ? (draft.content || "").trim() || null : null,
      assessmentId: sanitizeOptionalNumber(draft.assessmentId),
    };
    const response = await updateCourseTopic(topicId, payload);
    course.value = response.course;
    syncSectionDrafts(response.course.sections || []);
    topicEditingId.value = null;
    showToast("Тема обновлена", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось обновить тему"), "error");
  } finally {
    updatingTopicId.value = null;
  }
};

const removeTopic = async (topicId, title) => {
  if (!window.confirm(`Удалить тему "${title}"?`)) return;
  deletingTopicId.value = topicId;
  try {
    const response = await deleteCourseTopic(topicId);
    course.value = response.course;
    syncSectionDrafts(response.course.sections || []);
    if (topicEditingId.value === topicId) topicEditingId.value = null;
    showToast("Тема удалена", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось удалить тему"), "error");
  } finally {
    deletingTopicId.value = null;
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

const saveTargets = async () => {
  savingTargets.value = true;
  try {
    await updateCourseTargets(courseId.value, {
      positionIds: selectedPositionIds.value,
      branchIds: selectedBranchIds.value,
    });
    showToast("Назначения сохранены", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось сохранить назначения"), "error");
  } finally {
    savingTargets.value = false;
  }
};

const handleAddAssignment = async () => {
  const userId = parseInt(newAssignmentUserId.value, 10);
  if (!userId || userId <= 0) {
    showToast("Укажите корректный ID пользователя", "error");
    return;
  }

  addingAssignment.value = true;
  try {
    const response = await addCourseAssignment(courseId.value, userId);
    assignments.value = response.assignments || [];
    newAssignmentUserId.value = "";
    showToast("Пользователь добавлен", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось добавить пользователя"), "error");
  } finally {
    addingAssignment.value = false;
  }
};

const handleRemoveAssignment = async (userId) => {
  if (!window.confirm("Убрать назначение?")) {
    return;
  }

  removingAssignmentUserId.value = userId;
  try {
    const response = await removeCourseAssignment(courseId.value, userId);
    assignments.value = response.assignments || [];
    showToast("Назначение удалено", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось удалить назначение"), "error");
  } finally {
    removingAssignmentUserId.value = null;
  }
};

const formatAssignedAt = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const getProgressStatusLabel = (status) => {
  const labels = {
    not_started: "Не начат",
    in_progress: "В процессе",
    completed: "Завершён",
    failed: "Провален",
    passed: "Сдан",
  };
  return labels[status] || status;
};

const loadParticipants = async () => {
  if (!isEditMode.value) return;
  loadingParticipants.value = true;
  try {
    const response = await getCourseUsers(courseId.value);
    participants.value = response.users || [];
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось загрузить участников"), "error");
  } finally {
    loadingParticipants.value = false;
  }
};

const openUserProgress = async (userId) => {
  const participant = participants.value.find((p) => p.userId === userId);
  viewingProgressUserId.value = userId;
  try {
    const response = await getCourseUserProgress(courseId.value, userId);
    selectedUserProgress.value = response.progress;
    selectedUserName.value = participant?.name || `User #${userId}`;
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось загрузить прогресс"), "error");
  } finally {
    viewingProgressUserId.value = null;
  }
};

const handleResetProgress = async (userId, name) => {
  if (!window.confirm(`Сбросить прогресс пользователя "${name}" по этому курсу?\n\nИстория попыток аттестаций сохранится.`)) return;
  resettingProgressUserId.value = userId;
  try {
    await resetCourseUserProgress(courseId.value, userId);
    showToast("Прогресс сброшен", "success");
    if (selectedUserProgress.value && selectedUserName.value === name) {
      selectedUserProgress.value = null;
      selectedUserName.value = "";
    }
    await loadParticipants();
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось сбросить прогресс"), "error");
  } finally {
    resettingProgressUserId.value = null;
  }
};

onMounted(async () => {
  loading.value = true;
  await Promise.all([loadAssessments(), loadPositions(), loadBranches(), loadCourse()]);
  loading.value = false;
  if (isEditMode.value) {
    await loadParticipants();
  }
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
.sections-card {
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

.sections-header {
  margin-bottom: 12px;
}

.sections-header h2 {
  margin: 0 0 4px;
}

.sections-header p {
  margin: 0;
  color: var(--text-secondary);
}

.empty-sections {
  border: 1px dashed var(--divider);
  border-radius: 12px;
  padding: 18px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.sections-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.section-item {
  border: 1px solid var(--divider);
  border-radius: 12px;
  overflow: hidden;
}

.section-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-secondary);
}

.section-order {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary, #6366f1);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.section-name {
  font-weight: 600;
}

.section-badge-optional {
  font-size: 12px;
  color: var(--text-secondary);
  border: 1px solid var(--divider);
  border-radius: 6px;
  padding: 2px 6px;
}

.section-badge-error {
  font-size: 12px;
  color: #ef4444;
  border: 1px solid #ef444466;
  border-radius: 6px;
  padding: 2px 6px;
}

.section-badge-ok {
  font-size: 12px;
  color: #22c55e;
  border: 1px solid #22c55e66;
  border-radius: 6px;
  padding: 2px 6px;
}

.section-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.section-edit-form {
  padding: 12px 14px;
  border-top: 1px solid var(--divider);
}

.section-edit-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.section-edit-actions {
  display: flex;
  justify-content: flex-end;
}

.topics-container {
  padding: 12px 14px;
  border-top: 1px solid var(--divider);
}

.empty-topics {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 12px;
}

.topics-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.topic-item {
  border: 1px solid var(--divider);
  border-radius: 8px;
  overflow: hidden;
}

.topic-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--bg-secondary);
}

.topic-order {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: var(--divider);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.topic-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.topic-name {
  font-size: 14px;
}

.topic-badge {
  font-size: 11px;
  color: var(--text-secondary);
  border: 1px solid var(--divider);
  border-radius: 4px;
  padding: 1px 5px;
}

.topic-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.topic-edit-form {
  padding: 10px 12px;
  border-top: 1px solid var(--divider);
}

.topic-edit-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.topic-edit-actions {
  display: flex;
  justify-content: flex-end;
}

.field-checkbox {
  display: flex;
  align-items: center;
  min-height: 44px;
}

.new-topic {
  padding-top: 12px;
  border-top: 1px solid var(--divider);
  margin-top: 8px;
}

.new-topic h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color: var(--text-secondary);
}

.new-topic-actions {
  display: flex;
  justify-content: flex-end;
}

.new-section {
  padding-top: 20px;
  margin-top: 4px;
  border-top: 1px solid var(--divider);
}

.new-section h3 {
  margin: 0 0 10px;
}

.new-section-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.switch-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.assignments-card {
  margin-bottom: 20px;
}

.assignments-header {
  margin-bottom: 16px;
}

.assignments-header h2 {
  margin: 0 0 4px;
}

.assignments-header p {
  margin: 0;
  color: var(--text-secondary);
}

.targets-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 16px;
}

.targets-group h3 {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
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
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid var(--divider);
  border-radius: 8px;
  padding: 8px 12px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
}

.checkbox-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  cursor: pointer;
}

.targets-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--divider);
}

.manual-assignments h3 {
  margin: 0 0 12px;
  font-size: 15px;
}

.add-assignment {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 16px;
}

.add-assignment .input-wrapper {
  width: 180px;
}

.assignments-table {
  width: 100%;
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
}

.switch-label input {
  width: 16px;
  height: 16px;
}

/* ─── Участники ─────────────────────────────────────────────────────────── */

.participants-card {
  margin-bottom: 20px;
}

.participants-header {
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.participants-header h2 {
  margin: 0 0 4px;
  flex: 0 0 100%;
}

.participants-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  flex: 1;
}

.participants-loading {
  color: var(--text-secondary);
  font-size: 14px;
  padding: 12px 0;
}

.participants-actions {
  display: flex;
  gap: 4px;
}

.participant-status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-not_started {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}
.status-in_progress {
  background: #fef9c3;
  color: #854d0e;
}
.status-completed {
  background: #dcfce7;
  color: #166534;
}
.status-passed {
  background: #dcfce7;
  color: #166534;
}
.status-failed {
  background: #fee2e2;
  color: #991b1b;
}

.user-progress-detail {
  margin-top: 24px;
  border-top: 1px solid var(--divider);
  padding-top: 16px;
}

.user-progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.user-progress-header h3 {
  margin: 0;
  font-size: 15px;
}

.progress-section {
  border: 1px solid var(--divider);
  border-radius: 10px;
  margin-bottom: 10px;
  overflow: hidden;
}

.progress-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg-secondary);
  flex-wrap: wrap;
}

.progress-section-title {
  font-weight: 600;
  font-size: 14px;
  flex: 1;
}

.progress-score {
  font-size: 13px;
  color: var(--text-secondary);
}

.progress-topic {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-top: 1px solid var(--divider);
  flex-wrap: wrap;
}

.progress-topic-title {
  font-size: 13px;
  flex: 1;
  min-width: 140px;
}

.topic-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.badge-done {
  background: #dcfce7;
  color: #166534;
}

@media (max-width: 1024px) {
  .editor-grid,
  .section-edit-grid,
  .topic-edit-grid {
    grid-template-columns: 1fr;
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
