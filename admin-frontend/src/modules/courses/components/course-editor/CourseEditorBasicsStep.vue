<template>
  <div class="step1-layout">
    <div class="step1-main">
      <div class="step1-section-header">
        <h2>Основная информация о курсе</h2>
        <p>Заполните базовые данные курса и загрузите обложку.</p>
      </div>

      <div class="step1-form-grid">
        <Input v-model="form.title" label="Название курса" placeholder="Введите название курса" :error="errors.title" required />
        <Select v-model="form.category" label="Категория" placeholder="Выберите категорию" :options="categoryOptions" />

        <div class="field-with-counter">
          <Textarea
            v-model="form.shortDescription"
            label="Краткое описание курса"
            placeholder="Опишите цель и содержание курса"
            :rows="2"
            :maxlength="200"
          />
          <span class="field-counter">{{ (form.shortDescription || "").length }}/200</span>
        </div>

        <TagsInput v-model="form.tags" label="Теги" placeholder="Введите тег и нажмите Enter..." />

        <Select v-model="form.difficulty" label="Уровень сложности" placeholder="Выберите уровень" :options="difficultyOptions" />
        <Select v-model="form.courseLanguage" label="Язык курса" placeholder="Выберите язык" :options="languageOptions" />
      </div>

      <div class="cover-upload-row">
        <input ref="coverFileInputRef" id="course-cover-file-input" type="file" accept="image/png,image/jpeg,image/webp" class="cover-file-input-hidden" @change="emit('cover-change', $event)" />
        <label
          class="cover-dropzone"
          for="course-cover-file-input"
          :class="{ 'cover-dropzone-hover': coverDragOver }"
          @dragover.prevent="emit('cover-drag-over', true)"
          @dragleave.prevent="emit('cover-drag-over', false)"
          @drop.prevent="emit('cover-drop', $event)"
        >
          <Upload class="cover-dropzone-icon" :size="32" :stroke-width="1.5" />
          <p>
            Перетащите файл сюда или
            <button type="button" class="cover-dropzone-link" @click.stop.prevent="emit('trigger-cover-file-input')">выберите файл</button>
          </p>
          <p class="cover-dropzone-hint">PNG, JPG или WEBP. Макс. размер 5 МБ</p>
        </label>
        <div v-if="form.coverUrl" class="cover-preview-box">
          <img :src="form.coverUrl" alt="Обложка курса" class="cover-preview-img" />
          <button type="button" class="cover-preview-remove" @mousedown.stop.prevent @click.stop.prevent="emit('remove-cover')">
            <Trash2 :size="16" :stroke-width="2" />
            Удалить
          </button>
        </div>
      </div>

      <WysiwygEditor
        v-model="form.description"
        label="Описание курса"
        placeholder="Подробное описание курса. Цели, задачи, результаты обучения..."
        :min-height="140"
        :show-counter="true"
        :max-length="2000"
      />
    </div>

    <div class="step1-sidebar">
      <div class="course-info-card">
        <h3 class="course-info-title">Информация о курсе</h3>
        <div class="course-info-row">
          <span class="course-info-label">Темы</span>
          <span class="course-info-value">{{ previewStats.themesCount }}</span>
        </div>
        <div class="course-info-row">
          <span class="course-info-label">Подтемы</span>
          <span class="course-info-value">{{ previewStats.subtopicsCount }}</span>
        </div>
        <div class="course-info-row">
          <span class="course-info-label">Материалы</span>
          <span class="course-info-value">{{ previewStats.materialsCount }}</span>
        </div>
        <div class="course-info-row">
          <span class="course-info-label">Тест для темы</span>
          <span class="course-info-value" :class="previewStats.sectionTestsCount > 0 ? 'course-info-ok' : 'course-info-empty'">
            {{ previewStats.sectionTestsCount > 0 ? previewStats.sectionTestsCount : "Не создан" }}
          </span>
        </div>
        <div class="course-info-row">
          <span class="course-info-label">Аттестация курса</span>
          <span class="course-info-value" :class="form.finalAssessmentId ? 'course-info-ok' : 'course-info-empty'">
            {{ form.finalAssessmentId ? "Настроена" : "Не настроена" }}
          </span>
        </div>
      </div>

      <div class="whats-next-card">
        <div class="whats-next-icon">
          <Info :size="18" :stroke-width="2" />
        </div>
        <div>
          <p class="whats-next-title">Что дальше?</p>
          <p class="whats-next-text">После сохранения курса вы сможете добавить темы, материалы и настроить проверку знаний.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Info, Trash2, Upload } from "lucide-vue-next";
import { Input, Select, TagsInput, Textarea, WysiwygEditor } from "@/components/ui";

const props = defineProps({
  form: { type: Object, required: true },
  errors: { type: Object, required: true },
  categoryOptions: { type: Array, required: true },
  difficultyOptions: { type: Array, required: true },
  languageOptions: { type: Array, required: true },
  previewStats: { type: Object, required: true },
  coverDragOver: { type: Boolean, required: true },
  coverFileInputRef: { type: Object, default: null },
});

const emit = defineEmits(["cover-change", "cover-drop", "cover-drag-over", "trigger-cover-file-input", "remove-cover"]);
</script>

<style scoped>
.step1-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 304px;
  gap: 18px;
  align-items: start;
}

.step1-main {
  background: var(--course-surface);
  border: 1px solid var(--course-border);
  border-radius: var(--course-radius-lg);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  box-shadow: var(--course-shadow);
}

.step1-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px 16px;
}

.step1-form-grid > .field-with-counter {
  margin-top: -2px;
}

.step1-section-header h2 {
  margin: 0 0 4px;
  font-size: 28px;
  line-height: 1.25;
  font-weight: 700;
  color: #111827;
}

.step1-section-header p {
  margin: 0;
  font-size: 14px;
  color: var(--course-text-muted);
}

.step1-main :deep(.input-label),
.step1-main :deep(.select-label),
.step1-main :deep(.textarea-label),
.step1-main :deep(.wysiwyg-label) {
  margin-bottom: 2px;
  font-size: 13px;
  font-weight: 600;
  color: #344054;
}

.step1-main :deep(.input),
.step1-main :deep(.select),
.step1-main :deep(.textarea),
.step1-main :deep(.wysiwyg-shell) {
  border: 1px solid var(--course-border);
  border-radius: var(--course-radius-md);
  background: #fff;
  color: var(--course-text);
  box-shadow: none;
}

.step1-main :deep(.input-md),
.step1-main :deep(.select-md),
.step1-main :deep(.textarea-md) {
  min-height: 42px;
  padding: 10px 14px;
  font-size: 14px;
}

.step1-main :deep(.input::placeholder),
.step1-main :deep(.textarea::placeholder),
.step1-main :deep(.select:invalid),
.step1-main :deep(.wysiwyg-content:empty::before) {
  color: var(--course-text-soft);
}

.step1-main :deep(.input:focus),
.step1-main :deep(.select:focus),
.step1-main :deep(.textarea:focus),
.step1-main :deep(.wysiwyg-shell-focused) {
  border-color: var(--course-accent);
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.12);
}

.field-with-counter {
  position: relative;
}

.field-counter {
  display: block;
  text-align: right;
  font-size: 12px;
  color: var(--course-text-soft);
  margin-top: 2px;
}

.cover-upload-row {
  display: flex;
  gap: 14px;
  align-items: stretch;
}

.cover-file-input-hidden {
  display: none;
}

.cover-dropzone {
  flex: 1;
  border: 1px dashed #d5dbee;
  border-radius: var(--course-radius-md);
  padding: 26px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  color: var(--course-text-muted);
}

.cover-dropzone:hover,
.cover-dropzone.cover-dropzone-hover {
  border-color: var(--course-accent);
  background: #f8f7ff;
}

.cover-dropzone-icon {
  width: 40px;
  height: 40px;
  opacity: 0.5;
}

.cover-dropzone p {
  margin: 0;
  font-size: 14px;
}

.cover-dropzone-link {
  color: var(--course-accent-strong);
  text-decoration: underline;
  cursor: pointer;
  border: none;
  background: transparent;
  font: inherit;
  padding: 0;
}

.cover-dropzone-hint {
  font-size: 12px;
  color: var(--course-text-soft);
}

.cover-preview-box {
  width: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.cover-preview-img {
  width: 100%;
  height: 140px;
  object-fit: contain;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid var(--course-border);
}

.cover-preview-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--course-border);
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  color: var(--course-text-muted);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.cover-preview-remove:hover {
  color: #ef4444;
  border-color: #ef444466;
}

.step1-sidebar {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.course-info-card {
  border: 1px solid var(--course-border);
  border-radius: var(--course-radius-lg);
  padding: 16px;
  background: #fff;
  box-shadow: var(--course-shadow);
}

.course-info-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
}

.course-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--course-border-soft);
  font-size: 14px;
}

.course-info-row:last-child {
  border-bottom: none;
}

.course-info-label {
  color: var(--course-text-muted);
}

.course-info-value {
  font-weight: 500;
}

.course-info-empty {
  color: var(--course-text-muted);
}

.course-info-ok {
  color: #22c55e;
}

.whats-next-card {
  display: flex;
  gap: 10px;
  background: #f7f5ff;
  border: 1px solid #e4ddff;
  border-radius: var(--course-radius-lg);
  padding: 14px;
  box-shadow: var(--course-shadow);
}

.whats-next-icon {
  color: var(--course-accent-strong);
  flex-shrink: 0;
  margin-top: 2px;
}

.whats-next-title {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 600;
  color: #3b2bb2;
}

.whats-next-text {
  margin: 0;
  font-size: 13px;
  color: #5b4bc7;
  line-height: 1.5;
}
</style>
