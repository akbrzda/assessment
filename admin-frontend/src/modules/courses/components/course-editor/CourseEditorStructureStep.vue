<template>
  <div>
    <Card v-if="currentStep === 2 && isEditMode && course" class="sections-card structure-card">
      <div class="structure-header">
        <div>
          <h2>Структура курса</h2>
          <p>Добавьте темы и подтемы. Перетаскивайте элементы для изменения порядка.</p>
        </div>
      </div>

      <div v-if="publicationErrorsForDisplay.length > 0" class="publication-errors">
        <h3>Что нужно исправить перед публикацией</h3>
        <ul>
          <li v-for="(errorText, index) in publicationErrorsForDisplay" :key="`${index}-${errorText}`">
            {{ errorText }}
          </li>
        </ul>
      </div>

      <div class="structure-toolbar">
        <div class="structure-search">
          <Search :size="16" :stroke-width="2" />
          <Input v-model="structureSearchQueryModel" type="search" placeholder="Поиск по темам и подтемам" />
        </div>
        <ActionButton action="import" label="Импорт структуры" :disabled="true" />
        <ActionButton action="create" label="Добавить тему" @click="emit('toggle-new-section-form')" />
      </div>

      <div class="structure-layout">
        <div class="structure-list-panel">
          <div v-if="!visibleSections.length" class="empty-sections">
            <p>Темы курса ещё не добавлены.</p>
          </div>

          <draggable v-else v-model="course.sections" item-key="id" handle=".section-drag-handle" class="structure-sections-list" @end="emit('reorder-sections')">
            <template #item="{ element: section }">
              <div v-show="isSectionVisible(section)" class="structure-section" :class="{ 'structure-section-active': Number(activeSection?.id) === Number(section.id) }">
                <button type="button" class="structure-section-head" @click="emit('select-section', section.id)">
                  <span v-if="(course.sections || []).length > 1" class="structure-drag section-drag-handle" title="Перетащите для изменения порядка">⠿</span>
                  <span class="structure-section-number">{{ section.orderIndex }}</span>
                  <span class="structure-section-title">{{ section.title }}</span>
                  <span class="structure-section-count">{{ (section.topics || []).length }} подтемы</span>
                  <ChevronUp class="structure-chevron" :size="16" :stroke-width="2" />
                </button>

                <div v-if="Number(activeSection?.id) === Number(section.id)" class="structure-subtopics">
                  <draggable v-if="section.topics?.length" v-model="section.topics" item-key="id" handle=".topic-drag-handle" class="structure-subtopics-list" @end="emit('reorder-topics', section)">
                    <template #item="{ element: topic }">
                      <div class="structure-subtopic" :class="{ 'structure-subtopic-active': topicEditingId === topic.id }">
                        <div class="structure-subtopic-row" @click="emit('toggle-topic-edit', topic.id)">
                          <span v-if="(section.topics || []).length > 1" class="structure-drag topic-drag-handle" title="Перетащите для изменения порядка" @click.stop>⠿</span>
                          <FileText class="structure-doc-icon" :size="16" :stroke-width="1.8" />
                          <span class="structure-subtopic-title">{{ section.orderIndex }}.{{ topic.orderIndex }} {{ topic.title }}</span>
                          <Button type="button" class="structure-kebab" variant="ghost" size="sm" icon="more-vertical" :icon-only="true" @click.stop="emit('toggle-topic-edit', topic.id)" />
                        </div>

                        <div v-if="topicEditingId === topic.id && topicForms[topic.id]" class="structure-topic-editor">
                          <div class="structure-topic-grid">
                            <label class="structure-topic-field structure-topic-field-wide">
                              <span>Название подтемы</span>
                              <Input v-model="topicForms[topic.id].title" type="text" placeholder="Введите название подтемы" />
                            </label>
                          </div>

                          <p v-if="topicErrors[topic.id]?.title" class="structure-inline-error">{{ topicErrors[topic.id]?.title }}</p>

                          <div class="structure-topic-toggles">
                            <label>
                              <input v-model="topicForms[topic.id].hasMaterial" type="checkbox" />
                              <span>Есть учебный материал</span>
                            </label>
                            <label>
                              <input v-model="topicForms[topic.id].isRequired" type="checkbox" />
                              <span>Обязательная подтема</span>
                            </label>
                          </div>

                          <div class="structure-topic-actions">
                            <Button type="button" variant="primary" size="sm" :disabled="updatingTopicId === topic.id" @click="emit('save-topic', topic.id)">Сохранить</Button>
                            <Button type="button" variant="danger" size="sm" :disabled="deletingTopicId === topic.id" @click="emit('remove-topic', topic.id, topic.title)">Удалить</Button>
                            <Button v-if="topicForms[topic.id]?.hasMaterial" type="button" variant="secondary" size="sm" @click="emit('open-material-editor', topic.id)">
                              {{ topicForms[topic.id]?.content ? "Редактировать материал" : "Добавить материал" }}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </template>
                  </draggable>
                  <div v-else class="empty-topics">Подтем пока нет.</div>

                  <ActionButton action="create" label="Добавить подтему" size="sm" @click="emit('toggle-new-topic-form', section.id)" />

                  <div v-if="newTopics[section.id] && isNewTopicFormOpen(section.id)" class="structure-topic-create">
                    <div class="structure-topic-create-title">Новая подтема</div>
                    <div class="structure-topic-grid">
                      <label class="structure-topic-field structure-topic-field-wide">
                        <span>Название подтемы</span>
                        <input v-model="newTopics[section.id].title" type="text" placeholder="Например, 1.1 Роль сервиса" />
                      </label>
                    </div>

                    <p v-if="newTopicErrors[section.id]?.title" class="structure-inline-error">{{ newTopicErrors[section.id]?.title }}</p>

                    <div class="structure-topic-toggles">
                      <label>
                        <input v-model="newTopics[section.id].hasMaterial" type="checkbox" />
                        <span>Есть учебный материал</span>
                      </label>
                      <label>
                        <input v-model="newTopics[section.id].isRequired" type="checkbox" />
                        <span>Обязательная подтема</span>
                      </label>
                    </div>

                    <div class="structure-topic-actions">
                      <ActionButton action="cancel" size="sm" @click="emit('close-new-topic-form')" />
                      <ActionButton action="create" label="Добавить подтему" size="sm" :disabled="creatingTopicSectionId === section.id" @click="emit('add-topic', section.id)" />
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </draggable>

          <div v-if="showNewSectionForm" class="new-section structure-new-section">
            <div class="section-edit-grid">
              <Input v-model="newSection.title" label="Название темы курса" :error="newSectionErrors.title" required />
            </div>
            <div class="new-section-actions">
              <Button icon="plus" :loading="creatingSection" @click="emit('add-section')">Добавить тему</Button>
            </div>
          </div>

          <ActionButton action="create" label="Добавить тему" @click="emit('show-new-section-form')" />
        </div>

        <aside class="structure-detail-panel">
          <template v-if="activeSection && activeSectionForm">
            <div class="structure-detail-head">
              <div class="structure-detail-head-title">
                <span class="structure-detail-eyebrow">Тема</span>
                <template v-if="sectionEditingId === activeSection.id">
                  <input
                    v-model="activeSectionForm.title"
                    class="structure-title-input"
                    type="text"
                    placeholder="Название темы"
                    @keydown.enter.prevent="emit('save-section', activeSection.id)"
                    @keydown.esc.prevent="emit('toggle-section-edit', activeSection.id)"
                  />
                </template>
                <template v-else>
                  <h3>{{ activeSection.orderIndex }}. {{ activeSection.title }}</h3>
                </template>
              </div>
              <div class="structure-head-actions">
                <Button v-if="sectionEditingId === activeSection.id" type="button" variant="primary" size="sm" :disabled="updatingSectionId === activeSection.id" @click="emit('save-section', activeSection.id)">Сохранить</Button>
                <Button type="button" variant="secondary" size="sm" :icon="sectionEditingId === activeSection.id ? 'x' : 'pencil'" :disabled="updatingSectionId === activeSection.id" @click="emit('toggle-section-edit', activeSection.id)">
                  {{ sectionEditingId === activeSection.id ? "Отмена" : "Изменить" }}
                </Button>
              </div>
            </div>

            <label class="structure-field">
              <span>Краткое описание</span>
              <textarea v-model="activeSectionForm.description" maxlength="500" placeholder="Базовые понятия о сервисе, его роли в ресторане и стандартах общения с гостями."></textarea>
              <small>{{ (activeSectionForm.description || "").length }}/500</small>
            </label>

            <div class="structure-settings">
              <h4>Настройки темы</h4>
              <label class="structure-toggle">
                <span>
                  <strong>Тема обязательна для изучения</strong>
                  <small>Пользователь не сможет отметить тему как пройденную, пока не изучит все материалы</small>
                </span>
                <input v-model="activeSectionForm.isRequired" class="native-checkbox" type="checkbox" />
              </label>
              <label class="structure-toggle">
                <span>
                  <strong>Тест темы настраивается отдельно</strong>
                  <small>Создание и параметры теста перенесены на шаг «Тест для темы»</small>
                </span>
                <span class="structure-settings-note">Шаг 3</span>
              </label>
              <label class="structure-toggle">
                <span>
                  <strong>Показывать тему в оглавлении</strong>
                  <small>Тема будет отображаться в содержании курса</small>
                </span>
                <input class="native-checkbox" type="checkbox" checked />
              </label>
            </div>

            <Button type="button" class="structure-delete-button" variant="danger" size="sm" icon="trash" :disabled="deletingSectionId === activeSection.id" @click="emit('remove-section', activeSection.id, activeSection.title)">
              Удалить тему
            </Button>
          </template>
        </aside>
      </div>
    </Card>

    <div v-if="showMaterialStep && currentStep === 3 && isEditMode && course" class="materials-step-card">
      <div class="materials-breadcrumbs">
        <ActionButton action="back" label="Структура курса" size="sm" @click="emit('close-material-editor', 2)" />
        <span>›</span>
        <span>{{ activeMaterialSection?.orderIndex || "—" }}. {{ activeMaterialSection?.title || "Тема курса" }}</span>
        <span>›</span>
        <strong>{{ activeMaterialTopicTitle }}</strong>
      </div>

      <div class="materials-title-row">
        <div>
          <h2>Добавление материалов в подтему</h2>
          <p>Добавьте текст, изображения, видео и ссылки. Материалы будут доступны обучающимся в том порядке, в котором вы их расположите.</p>
        </div>
        <Button type="button" class="materials-preview-button" variant="secondary" size="sm" icon="eye">Предпросмотр для ученика</Button>
      </div>

      <div class="materials-layout">
        <section class="materials-editor-panel">
          <div v-if="activeMaterialTopic && activeMaterialForm" class="materials-editor-card">
            <div class="materials-form">
              <div class="materials-content-field">
                <WysiwygEditor v-model="activeMaterialForm.content" label="Содержание" placeholder="Добавьте текст материала" :min-height="260" :show-counter="true" :max-length="5000" />
              </div>

              <div class="materials-tab-placeholder">
                <strong>Видео через iframe</strong>
                <p>Вставьте iframe-код плеера, если видео размещено на внешней платформе.</p>
                <label class="materials-field">
                  <span>Iframe-код видео</span>
                  <textarea v-model="materialIframeDraftModel" placeholder='<iframe src="https://example.com/embed/video"></iframe>' rows="4"></textarea>
                </label>
                <Button type="button" class="materials-secondary-button" variant="secondary" size="sm" @click="emit('append-iframe')">Добавить iframe</Button>
              </div>

              <div class="materials-settings">
                <h3>Дополнительные настройки</h3>
                <label class="materials-toggle">
                  <span>Отображать материал как обязательный для изучения</span>
                  <input v-model="activeMaterialForm.isRequired" type="checkbox" />
                </label>
              </div>

              <div class="materials-actions">
                <Button type="button" class="materials-delete-button" variant="danger" size="sm" icon="trash" @click="emit('clear-material-content')">Удалить материал</Button>
                <div>
                  <ActionButton action="cancel" size="sm" class="materials-cancel-button" @click="emit('close-material-editor', 2)" />
                  <ActionButton action="save" label="Сохранить изменения" size="sm" class="materials-save-button" :disabled="updatingTopicId === activeMaterialTopic.id" @click="emit('save-material-topic')" />
                </div>
              </div>
            </div>
          </div>

          <div v-else class="materials-editor-empty">
            <h3>Выберите подтему</h3>
            <p>Материал можно добавить только к подтемам, где включена галочка «Есть учебный материал».</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import draggable from "vuedraggable";
import { ChevronUp, FileText, Search } from "lucide-vue-next";

import { Button, Card, Input, WysiwygEditor } from "@/components/ui";
import ActionButton from "@/components/ui/ActionButton.vue";

const props = defineProps({
  currentStep: { type: Number, required: true },
  isEditMode: { type: Boolean, required: true },
  course: { type: Object, default: null },
  publicationErrorsForDisplay: { type: Array, required: true },
  structureSearchQuery: { type: String, default: "" },
  visibleSections: { type: Array, required: true },
  activeSection: { type: Object, default: null },
  topicEditingId: { type: [Number, String, null], default: null },
  topicForms: { type: Object, required: true },
  topicErrors: { type: Object, required: true },
  updatingTopicId: { type: [Number, String, null], default: null },
  deletingTopicId: { type: [Number, String, null], default: null },
  newTopics: { type: Object, required: true },
  newTopicErrors: { type: Object, required: true },
  creatingTopicSectionId: { type: [Number, String, null], default: null },
  showNewSectionForm: { type: Boolean, required: true },
  newSection: { type: Object, required: true },
  newSectionErrors: { type: Object, required: true },
  creatingSection: { type: Boolean, required: true },
  activeSectionForm: { type: Object, default: null },
  sectionEditingId: { type: [Number, String, null], default: null },
  updatingSectionId: { type: [Number, String, null], default: null },
  deletingSectionId: { type: [Number, String, null], default: null },
  isSectionVisible: { type: Function, required: true },
  isNewTopicFormOpen: { type: Function, required: true },
  showMaterialStep: { type: Boolean, required: true },
  activeMaterialSection: { type: Object, default: null },
  activeMaterialTopicTitle: { type: String, default: "" },
  activeMaterialTopic: { type: Object, default: null },
  activeMaterialForm: { type: Object, default: null },
  materialIframeDraft: { type: String, default: "" },
});

const emit = defineEmits([
  "update:structure-search-query",
  "toggle-new-section-form",
  "reorder-sections",
  "select-section",
  "reorder-topics",
  "toggle-topic-edit",
  "save-topic",
  "remove-topic",
  "open-material-editor",
  "toggle-new-topic-form",
  "close-new-topic-form",
  "add-topic",
  "add-section",
  "show-new-section-form",
  "save-section",
  "toggle-section-edit",
  "remove-section",
  "close-material-editor",
  "append-iframe",
  "clear-material-content",
  "save-material-topic",
  "update:material-iframe-draft",
]);

const structureSearchQueryModel = computed({
  get: () => props.structureSearchQuery,
  set: (value) => emit("update:structure-search-query", value),
});

const materialIframeDraftModel = computed({
  get: () => props.materialIframeDraft,
  set: (value) => emit("update:material-iframe-draft", value),
});
</script>

<style scoped>
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

.empty-sections {
  border: 1px dashed var(--divider);
  border-radius: 12px;
  padding: 18px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.empty-topics {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 12px;
}

.section-edit-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.new-section {
  padding-top: 20px;
  margin-top: 4px;
  border-top: 1px solid var(--divider);
}

.new-section-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.structure-card :deep(.card-content) {
  padding: 24px;
}

.structure-card {
  --structure-primary: #5b41f5;
  --structure-border: #e7eaf3;
  --structure-soft: #f7f7fd;
}

.structure-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 22px;
}

.structure-header h2 {
  margin: 0 0 4px;
  font-size: 22px;
  line-height: 28px;
  font-weight: 700;
  color: #111827;
}

.structure-header p {
  margin: 0;
  font-size: 14px;
  line-height: 20px;
  color: #6f7892;
}

.structure-toolbar {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) auto auto;
  gap: 14px;
  align-items: center;
  margin-bottom: 22px;
}

.structure-search {
  height: 42px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border: 1px solid var(--structure-border);
  border-radius: 8px;
  background: #ffffff;
}

.structure-search :deep(input) {
  width: 100%;
  height: 100%;
  border: 0 !important;
  border-radius: 0;
  background: transparent !important;
  font-size: 14px;
  color: #172033;
}

.structure-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 464px;
  gap: 26px;
  align-items: start;
}

.structure-sections-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.structure-section {
  border: 1px solid var(--structure-border);
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
}

.structure-section-active .structure-section-head {
  background: var(--structure-soft);
  border-bottom: 1px solid var(--structure-border);
}

.structure-section-head {
  width: 100%;
  min-height: 48px;
  border: 0;
  background: #ffffff;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  text-align: left;
  cursor: pointer;
}

.structure-drag {
  color: #b4bbcc;
  cursor: grab;
  font-size: 18px;
  line-height: 1;
}

.structure-section-number {
  font-size: 16px;
  color: #586179;
}

.structure-section-title {
  min-width: 0;
  overflow: hidden;
  color: #182236;
  font-size: 15px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.structure-section-count {
  color: #7c86a0;
  font-size: 13px;
  white-space: nowrap;
}

.structure-subtopics {
  padding: 6px 20px 14px 42px;
}

.structure-subtopic-row {
  min-height: 46px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.structure-subtopic-title {
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.structure-topic-editor,
.structure-topic-create {
  border-top: 1px dashed #dfe4f2;
  padding: 10px 0 12px;
}

.structure-topic-create {
  margin-top: 10px;
  border: 1px dashed #d8def0;
  border-radius: 8px;
  padding: 12px;
  background: #fafbff;
}

.structure-topic-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 10px;
}

.structure-topic-field span {
  display: block;
  margin-bottom: 6px;
  color: #344054;
  font-size: 12px;
  font-weight: 600;
}

.structure-topic-field input {
  width: 100%;
  height: 38px;
  border: 1px solid #d8def0;
  border-radius: 8px;
  padding: 0 10px;
}

.structure-inline-error {
  margin: 8px 0 0;
  color: #dc2626;
  font-size: 12px;
}

.structure-topic-toggles {
  margin-top: 10px;
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.structure-topic-actions {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.structure-new-section {
  border: 1px solid var(--structure-border);
  border-radius: 8px;
  margin: 8px 0;
  padding: 16px;
}

.structure-detail-panel {
  min-height: 612px;
  border: 1px solid var(--structure-border);
  border-radius: 10px;
  background: #ffffff;
  padding: 24px 22px;
  position: sticky;
  top: 12px;
}

.structure-detail-head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 24px;
}

.structure-detail-eyebrow {
  display: block;
  margin-bottom: 6px;
  color: #344054;
  font-size: 14px;
  font-weight: 600;
}

.structure-title-input {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--structure-border) !important;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  padding: 10px 12px;
}

.structure-field {
  display: block;
  margin-bottom: 18px;
}

.structure-field span {
  display: block;
  margin-bottom: 8px;
  color: #344054;
  font-size: 14px;
  font-weight: 600;
}

.structure-field textarea {
  width: 100%;
  border: 1px solid var(--structure-border) !important;
  border-radius: 8px;
  height: 126px;
  padding: 14px;
  resize: none;
}

.structure-field small {
  display: block;
  margin-top: -26px;
  padding-right: 12px;
  color: #64708a;
  font-size: 12px;
  text-align: right;
}

.structure-settings {
  border-top: 1px solid var(--structure-border);
  margin-top: 24px;
  padding-top: 18px;
}

.structure-toggle {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 16px;
  align-items: start;
  margin-bottom: 24px;
}

.structure-toggle input {
  width: 42px;
  height: 24px;
  appearance: none;
  border: 0;
  border-radius: 999px;
  background: #d8deea;
  position: relative;
}

.structure-toggle input::before {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  transition: transform 0.2s ease;
}

.structure-toggle input:checked {
  background: var(--structure-primary);
}

.structure-toggle input:checked::before {
  transform: translateX(18px);
}

.structure-settings-note {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #f1eeff;
  color: #655cff;
  font-size: 12px;
  font-weight: 700;
}

.materials-step-card {
  --materials-primary: #5b41f5;
  --materials-border: #e6eaf4;
  --materials-muted: #6f7892;
  border: 1px solid var(--materials-border);
  border-radius: 10px;
  background: #ffffff;
  padding: 28px 28px 24px;
}

.materials-breadcrumbs {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  color: #6f7892;
  font-size: 14px;
}

.materials-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
}

.materials-title-row h2 {
  margin: 0 0 6px;
  font-size: 24px;
  line-height: 30px;
  font-weight: 800;
}

.materials-title-row p {
  margin: 0;
  color: var(--materials-muted);
  font-size: 14px;
}

.materials-editor-card {
  border: 1px solid var(--materials-border);
  border-radius: 10px;
  background: #ffffff;
  overflow: hidden;
}

.materials-form {
  padding: 22px;
}

.materials-tab-placeholder {
  border: 1px dashed #d8def0;
  border-radius: 10px;
  background: #fafbff;
  padding: 18px;
  margin-bottom: 22px;
}

.materials-tab-placeholder strong {
  display: block;
  margin-bottom: 6px;
  color: #172033;
  font-size: 15px;
}

.materials-tab-placeholder p {
  margin: 0 0 14px;
  color: var(--materials-muted);
  font-size: 13px;
}

.materials-field textarea {
  width: 100%;
  border: 1px solid var(--materials-border);
  border-radius: 8px;
  min-height: 104px;
  padding: 12px 14px;
  resize: vertical;
}

.materials-settings {
  border-top: 1px solid var(--materials-border);
  margin-top: 26px;
  padding-top: 20px;
}

.materials-toggle {
  margin-top: 14px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 16px;
  align-items: center;
}

.materials-toggle input {
  width: 42px;
  height: 24px;
  appearance: none;
  border: 0;
  border-radius: 999px;
  background: #d8deea;
  position: relative;
}

.materials-toggle input::before {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  transition: transform 0.2s ease;
}

.materials-toggle input:checked {
  background: var(--materials-primary);
}

.materials-toggle input:checked::before {
  transform: translateX(18px);
}

.materials-actions {
  border-top: 1px solid var(--materials-border);
  margin-top: 22px;
  padding-top: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.materials-actions > div {
  display: flex;
  align-items: center;
  gap: 12px;
}

.materials-editor-empty {
  border: 1px dashed #cfd6e7;
  border-radius: 10px;
  padding: 24px;
  background: #fbfcff;
  color: var(--materials-muted);
}

@media (max-width: 1280px) {
  .structure-layout {
    grid-template-columns: 1fr;
  }

  .structure-detail-panel {
    min-height: unset;
    position: static;
  }
}

@media (max-width: 1024px) {
  .section-edit-grid {
    grid-template-columns: 1fr;
  }
}
</style>
