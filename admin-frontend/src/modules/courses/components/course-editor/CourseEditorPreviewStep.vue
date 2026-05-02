<template>
  <Card v-if="currentStep === previewStepId && isEditMode && course" class="preview-card">
    <div class="step-card-header">
      <h2>Шаг {{ previewStepId }}. Предпросмотр и публикация</h2>
      <p>Проверьте структуру курса, итоговую аттестацию и готовность к публикации.</p>
    </div>

    <div class="preview-layout">
      <div class="preview-content-layout">
        <aside class="preview-structure-panel">
          <h3 class="preview-panel-title">Структура курса</h3>
          <div v-if="previewSections.length === 0" class="preview-empty-state">В курсе пока нет тем и подтем.</div>
          <div v-else class="preview-structure-list">
            <div v-for="section in previewSections" :key="section.id" class="preview-structure-section">
              <div class="preview-section-title">{{ section.orderIndex }}. {{ section.title }}</div>
              <button
                v-for="topic in section.topics"
                :key="topic.id"
                type="button"
                class="preview-topic-item"
                :class="{ 'preview-topic-item-active': Number(activePreviewTopicId) === Number(topic.id) }"
                @click="emit('update:active-preview-topic-id', topic.id)"
              >
                <span>{{ section.orderIndex }}.{{ topic.orderIndex }} {{ topic.title }}</span>
              </button>
            </div>
          </div>
        </aside>

        <section class="preview-material-panel">
          <h3 class="preview-material-title">
            <template v-if="activePreviewTopicWithSection">
              {{ activePreviewTopicWithSection.sectionOrderIndex }}.{{ activePreviewTopicWithSection.topic.orderIndex }}
              {{ activePreviewTopicWithSection.topic.title }}
            </template>
            <template v-else>Материал темы</template>
          </h3>

          <div v-if="activePreviewTopicContent" class="preview-material-text" v-html="activePreviewTopicContent"></div>
          <div v-else class="preview-empty-state">Материал для выбранной подтемы пока не добавлен.</div>
        </section>
      </div>

      <aside class="preview-sidebar">
        <section class="preview-side-card">
          <h3 class="preview-side-title">Публикация курса</h3>
          <div class="preview-side-row">
            <span class="preview-side-label">Статус курса</span>
            <span class="preview-status-chip">{{ getStatusLabel(course.status) }}</span>
          </div>
          <div class="preview-info-note">Для публикации нажмите кнопку «Опубликовать» в шапке страницы.</div>
        </section>

        <section class="preview-side-card">
          <h3 class="preview-side-title">Готовность к публикации</h3>
          <p class="preview-ready-counter">{{ readyChecklistDone }} из {{ readyChecklistTotal }} выполнено</p>
          <div class="preview-ready-progress">
            <span :style="{ width: `${readyChecklistPercent}%` }"></span>
          </div>
          <ul class="preview-ready-list">
            <li v-for="item in publicationChecklist" :key="item.id" :class="{ 'preview-ready-item-done': item.done }">
              <span class="preview-ready-dot">{{ item.done ? "✓" : "•" }}</span>
              <span>{{ item.label }}</span>
            </li>
          </ul>

          <div v-if="publicationErrorsForDisplay.length > 0" class="publication-errors">
            <h3>Что нужно исправить перед публикацией</h3>
            <ul>
              <li v-for="(errorText, index) in publicationErrorsForDisplay" :key="`preview-${index}-${errorText}`">
                {{ errorText }}
              </li>
            </ul>
          </div>

          <div class="preview-info-note">После публикации вы сможете редактировать курс. Изменения будут сразу доступны обучающимся.</div>
        </section>
      </aside>
    </div>
  </Card>
</template>

<script setup>
import { Button, Card } from "@/components/ui";

defineProps({
  currentStep: { type: Number, required: true },
  previewStepId: { type: Number, required: true },
  isEditMode: { type: Boolean, required: true },
  course: { type: Object, default: null },
  previewSections: { type: Array, required: true },
  activePreviewTopicId: { type: [Number, String, null], default: null },
  activePreviewTopicWithSection: { type: Object, default: null },
  activePreviewTopicContent: { type: String, default: "" },
  getStatusLabel: { type: Function, required: true },
  publishing: { type: Boolean, required: true },
  publicationErrorsForDisplay: { type: Array, required: true },
  readyChecklistDone: { type: Number, required: true },
  readyChecklistTotal: { type: Number, required: true },
  readyChecklistPercent: { type: Number, required: true },
  publicationChecklist: { type: Array, required: true },
});

const emit = defineEmits(["publish", "update:active-preview-topic-id"]);
</script>

<style scoped>
.preview-card {
  margin-bottom: 20px;
}

.preview-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 14px;
}

.preview-content-layout {
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  gap: 14px;
}

.preview-sidebar {
  display: grid;
  gap: 12px;
  align-content: start;
}

.preview-side-card {
  border: 1px solid var(--divider);
  border-radius: 12px;
  background: #ffffff;
  padding: 14px;
  display: grid;
  gap: 12px;
}

.preview-side-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.preview-side-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 14px;
}

.preview-side-label {
  color: var(--text-secondary);
}

.preview-status-chip {
  border: 1px solid var(--divider);
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
}

.preview-info-note {
  border: 1px dashed var(--divider);
  border-radius: 10px;
  padding: 10px;
  background: #fafbff;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 20px;
}

.preview-ready-counter {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.preview-ready-progress {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: #eceff5;
  overflow: hidden;
}

.preview-ready-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #7f67ff 0%, #53c8ff 100%);
}

.preview-ready-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.preview-ready-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.preview-ready-dot {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #eef2f7;
  color: #9aa6c0;
  font-size: 12px;
  font-weight: 800;
  text-align: right;
}

.preview-ready-item-done .preview-ready-dot {
  background: #dcfce7;
  color: #15803d;
}

.preview-ready-item-done span:last-child {
  color: #2f3b59;
}

.preview-structure-panel,
.preview-material-panel {
  border: 1px solid var(--divider);
  border-radius: 12px;
  background: #ffffff;
  padding: 14px;
}

.preview-panel-title,
.preview-material-title {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.preview-structure-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-structure-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.preview-topic-item {
  width: 100%;
  border: 1px solid var(--divider);
  border-radius: 10px;
  background: #ffffff;
  text-align: left;
  font-size: 14px;
  line-height: 20px;
  color: var(--text-primary);
  padding: 10px 12px;
  cursor: pointer;
}

.preview-topic-item-active {
  border-color: #cfc7ff;
  background: #f7f5ff;
  color: #4c38d2;
}

.preview-material-text {
  color: #000000;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.preview-material-text :deep(h1),
.preview-material-text :deep(h2),
.preview-material-text :deep(h3),
.preview-material-text :deep(h4),
.preview-material-text :deep(h5),
.preview-material-text :deep(h6) {
  margin: 0 0 12px;
  line-height: 1.3;
  font-weight: 700;
}

.preview-material-text :deep(p) {
  margin: 0 0 12px;
}

.preview-material-text :deep(ul),
.preview-material-text :deep(ol) {
  padding-left: 1.6em;
  margin: 4px 0 12px;
  list-style-position: outside;
}

.preview-material-text :deep(li) {
  margin: 0 0 4px;
  text-indent: 0;
}

.preview-material-text :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}

.preview-material-text :deep(img),
.preview-material-text :deep(table),
.preview-material-text :deep(pre) {
  max-width: 100%;
}

.preview-material-text :deep(video),
.preview-material-text :deep(iframe) {
  display: block;
  max-width: 100%;
}

.preview-empty-state {
  border: 1px dashed var(--divider);
  border-radius: 10px;
  background: #fafbff;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 20px;
  padding: 16px;
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

@media (max-width: 1280px) {
  .preview-layout {
    grid-template-columns: 1fr;
  }

  .preview-content-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
