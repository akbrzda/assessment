<template>
  <div class="course-editor-view">
    <div class="course-editor-header">
      <div class="course-editor-header-left">
        <Button variant="ghost" icon="arrow-left" size="sm" @click="goBack">К списку курсов</Button>
      </div>
      <div class="course-editor-header-right">
        <Button v-if="currentStep < wizardSteps.length" :loading="saving" :disabled="!canProceed" @click="goToNextStep">Далее</Button>
        <Button v-else variant="secondary" :loading="saving" @click="saveFromHeader">Сохранить</Button>
      </div>
    </div>

    <Preloader v-if="loading" />

    <template v-else>
      <div class="course-stepper">
        <div
          v-for="(step, index) in wizardSteps"
          :key="step.id"
          class="stepper-item"
          :class="{
            'stepper-active': currentStep === step.id,
            'stepper-completed': currentStep > step.id,
          }"
          @click="goToStep(step.id)"
        >
          <div v-if="index > 0" class="stepper-connector"></div>
          <div class="stepper-bubble">
            <Check v-if="currentStep > step.id" :size="14" :stroke-width="2.5" />
            <span v-else>{{ step.id }}</span>
          </div>
          <div class="stepper-labels">
            <span class="stepper-title">{{ step.title }}</span>
            <span class="stepper-subtitle">{{ step.subtitle }}</span>
          </div>
        </div>
      </div>

      <div v-if="currentStep === 1" class="step1-layout">
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

            <Input
              v-model="form.tagsInput"
              label="Теги"
              placeholder="Введите тег и нажмите Enter"
              @keydown.enter.prevent="confirmTagInput"
              @keydown.comma.prevent="confirmTagInput"
            />

            <Select v-model="form.difficulty" label="Уровень сложности" placeholder="Выберите уровень" :options="difficultyOptions" />
            <Select v-model="form.courseLanguage" label="Язык курса" placeholder="Выберите язык" :options="languageOptions" />
          </div>

          <div class="cover-upload-row">
            <input
              ref="coverFileInputRef"
              id="course-cover-file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="cover-file-input-hidden"
              @change="handleCoverFileChange"
            />
            <label
              class="cover-dropzone"
              for="course-cover-file-input"
              :class="{ 'cover-dropzone-hover': coverDragOver }"
              @dragover.prevent="coverDragOver = true"
              @dragleave.prevent="coverDragOver = false"
              @drop.prevent="handleCoverDrop"
            >
              <Upload class="cover-dropzone-icon" :size="32" :stroke-width="1.5" />
              <p>
                Перетащите файл сюда или
                <button type="button" class="cover-dropzone-link" @click.stop.prevent="triggerCoverFileInput">выберите файл</button>
              </p>
              <p class="cover-dropzone-hint">PNG, JPG или WEBP. Макс. размер 5 МБ</p>
            </label>
            <div v-if="form.coverUrl" class="cover-preview-box">
              <img :src="form.coverUrl" alt="Обложка курса" class="cover-preview-img" />
              <button type="button" class="cover-preview-remove" @mousedown.stop.prevent @click.stop.prevent="removeCover">
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
            <Input v-model="structureSearchQuery" type="search" placeholder="Поиск по темам и подтемам" />
          </div>
          <button type="button" class="structure-secondary-action structure-secondary-action-disabled" disabled>
            <Upload :size="16" :stroke-width="1.8" />
            Импорт структуры
          </button>
          <button type="button" class="structure-primary-action" @click="showNewSectionForm = !showNewSectionForm">
            <span>+</span>
            Добавить тему
          </button>
        </div>

        <div class="structure-layout">
          <div class="structure-list-panel">
            <div v-if="!visibleSections.length" class="empty-sections">
              <p>Темы курса ещё не добавлены.</p>
            </div>

            <draggable
              v-else
              v-model="course.sections"
              item-key="id"
              handle=".section-drag-handle"
              class="structure-sections-list"
              @end="handleSectionsReorder"
            >
              <template #item="{ element: section }">
                <div
                  v-show="isSectionVisible(section)"
                  class="structure-section"
                  :class="{ 'structure-section-active': Number(activeSection?.id) === Number(section.id) }"
                >
                  <button type="button" class="structure-section-head" @click="selectSection(section.id)">
                    <span
                      v-if="(course.sections || []).length > 1"
                      class="structure-drag section-drag-handle"
                      title="Перетащите для изменения порядка"
                      >⠿</span
                    >
                    <span class="structure-section-number">{{ section.orderIndex }}</span>
                    <span class="structure-section-title">{{ section.title }}</span>
                    <span class="structure-section-count">{{ (section.topics || []).length }} подтемы</span>
                    <ChevronUp class="structure-chevron" :size="16" :stroke-width="2" />
                  </button>

                  <div v-if="Number(activeSection?.id) === Number(section.id)" class="structure-subtopics">
                    <draggable
                      v-if="section.topics?.length"
                      v-model="section.topics"
                      item-key="id"
                      handle=".topic-drag-handle"
                      class="structure-subtopics-list"
                      @end="() => handleTopicsReorder(section)"
                    >
                      <template #item="{ element: topic }">
                        <div class="structure-subtopic" :class="{ 'structure-subtopic-active': topicEditingId === topic.id }">
                          <div class="structure-subtopic-row" @click="toggleTopicEdit(topic.id)">
                            <span
                              v-if="(section.topics || []).length > 1"
                              class="structure-drag topic-drag-handle"
                              title="Перетащите для изменения порядка"
                              @click.stop
                              >⠿</span
                            >
                            <FileText class="structure-doc-icon" :size="16" :stroke-width="1.8" />
                            <span class="structure-subtopic-title">{{ section.orderIndex }}.{{ topic.orderIndex }} {{ topic.title }}</span>
                            <button type="button" class="structure-kebab" @click.stop="toggleTopicEdit(topic.id)"><MoreVertical :size="16" /></button>
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
                              <button
                                type="button"
                                class="structure-topic-save"
                                :disabled="updatingTopicId === topic.id"
                                @click="saveTopic(topic.id)"
                              >
                                Сохранить
                              </button>
                              <button
                                type="button"
                                class="structure-topic-delete"
                                :disabled="deletingTopicId === topic.id"
                                @click="removeTopic(topic.id, topic.title)"
                              >
                                Удалить
                              </button>
                              <button
                                v-if="topicForms[topic.id]?.hasMaterial"
                                type="button"
                                class="structure-topic-material"
                                @click="openMaterialEditor(topic.id)"
                              >
                                {{ topicForms[topic.id]?.content ? "Редактировать материал" : "Добавить материал" }}
                              </button>
                              <button
                                v-if="topicForms[topic.id]?.hasMaterial && !topicForms[topic.id]?.content"
                                type="button"
                                class="structure-topic-material"
                                style="display: none"
                              ></button>
                            </div>
                          </div>
                        </div>
                      </template>
                    </draggable>
                    <div v-else class="empty-topics">Подтем пока нет.</div>

                    <button type="button" class="structure-add-subtopic-trigger" @click="toggleNewTopicForm(section.id)">
                      <span>+</span>
                      Добавить подтему
                    </button>

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
                        <button
                          type="button"
                          class="structure-topic-save"
                          :disabled="creatingTopicSectionId === section.id"
                          @click="addTopic(section.id)"
                        >
                          Добавить подтему
                        </button>
                        <button type="button" class="structure-topic-cancel" @click="closeNewTopicForm">Отмена</button>
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
                <Button icon="plus" :loading="creatingSection" @click="addSection">Добавить тему</Button>
              </div>
            </div>

            <button type="button" class="structure-add-area" @click="showNewSectionForm = true">
              <span>+</span>
              Добавить тему
            </button>
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
                      @keydown.enter.prevent="saveSection(activeSection.id)"
                      @keydown.esc.prevent="toggleSectionEdit(activeSection.id)"
                    />
                  </template>
                  <template v-else>
                    <h3>{{ activeSection.orderIndex }}. {{ activeSection.title }}</h3>
                  </template>
                </div>
                <div class="structure-head-actions">
                  <button
                    v-if="sectionEditingId === activeSection.id"
                    type="button"
                    class="structure-save-button"
                    :disabled="updatingSectionId === activeSection.id"
                    @click="saveSection(activeSection.id)"
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    class="structure-edit-button"
                    :disabled="updatingSectionId === activeSection.id"
                    @click="toggleSectionEdit(activeSection.id)"
                  >
                    <Pencil class="structure-edit-icon" :size="16" :stroke-width="1.8" />
                    {{ sectionEditingId === activeSection.id ? "Отмена" : "Изменить" }}
                  </button>
                </div>
              </div>

              <label class="structure-field">
                <span>Краткое описание</span>
                <textarea
                  v-model="activeSectionForm.description"
                  maxlength="500"
                  placeholder="Базовые понятия о сервисе, его роли в ресторане и стандартах общения с гостями."
                ></textarea>
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

              <button
                type="button"
                class="structure-delete-button"
                :disabled="deletingSectionId === activeSection.id"
                @click="removeSection(activeSection.id, activeSection.title)"
              >
                <Trash2 :size="16" :stroke-width="1.8" />
                Удалить тему
              </button>
            </template>
          </aside>
        </div>
      </Card>
      <div v-if="showMaterialStep && currentStep === 3 && isEditMode && course" class="materials-step-card">
        <div class="materials-breadcrumbs">
          <button type="button" @click="closeMaterialEditor(2)">‹ Структура курса</button>
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
          <button type="button" class="materials-preview-button">
            <Eye :size="16" :stroke-width="1.8" />
            Предпросмотр для ученика
          </button>
        </div>

        <div class="materials-layout">
          <section class="materials-editor-panel" ref="materialEditorPanelRef">
            <div v-if="activeMaterialTopic && activeMaterialForm" class="materials-editor-card">
              <div class="materials-form">
                <div class="materials-content-field">
                  <WysiwygEditor
                    v-model="activeMaterialForm.content"
                    label="Содержание"
                    placeholder="Добавьте текст материала"
                    :min-height="260"
                    :show-counter="true"
                    :max-length="5000"
                  />
                </div>

                <div class="materials-tab-placeholder">
                  <strong>Видео через iframe</strong>
                  <p>Вставьте iframe-код плеера, если видео размещено на внешней платформе.</p>
                  <label class="materials-field">
                    <span>Iframe-код видео</span>
                    <textarea v-model="materialIframeDraft" placeholder='<iframe src="https://example.com/embed/video"></iframe>' rows="4"></textarea>
                  </label>
                  <button type="button" class="materials-secondary-button" @click="appendMaterialIframe">Добавить iframe</button>
                </div>

                <div class="materials-settings">
                  <h3>Дополнительные настройки</h3>
                  <label class="materials-toggle">
                    <span>Отображать материал как обязательный для изучения</span>
                    <input v-model="activeMaterialForm.isRequired" type="checkbox" />
                  </label>
                </div>

                <div class="materials-actions">
                  <button type="button" class="materials-delete-button" @click="clearActiveMaterialContent">
                    <Trash2 :size="16" :stroke-width="1.8" />
                    Удалить материал
                  </button>
                  <div>
                    <button type="button" class="materials-cancel-button" @click="closeMaterialEditor(2)">Отмена</button>
                    <button
                      type="button"
                      class="materials-save-button"
                      :disabled="updatingTopicId === activeMaterialTopic.id"
                      @click="saveMaterialTopic"
                    >
                      Сохранить изменения
                    </button>
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

      <Card v-if="currentStep === testsStepId && isEditMode && course" class="editor-card topic-tests-card" padding="none">
        <div class="step-card-header step-card-header-tight">
          <div>
            <h2>Шаг {{ testsStepId }}. Тест для темы</h2>
            <p>Создайте отдельный тест для каждой темы курса и настройте его параметры по новому сценарию.</p>
          </div>
        </div>

        <CourseSectionTestsStep ref="sectionTestsStepRef" :course="course" @course-updated="handleCourseUpdatedFromTestsStep" />
      </Card>

      <CourseFinalAssessmentStep
        v-if="currentStep === finalAssessmentStepId && isEditMode && course"
        ref="finalAssessmentStepRef"
        :course="course"
        @assessment-saved="handleFinalAssessmentSaved"
        @course-updated="handleCourseUpdatedFromFinalStep"
      />

      <Card v-if="false && currentStep === finalAssessmentStepId && isEditMode && course" class="editor-card final-assessment-card">
        <div class="step-card-header">
          <h2>Шаг {{ finalAssessmentStepId }}. Аттестация курса</h2>
          <p>Назначьте обязательную итоговую аттестацию курса и сохраните настройки.</p>
        </div>

        <div class="editor-grid">
          <Select v-model="form.finalAssessmentId" label="Итоговая аттестация курса" :options="assessmentOptions" placeholder="Выберите аттестацию" />
          <div class="inline-actions">
            <Button size="sm" variant="secondary" @click="openAssessmentEditor({ type: 'final' })">Создать итоговую аттестацию</Button>
            <Button
              size="sm"
              variant="ghost"
              :disabled="!form.finalAssessmentId"
              @click="openAssessmentEditor({ type: 'final' }, form.finalAssessmentId)"
            >
              Редактировать
            </Button>
          </div>
          <div class="status-summary">
            <span class="status-summary-label">Текущий выбор</span>
            <strong>{{ selectedFinalAssessmentLabel }}</strong>
            <p class="status-summary-text">На следующем этапе будет показан итоговый предпросмотр курса перед публикацией.</p>
          </div>
        </div>

        <div v-if="!form.finalAssessmentId" class="publication-errors">
          <h3>Что нужно исправить</h3>
          <ul>
            <li>Выберите итоговую аттестацию курса.</li>
          </ul>
        </div>
      </Card>

      <Card v-if="currentStep === previewStepId && isEditMode && course" class="preview-card">
        <div class="step-card-header">
          <h2>Шаг {{ previewStepId }}. Предпросмотр и публикация</h2>
          <p>Проверьте структуру курса, итоговую аттестацию и готовность к публикации.</p>
        </div>

        <div class="preview-grid">
          <div class="preview-item">
            <span class="preview-label">Название</span>
            <strong>{{ form.title || "—" }}</strong>
          </div>
          <div class="preview-item">
            <span class="preview-label">Статус</span>
            <strong>{{ getStatusLabel(course.status) }}</strong>
          </div>
          <div class="preview-item">
            <span class="preview-label">Категория</span>
            <strong>{{ form.category || "—" }}</strong>
          </div>
          <div class="preview-item">
            <span class="preview-label">Теги</span>
            <strong>{{ form.tagsInput || "—" }}</strong>
          </div>
          <div class="preview-item">
            <span class="preview-label">Тем курса</span>
            <strong>{{ previewStats.themesCount }}</strong>
          </div>
          <div class="preview-item">
            <span class="preview-label">Подтем</span>
            <strong>{{ previewStats.subtopicsCount }}</strong>
          </div>
          <div class="preview-item">
            <span class="preview-label">Материалов</span>
            <strong>{{ previewStats.materialsCount }}</strong>
          </div>
          <div class="preview-item">
            <span class="preview-label">Итоговая аттестация</span>
            <strong>{{ selectedFinalAssessmentLabel }}</strong>
          </div>
        </div>

        <div v-if="publicationErrorsForDisplay.length > 0" class="publication-errors">
          <h3>Что нужно исправить перед публикацией</h3>
          <ul>
            <li v-for="(errorText, index) in publicationErrorsForDisplay" :key="`preview-${index}-${errorText}`">
              {{ errorText }}
            </li>
          </ul>
        </div>

        <div v-if="previewWarnings.length > 0" class="publication-warnings">
          <h3>Предупреждения о влиянии изменений</h3>
          <ul>
            <li v-for="(warning, index) in previewWarnings" :key="`preview-warning-${index}`">
              {{ warning }}
            </li>
          </ul>
        </div>
      </Card>

      <!-- Блок назначения курса -->
      <Card v-if="currentStep === 1 && isEditMode && course" class="assignments-card">
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

        <div class="manual-assignments">
          <h3>Ручные назначения</h3>

          <div class="add-assignment">
            <Input v-model="newAssignmentUserId" label="ID пользователя" type="number" min="1" placeholder="Введите ID" />
            <Input v-model="newAssignmentDeadlineAt" label="Индивидуальный дедлайн" type="datetime-local" />
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
                <th>Дедлайн</th>
                <th>Статус</th>
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
                <td>{{ formatAssignedAt(a.deadlineAt) }}</td>
                <td>{{ a.status === "closed" ? "Закрыт" : "Активен" }}</td>
                <td>
                  <Button
                    v-if="a.status !== 'closed'"
                    size="sm"
                    variant="secondary"
                    icon="archive"
                    :loading="closingAssignmentUserId === a.userId"
                    @click="handleCloseAssignment(a.userId)"
                  />
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
      <Card v-if="currentStep === previewStepId && isEditMode && course" class="participants-card">
        <div class="participants-header">
          <h2>Участники</h2>
          <p>Отчет по прогрессу пользователей внутри курса.</p>
          <Button size="sm" variant="ghost" icon="refresh-ccw" :loading="loadingParticipants" @click="loadParticipants">Обновить</Button>
        </div>

        <div v-if="participantsReportSummary" class="participants-summary-grid">
          <div class="participants-summary-item">
            <span>Назначено</span>
            <strong>{{ participantsReportSummary.totalUsers }}</strong>
          </div>
          <div class="participants-summary-item">
            <span>Начали</span>
            <strong>{{ participantsReportSummary.startedCount }}</strong>
          </div>
          <div class="participants-summary-item">
            <span>Проходят</span>
            <strong>{{ participantsReportSummary.inProgressCount }}</strong>
          </div>
          <div class="participants-summary-item">
            <span>Завершили</span>
            <strong>{{ participantsReportSummary.completedCount }}</strong>
          </div>
          <div class="participants-summary-item">
            <span>Попытки тестов тем</span>
            <strong>{{ participantsReportSummary.sectionTestsAttemptsCount }}</strong>
          </div>
          <div class="participants-summary-item">
            <span>Попытки итоговой</span>
            <strong>{{ participantsReportSummary.finalAssessmentAttemptsCount }}</strong>
          </div>
          <div class="participants-summary-item">
            <span>Ср. балл курса</span>
            <strong>{{ participantsReportSummary.avgCourseScore }}%</strong>
          </div>
          <div class="participants-summary-item">
            <span>Ср. балл итоговой</span>
            <strong>{{ participantsReportSummary.avgFinalScore }}%</strong>
          </div>
          <div class="participants-summary-item">
            <span>Суммарное время</span>
            <strong>{{ formatDuration(participantsReportSummary.totalTimeSpentSeconds) }}</strong>
          </div>
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
              <th>Попытки тем</th>
              <th>Попытки итоговой</th>
              <th>Ср. балл курса</th>
              <th>Ср. балл итоговой</th>
              <th>Время</th>
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
              <td>{{ p.sectionTestsAttemptsCount || 0 }}</td>
              <td>{{ p.finalAssessmentAttemptsCount || 0 }}</td>
              <td>{{ p.avgCourseScore || 0 }}%</td>
              <td>{{ p.avgFinalScore || 0 }}%</td>
              <td>{{ formatDuration(p.totalTimeSpentSeconds) }}</td>
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
              <span v-if="!section.isRequired" class="section-badge-optional">необязательная</span>
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
    <Modal v-model="assessmentEditorOpen" size="xl" :title="assessmentEditorTitle">
      <AssessmentForm :assessment-id="assessmentEditorAssessmentId" @submit="handleAssessmentEditorSubmit" @cancel="assessmentEditorOpen = false" />
    </Modal>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import draggable from "vuedraggable";
import { Check, ChevronUp, Eye, FileText, GripVertical, Info, MoreVertical, Pencil, Search, Trash2, Upload, X } from "lucide-vue-next";
import { Badge, Button, Card, Input, Modal, Preloader, Select, Textarea, WysiwygEditor } from "../components/ui";
import AssessmentForm from "../components/AssessmentForm.vue";
import CourseFinalAssessmentStep from "../components/CourseFinalAssessmentStep.vue";
import CourseSectionTestsStep from "../components/CourseSectionTestsStep.vue";
import {
  archiveCourse,
  createCourse,
  createCourseSection,
  updateCourseSection,
  reorderCourseSections,
  deleteCourseSection,
  createCourseTopic,
  updateCourseTopic,
  reorderCourseTopics,
  deleteCourseTopic,
  getCourseById,
  getCoursePreview,
  publishCourse,
  uploadCourseCover,
  updateCourse,
  getCourseTargets,
  updateCourseTargets,
  getCourseAssignments,
  addCourseAssignment,
  closeCourseAssignment,
  removeCourseAssignment,
  getCourseUsers,
  getCourseProgressReport,
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
const uploadingCover = ref(false);
const selectedCoverFile = ref(null);
const localCoverPreviewUrl = ref("");
const previewWarnings = ref([]);
const tempIdCounter = ref(-1);

const sectionForms = ref({});
const sectionErrors = ref({});
const sectionEditingId = ref(null);
const updatingSectionId = ref(null);
const deletingSectionId = ref(null);
const creatingSection = ref(false);
const newSection = ref({ title: "", assessmentId: "", isRequired: true, estimatedMinutes: "", description: "" });
const newSectionErrors = ref({ title: "" });

const topicForms = ref({});
const topicErrors = ref({});
const topicEditingId = ref(null);
const updatingTopicId = ref(null);
const deletingTopicId = ref(null);
const newTopics = ref({});
const newTopicErrors = ref({});
const creatingTopicSectionId = ref(null);
const reorderingSections = ref(false);
const reorderingTopicSectionId = ref(null);
const selectedStructureSectionId = ref(null);
const structureSearchQuery = ref("");
const newTopicFormSectionId = ref(null);
const showNewSectionForm = ref(false);
const showMaterialStep = ref(false);
const activeMaterialTopicId = ref(null);
const materialIframeDraft = ref("");
const materialEditorPanelRef = ref(null);

const form = ref({
  title: "",
  shortDescription: "",
  description: "",
  difficulty: "",
  courseLanguage: "ru",
  coverUrl: "",
  category: "",
  tagsInput: "",
  finalAssessmentId: "",
  availabilityMode: "unlimited",
  availabilityDays: "",
  availabilityFrom: "",
  availabilityTo: "",
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
const assignments = ref([]);
const newAssignmentUserId = ref("");
const newAssignmentDeadlineAt = ref("");
const addingAssignment = ref(false);
const removingAssignmentUserId = ref(null);
const closingAssignmentUserId = ref(null);

const participants = ref([]);
const participantsReportSummary = ref(null);
const loadingParticipants = ref(false);
const resettingProgressUserId = ref(null);
const viewingProgressUserId = ref(null);
const selectedUserProgress = ref(null);
const selectedUserName = ref("");
const assessmentEditorOpen = ref(false);
const sectionTestsStepRef = ref(null);
const finalAssessmentStepRef = ref(null);

const coverDragOver = ref(false);

const coverFileInputRef = ref(null);

const difficultyOptions = [
  { value: "beginner", label: "Начальный" },
  { value: "intermediate", label: "Средний" },
  { value: "advanced", label: "Продвинутый" },
];

const languageOptions = [{ value: "ru", label: "Русский" }];

const categoryOptions = [
  { value: "service", label: "Сервис" },
  { value: "standards", label: "Стандарты" },
  { value: "safety", label: "Безопасность" },
  { value: "management", label: "Управление" },
  { value: "other", label: "Другое" },
];

const parsedTags = computed(() => {
  return String(form.value.tagsInput || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
});

const confirmTagInput = () => {
  // теги сохраняются как строка через запятую
};

const removeTag = (index) => {
  const tags = parsedTags.value.filter((_, i) => i !== index);
  form.value.tagsInput = tags.join(", ");
};

const setLocalCoverPreview = (file) => {
  if (localCoverPreviewUrl.value) {
    URL.revokeObjectURL(localCoverPreviewUrl.value);
  }
  localCoverPreviewUrl.value = URL.createObjectURL(file);
  form.value.coverUrl = localCoverPreviewUrl.value;
};

const clearLocalCoverPreview = () => {
  if (localCoverPreviewUrl.value) {
    URL.revokeObjectURL(localCoverPreviewUrl.value);
    localCoverPreviewUrl.value = "";
  }
};

const triggerCoverFileInput = () => {
  coverFileInputRef.value?.click();
};

const handleCoverDrop = (event) => {
  coverDragOver.value = false;
  const file = event.dataTransfer?.files?.[0] || null;
  if (file) {
    selectedCoverFile.value = file;
    setLocalCoverPreview(file);
  }
};

const removeCover = () => {
  clearLocalCoverPreview();
  form.value.coverUrl = "";
  selectedCoverFile.value = null;
  if (coverFileInputRef.value) {
    coverFileInputRef.value.value = "";
  }
};

const saveFromHeader = async () => {
  if (currentStep.value === finalAssessmentStepId.value && finalAssessmentStepRef.value?.savePendingChanges) {
    await finalAssessmentStepRef.value.savePendingChanges();
    return;
  }
  await saveCourse();
};
const assessmentEditorAssessmentId = ref(null);
const assessmentEditorTarget = ref(null);
const assessmentEditorTitle = ref("Аттестация");

const isEditMode = computed(() => {
  return Number.isInteger(Number(route.params.id)) && Number(route.params.id) > 0;
});

const courseId = computed(() => Number(route.params.id));

const publicationErrors = computed(() => {
  return course.value?.publication?.errors || [];
});

const visibleSections = computed(() => {
  const sections = course.value?.sections || [];
  const query = structureSearchQuery.value.trim().toLowerCase();
  if (!query) return sections;

  return sections.filter((section) => {
    const sectionTitle = String(section.title || "").toLowerCase();
    const hasMatchingTopic = (section.topics || []).some((topic) =>
      String(topic.title || "")
        .toLowerCase()
        .includes(query),
    );
    return sectionTitle.includes(query) || hasMatchingTopic;
  });
});

const activeSection = computed(() => {
  const sections = visibleSections.value;
  if (!sections.length) return null;
  return sections.find((section) => Number(section.id) === Number(selectedStructureSectionId.value)) || sections[0];
});

const activeSectionForm = computed(() => {
  return activeSection.value ? sectionForms.value[activeSection.value.id] : null;
});

const currentStep = ref(1);
const testsStepId = computed(() => (showMaterialStep.value ? 4 : 3));
const finalAssessmentStepId = computed(() => (showMaterialStep.value ? 5 : 4));
const previewStepId = computed(() => (showMaterialStep.value ? 6 : 5));
const wizardSteps = computed(() => [
  { id: 1, title: "Основная информация", subtitle: "Базовые данные курса" },
  { id: 2, title: "Структура курса", subtitle: "Темы и подтемы" },
  ...(showMaterialStep.value ? [{ id: 3, title: "Добавление материалов", subtitle: "Наполните подтему материалами" }] : []),
  { id: testsStepId.value, title: "Тест для темы", subtitle: "Создайте тест для темы" },
  { id: finalAssessmentStepId.value, title: "Аттестация курса", subtitle: "Итоговая аттестация" },
  { id: previewStepId.value, title: "Предпросмотр", subtitle: "Проверка и публикация" },
]);
const canProceed = computed(() => {
  if (currentStep.value === 1) {
    return Boolean(form.value.title?.trim());
  }
  if (currentStep.value === finalAssessmentStepId.value) {
    return true;
  }
  return true;
});

const publicationErrorsForDisplay = computed(() => publicationErrors.value.map((item) => formatPublicationError(item)));
const selectedFinalAssessmentLabel = computed(() => {
  const currentValue = String(form.value.finalAssessmentId || "");
  const option = assessmentOptions.value.find((item) => item.value === currentValue);
  return option?.label || "Не выбрана";
});
const materialTopics = computed(() => {
  const sections = course.value?.sections || [];
  return sections.flatMap((section) =>
    (section.topics || [])
      .filter((topic) => topic.hasMaterial)
      .map((topic) => ({
        ...topic,
        sectionId: section.id,
        sectionTitle: section.title,
        sectionOrder: section.orderIndex,
      })),
  );
});
const activeMaterialTopic = computed(() => {
  const topics = materialTopics.value;
  if (!topics.length) return null;
  return topics.find((topic) => Number(topic.id) === Number(activeMaterialTopicId.value)) || topics[0];
});
const activeMaterialSection = computed(() => {
  if (!activeMaterialTopic.value) return null;
  return (course.value?.sections || []).find((section) => Number(section.id) === Number(activeMaterialTopic.value.sectionId)) || null;
});
const activeMaterialForm = computed(() => {
  const topicId = activeMaterialTopic.value?.id;
  return topicId ? topicForms.value[topicId] || null : null;
});
const activeMaterialTopicTitle = computed(() => activeMaterialTopic.value?.title || "Выберите подтему");
const materialPreviewText = computed(() => {
  const text = stripHtml(activeMaterialForm.value?.content || "");
  return text ? `${text.slice(0, 116)}${text.length > 116 ? "..." : ""}` : "Материал пока не заполнен.";
});
const activeMaterialBlocks = computed(() => {
  const hasContent = Boolean(stripHtml(activeMaterialForm.value?.content || ""));
  return [
    {
      id: "text",
      title: hasContent ? "Текстовый материал" : "Материал не добавлен",
      subtitle: hasContent ? "Текст, ссылки, фото, видео и iframe" : "Заполните содержание материала",
      icon: hasContent ? "T" : "+",
      filled: hasContent,
    },
  ];
});

const assessmentTypeLabel = (type) => {
  const labels = {
    section: "теста темы курса",
    newSection: "теста темы курса",
    final: "итоговой аттестации",
  };
  return labels[type] || "аттестации";
};
const previewStats = computed(() => {
  const themes = course.value?.sections || [];
  return {
    themesCount: themes.length,
    requiredThemesCount: themes.filter((item) => item.isRequired).length,
    subtopicsCount: themes.reduce((total, item) => total + (item.topics?.length || 0), 0),
    materialsCount: themes.reduce((total, section) => total + (section.topics || []).filter((t) => t.hasMaterial).length, 0),
    sectionTestsCount: themes.filter((item) => item.assessmentId).length,
  };
});

const getStatusLabel = (status) => {
  const labels = {
    published: "Опубликован",
    archived: "Закрыт",
  };
  return labels[status] || status;
};

const getStatusVariant = (status) => {
  const variants = {
    published: "success",
    archived: "default",
  };
  return variants[status] || "default";
};

const getErrorMessage = (error, fallbackText) => {
  return error?.response?.data?.error || fallbackText;
};

function formatPublicationError(text) {
  return String(text || "")
    .replace("минимум один раздел", "минимум одна тема курса")
    .replaceAll('Раздел "', 'Тема курса "')
    .replaceAll('раздел "', 'тема курса "')
    .replaceAll("не назначен тест раздела", "не назначен проверочный тест темы курса")
    .replaceAll("тест раздела не найден", "проверочный тест темы курса не найден")
    .replaceAll("должна быть хотя бы одна тема", "должна содержать хотя бы одну подтему")
    .replaceAll(', тема "', ', подтема "');
}

const sanitizeOptionalNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseTags = (value) => {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
};

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMaterialTitle(content) {
  const match = String(content || "").match(/<h1[^>]*data-material-title=["']true["'][^>]*>([\s\S]*?)<\/h1>/i);
  return match ? stripHtml(match[1]) : "";
}

function stripMaterialTitle(content) {
  return String(content || "")
    .replace(/<h1[^>]*data-material-title=["']true["'][^>]*>[\s\S]*?<\/h1>/i, "")
    .trim();
}

function escapeMaterialTitle(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildMaterialContent(materialTitle, content) {
  const cleanContent = stripMaterialTitle(content || "");
  const cleanTitle = String(materialTitle || "").trim();
  if (!cleanTitle) {
    return cleanContent;
  }
  return `<h1 data-material-title="true">${escapeMaterialTitle(cleanTitle)}</h1>${cleanContent}`;
}

const getNextTempId = () => {
  tempIdCounter.value -= 1;
  return tempIdCounter.value;
};

const toLocalDateTimeInput = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
};

const syncSectionForms = (sections = []) => {
  const nextForms = {};
  const nextTopicForms = {};
  const nextNewTopics = {};
  for (const section of sections) {
    nextForms[section.id] = {
      title: section.title || "",
      description: section.description || "",
      assessmentId: section.assessmentId ? String(section.assessmentId) : "",
      isRequired: Boolean(section.isRequired),
      estimatedMinutes: section.estimatedMinutes ? String(section.estimatedMinutes) : "",
    };
    for (const topic of section.topics || []) {
      nextTopicForms[topic.id] = {
        title: topic.title || "",
        isRequired: topic.isRequired !== false,
        hasMaterial: Boolean(topic.hasMaterial),
        content: topic.content || "",
      };
    }
    nextNewTopics[section.id] = newTopics.value[section.id] || {
      title: "",
      isRequired: true,
      hasMaterial: true,
      content: "",
    };
  }
  sectionForms.value = nextForms;
  sectionErrors.value = {};
  topicForms.value = nextTopicForms;
  topicErrors.value = {};
  newTopics.value = nextNewTopics;
  if (newTopicFormSectionId.value && !sections.some((section) => Number(section.id) === Number(newTopicFormSectionId.value))) {
    newTopicFormSectionId.value = null;
  }
  if (!selectedStructureSectionId.value && sections[0]) {
    selectedStructureSectionId.value = sections[0].id;
  }
  const materialTopicIds = sections.flatMap((section) =>
    (section.topics || []).filter((topic) => topic.hasMaterial).map((topic) => Number(topic.id)),
  );
  if (!materialTopicIds.includes(Number(activeMaterialTopicId.value))) {
    activeMaterialTopicId.value = materialTopicIds[0] || null;
  }
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
  clearLocalCoverPreview();
  form.value = {
    title: courseItem.title || "",
    shortDescription: courseItem.shortDescription || "",
    description: courseItem.description || "",
    difficulty: courseItem.difficulty || "",
    courseLanguage: courseItem.courseLanguage || "ru",
    coverUrl: courseItem.coverUrl || "",
    category: courseItem.category || "",
    tagsInput: Array.isArray(courseItem.tags) ? courseItem.tags.join(", ") : "",
    finalAssessmentId: courseItem.finalAssessmentId ? String(courseItem.finalAssessmentId) : "",
    availabilityMode: courseItem.availabilityMode || "unlimited",
    availabilityDays: courseItem.availabilityDays ? String(courseItem.availabilityDays) : "",
    availabilityFrom: toLocalDateTimeInput(courseItem.availabilityFrom),
    availabilityTo: toLocalDateTimeInput(courseItem.availabilityTo),
  };
};

const loadCourse = async () => {
  if (!isEditMode.value) {
    course.value = null;
    previewWarnings.value = [];
    clearLocalCoverPreview();
    form.value = {
      title: "",
      shortDescription: "",
      description: "",
      difficulty: "",
      courseLanguage: "ru",
      coverUrl: "",
      category: "",
      tagsInput: "",
      finalAssessmentId: "",
      availabilityMode: "unlimited",
      availabilityDays: "",
      availabilityFrom: "",
      availabilityTo: "",
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
    syncSectionForms(courseResponse.course.sections || []);

    selectedPositionIds.value = (targetsResponse.positions || []).map((p) => p.id);
    selectedBranchIds.value = (targetsResponse.branches || []).map((b) => b.id);
    assignments.value = assignmentsResponse.assignments || [];
    await loadPreview();
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

  if (form.value.availabilityMode === "relative_days" && !sanitizeOptionalNumber(form.value.availabilityDays)) {
    showToast("Для режима в днях укажите количество дней", "error");
    return false;
  }
  if (form.value.availabilityMode === "fixed_dates") {
    if (!form.value.availabilityFrom || !form.value.availabilityTo) {
      showToast("Для фиксированных дат заполните начало и окончание срока", "error");
      return false;
    }
    if (new Date(form.value.availabilityFrom).getTime() > new Date(form.value.availabilityTo).getTime()) {
      showToast("Дата начала не может быть позже даты окончания", "error");
      return false;
    }
  }

  return true;
};

const normalizeLocalStructure = () => {
  if (!course.value?.sections) return;
  course.value.sections.forEach((section, sectionIndex) => {
    section.orderIndex = sectionIndex + 1;
    if (!Array.isArray(section.topics)) {
      section.topics = [];
    }
    section.topics.forEach((topic, topicIndex) => {
      topic.orderIndex = topicIndex + 1;
    });
  });
};

const loadPreview = async () => {
  if (!isEditMode.value || !course.value) {
    previewWarnings.value = [];
    return;
  }
  try {
    const response = await getCoursePreview(courseId.value);
    previewWarnings.value = Array.isArray(response?.warnings) ? response.warnings : [];
    if (course.value) {
      course.value.publication = response?.publication || { valid: true, errors: [] };
    }
  } catch {
    previewWarnings.value = [];
  }
};

const handleCourseUpdatedFromTestsStep = (nextCourse) => {
  if (!nextCourse) {
    return;
  }
  course.value = nextCourse;
  syncSectionForms(nextCourse.sections || []);
};

const handleCourseUpdatedFromFinalStep = (nextCourse) => {
  if (!nextCourse) {
    return;
  }
  course.value = nextCourse;
  form.value.finalAssessmentId = nextCourse.finalAssessmentId ? String(nextCourse.finalAssessmentId) : "";
  syncSectionForms(nextCourse.sections || []);
};

const handleFinalAssessmentSaved = (assessmentId) => {
  form.value.finalAssessmentId = assessmentId ? String(assessmentId) : "";
};

const handleCoverFileChange = (event) => {
  const file = event?.target?.files?.[0] || null;
  if (!file) return;
  selectedCoverFile.value = file;
  setLocalCoverPreview(file);
  if (event?.target) {
    event.target.value = "";
  }
};

const handleCoverUpload = async (overrideCourseId = null, silent = false) => {
  const id = Number(overrideCourseId || courseId.value);
  if (!id) {
    return false;
  }
  if (!selectedCoverFile.value) {
    return true;
  }

  uploadingCover.value = true;
  try {
    const response = await uploadCourseCover(id, selectedCoverFile.value);
    const nextCoverUrl = response?.coverUrl || response?.course?.coverUrl || null;
    if (nextCoverUrl) {
      form.value.coverUrl = nextCoverUrl;
      if (course.value) {
        course.value.coverUrl = nextCoverUrl;
      }
    }
    clearLocalCoverPreview();
    selectedCoverFile.value = null;
    if (!silent) {
      showToast("Обложка курса загружена", "success");
    }
    return true;
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось загрузить обложку"), "error");
    return false;
  } finally {
    uploadingCover.value = false;
  }
};

const saveCourse = async () => {
  if (!validateCourse()) {
    return false;
  }

  const payload = {
    title: form.value.title.trim(),
    description: form.value.description.trim(),
    category: form.value.category.trim() || null,
    tags: parseTags(form.value.tagsInput),
    finalAssessmentId: sanitizeOptionalNumber(form.value.finalAssessmentId),
    availabilityMode: form.value.availabilityMode || "unlimited",
    availabilityDays: form.value.availabilityMode === "relative_days" ? sanitizeOptionalNumber(form.value.availabilityDays) : null,
    availabilityFrom:
      form.value.availabilityMode === "fixed_dates" && form.value.availabilityFrom ? new Date(form.value.availabilityFrom).toISOString() : null,
    availabilityTo:
      form.value.availabilityMode === "fixed_dates" && form.value.availabilityTo ? new Date(form.value.availabilityTo).toISOString() : null,
  };

  saving.value = true;
  try {
    const isEdit = isEditMode.value;
    let savedCourseId = isEditMode.value ? courseId.value : null;

    if (isEditMode.value) {
      const response = await updateCourse(courseId.value, payload);
      course.value = {
        ...course.value,
        ...response.course,
      };
      savedCourseId = response?.course?.id || courseId.value;
    } else {
      const response = await createCourse(payload);
      savedCourseId = response?.course?.id || null;
      await router.replace(`/courses/${response.course.id}/edit`);
    }

    if (savedCourseId) {
      const targetsSaved = await saveTargets(savedCourseId, true);
      if (!targetsSaved) {
        return false;
      }

      const coverSaved = await handleCoverUpload(savedCourseId, true);
      if (!coverSaved) {
        return false;
      }
    }

    showToast(isEdit ? "Курс обновлен" : "Курс создан", "success");

    // Не показываем полный прелоадер при редактировании: это выглядит как перезагрузка страницы.
    if (isEdit) {
      await loadPreview();
      if (currentStep.value === previewStepId.value) {
        await loadParticipants();
      }
    } else {
      await loadCourse();
    }

    return true;
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось сохранить курс"), "error");
    return false;
  } finally {
    saving.value = false;
  }
};

const goToStep = async (stepId) => {
  if (stepId === currentStep.value) return;
  if (currentStep.value === testsStepId.value && sectionTestsStepRef.value?.savePendingChanges) {
    const saved = await sectionTestsStepRef.value.savePendingChanges();
    if (!saved) {
      return;
    }
  }
  if (currentStep.value === finalAssessmentStepId.value && finalAssessmentStepRef.value?.savePendingChanges) {
    const saved = await finalAssessmentStepRef.value.savePendingChanges();
    if (!saved) {
      return;
    }
  }
  if (showMaterialStep.value && currentStep.value === 3 && stepId !== 3) {
    showMaterialStep.value = false;
    currentStep.value = stepId > 3 ? stepId - 1 : stepId;
    return;
  }
  currentStep.value = stepId;
};

const goToPrevStep = () => {
  if (showMaterialStep.value && currentStep.value === 3) {
    closeMaterialEditor(2);
    return;
  }
  if (currentStep.value > 1) {
    currentStep.value -= 1;
  }
};

const goToNextStep = async () => {
  if (showMaterialStep.value && currentStep.value === 3) {
    showMaterialStep.value = false;
    currentStep.value = 3;
    return;
  }
  if (currentStep.value === testsStepId.value && sectionTestsStepRef.value?.savePendingChanges) {
    const saved = await sectionTestsStepRef.value.savePendingChanges();
    if (!saved) {
      return;
    }
  }
  if (currentStep.value === finalAssessmentStepId.value && finalAssessmentStepRef.value?.savePendingChanges) {
    const saved = await finalAssessmentStepRef.value.savePendingChanges();
    if (!saved) {
      return;
    }
  }
  if (currentStep.value < wizardSteps.value.length) {
    currentStep.value += 1;
  }
};

const openAssessmentEditor = (target, assessmentId = null) => {
  if (!target?.type) return;
  assessmentEditorTarget.value = target;
  assessmentEditorAssessmentId.value = assessmentId ? Number(assessmentId) : null;
  assessmentEditorTitle.value = assessmentEditorAssessmentId.value
    ? `Редактирование ${assessmentTypeLabel(target.type)}`
    : `Создание ${assessmentTypeLabel(target.type)}`;
  assessmentEditorOpen.value = true;
};

const handleAssessmentEditorSubmit = async ({ assessmentId } = {}) => {
  if (!assessmentId) {
    showToast("Не удалось определить ID аттестации", "error");
    return;
  }

  await loadAssessments();

  const nextId = String(assessmentId);
  const target = assessmentEditorTarget.value;

  if (!target?.type) {
    assessmentEditorOpen.value = false;
    return;
  }

  if (target.type === "section" && target.id && sectionForms.value[target.id]) {
    sectionForms.value[target.id].assessmentId = nextId;
    await saveSection(target.id);
  } else if (target.type === "newSection") {
    newSection.value.assessmentId = nextId;
    showToast("Тест привязан к новой теме курса", "success");
  } else if (target.type === "final") {
    form.value.finalAssessmentId = nextId;
    await saveCourse();
  }

  assessmentEditorOpen.value = false;
};

const toggleSectionEdit = (sectionId) => {
  sectionEditingId.value = sectionEditingId.value === sectionId ? null : sectionId;
};

const toggleTopicEdit = (topicId) => {
  topicEditingId.value = topicEditingId.value === topicId ? null : topicId;
};

const selectSection = (sectionId) => {
  selectedStructureSectionId.value = sectionId;
};

const isNewTopicFormOpen = (sectionId) => {
  return Number(newTopicFormSectionId.value) === Number(sectionId);
};

const toggleNewTopicForm = (sectionId) => {
  if (isNewTopicFormOpen(sectionId)) {
    newTopicFormSectionId.value = null;
    return;
  }
  newTopicFormSectionId.value = sectionId;
};

const closeNewTopicForm = () => {
  newTopicFormSectionId.value = null;
};

const selectMaterialTopic = (topicId) => {
  activeMaterialTopicId.value = topicId;
  materialIframeDraft.value = "";
};

const openMaterialEditor = (topicId) => {
  selectMaterialTopic(topicId);
  showMaterialStep.value = true;
  currentStep.value = 3;
};

const closeMaterialEditor = (targetStep = 2) => {
  showMaterialStep.value = false;
  materialIframeDraft.value = "";
  currentStep.value = targetStep;
};

const focusMaterialEditor = () => {
  materialEditorPanelRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const appendMaterialIframe = () => {
  if (!activeMaterialForm.value || !materialIframeDraft.value.trim()) return;
  const iframe = materialIframeDraft.value.trim();
  if (!/^<iframe[\s\S]*<\/iframe>$/i.test(iframe)) {
    showToast("Вставьте корректный iframe-код видео", "error");
    return;
  }
  activeMaterialForm.value.content = `${activeMaterialForm.value.content || ""}<p>${iframe}</p>`;
  materialIframeDraft.value = "";
};

const clearActiveMaterialContent = () => {
  if (!activeMaterialForm.value) return;
  activeMaterialForm.value.content = "";
};

const saveMaterialTopic = async () => {
  const topicId = activeMaterialTopic.value?.id;
  if (!topicId || !activeMaterialForm.value) return;
  await saveTopic(topicId, { keepEditorOpen: true, successMessage: "Материал сохранен" });
};

const isSectionVisible = (section) => {
  return visibleSections.value.some((visibleSection) => Number(visibleSection.id) === Number(section.id));
};

const handleActiveSectionAssessmentToggle = (event) => {
  if (!activeSection.value || !activeSectionForm.value) return;
  if (event.target.checked) {
    openAssessmentEditor({ type: "section", id: activeSection.value.id }, activeSectionForm.value.assessmentId || null);
    return;
  }
  activeSectionForm.value.assessmentId = "";
};

const resetNewSection = () => {
  newSection.value = { title: "", assessmentId: "", isRequired: true, estimatedMinutes: "", description: "" };
  newSectionErrors.value = { title: "" };
};

const addSection = async () => {
  if (!newSection.value.title.trim()) {
    newSectionErrors.value = { title: "Укажите название темы курса" };
    return;
  }
  creatingSection.value = true;
  try {
    const payload = {
      title: newSection.value.title.trim(),
      description: (newSection.value.description || "").trim(),
      assessmentId: sanitizeOptionalNumber(newSection.value.assessmentId),
      isRequired: Boolean(newSection.value.isRequired),
      estimatedMinutes: sanitizeOptionalNumber(newSection.value.estimatedMinutes),
    };
    const response = await createCourseSection(courseId.value, payload);
    course.value = response.course;
    syncSectionForms(response.course.sections || []);
    selectedStructureSectionId.value = response.course.sections?.at(-1)?.id || selectedStructureSectionId.value;
    showNewSectionForm.value = false;
    resetNewSection();
    showToast("Тема курса добавлена", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось добавить тему курса"), "error");
  } finally {
    creatingSection.value = false;
  }
};

const saveSection = async (sectionId) => {
  const formState = sectionForms.value[sectionId];
  if (!formState) return;
  if (!formState.title.trim()) {
    sectionErrors.value = { ...sectionErrors.value, [sectionId]: { title: "Укажите название" } };
    return;
  }
  updatingSectionId.value = sectionId;
  try {
    const payload = {
      title: formState.title.trim(),
      description: (formState.description || "").trim(),
      assessmentId: sanitizeOptionalNumber(formState.assessmentId),
      isRequired: Boolean(formState.isRequired),
      estimatedMinutes: sanitizeOptionalNumber(formState.estimatedMinutes),
    };
    const response = await updateCourseSection(sectionId, payload);
    course.value = response.course;
    syncSectionForms(response.course.sections || []);
    sectionEditingId.value = null;
    showToast("Тема курса обновлена", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось обновить тему курса"), "error");
  } finally {
    updatingSectionId.value = null;
  }
};

const removeSection = async (sectionId, title) => {
  if (!window.confirm(`Удалить тему курса "${title}" и все её подтемы?`)) return;
  deletingSectionId.value = sectionId;
  try {
    const response = await deleteCourseSection(sectionId);
    course.value = response.course;
    syncSectionForms(response.course.sections || []);
    if (sectionEditingId.value === sectionId) sectionEditingId.value = null;
    showToast("Тема курса удалена", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось удалить тему курса"), "error");
  } finally {
    deletingSectionId.value = null;
  }
};

const addTopic = async (sectionId) => {
  const formState = newTopics.value[sectionId];
  if (!formState) return;
  if (!formState.title.trim()) {
    newTopicErrors.value = { ...newTopicErrors.value, [sectionId]: { title: "Укажите название подтемы" } };
    return;
  }
  if (!formState.hasMaterial) {
    showToast("Подтема должна содержать учебный материал", "error");
    return;
  }
  creatingTopicSectionId.value = sectionId;
  try {
    const payload = {
      title: formState.title.trim(),
      isRequired: Boolean(formState.isRequired),
      hasMaterial: Boolean(formState.hasMaterial),
      content: formState.hasMaterial ? (formState.content || "").trim() || null : null,
    };
    const response = await createCourseTopic(sectionId, payload);
    course.value = response.course;
    syncSectionForms(response.course.sections || []);
    newTopics.value[sectionId] = { title: "", isRequired: true, hasMaterial: true, content: "" };
    newTopicErrors.value = { ...newTopicErrors.value, [sectionId]: null };
    closeNewTopicForm();
    showToast("Подтема добавлена", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось добавить подтему"), "error");
  } finally {
    creatingTopicSectionId.value = null;
  }
};

const saveTopic = async (topicId, options = {}) => {
  const formState = topicForms.value[topicId];
  if (!formState) return;
  if (!formState.title.trim()) {
    topicErrors.value = { ...topicErrors.value, [topicId]: { title: "Укажите название" } };
    return;
  }
  updatingTopicId.value = topicId;
  try {
    const payload = {
      title: formState.title.trim(),
      isRequired: Boolean(formState.isRequired),
      hasMaterial: Boolean(formState.hasMaterial),
      content: formState.hasMaterial ? (formState.content || "").trim() || null : null,
    };
    const response = await updateCourseTopic(topicId, payload);
    course.value = response.course;
    syncSectionForms(response.course.sections || []);
    if (!options.keepEditorOpen) {
      topicEditingId.value = null;
    }
    showToast(options.successMessage || "Подтема обновлена", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось обновить подтему"), "error");
  } finally {
    updatingTopicId.value = null;
  }
};

const canMoveSection = (sectionId, offset) => {
  const sections = course.value?.sections || [];
  const index = sections.findIndex((section) => Number(section.id) === Number(sectionId));
  if (index === -1) return false;
  const targetIndex = index + Number(offset);
  return targetIndex >= 0 && targetIndex < sections.length && !reorderingSections.value;
};

const moveSectionByOffset = async (sectionId, offset) => {
  if (!canMoveSection(sectionId, offset)) return;
  const sections = course.value?.sections || [];
  const fromIndex = sections.findIndex((section) => Number(section.id) === Number(sectionId));
  const toIndex = fromIndex + Number(offset);
  const [movedSection] = sections.splice(fromIndex, 1);
  sections.splice(toIndex, 0, movedSection);
  await handleSectionsReorder();
};

const canMoveTopic = (sectionId, topicId, offset) => {
  if (reorderingTopicSectionId.value) return false;
  const sections = course.value?.sections || [];
  const section = sections.find((item) => Number(item.id) === Number(sectionId));
  if (!section || !Array.isArray(section.topics)) return false;
  const index = section.topics.findIndex((topic) => Number(topic.id) === Number(topicId));
  if (index === -1) return false;
  const targetIndex = index + Number(offset);
  return targetIndex >= 0 && targetIndex < section.topics.length;
};

const moveTopicByOffset = async (sectionId, topicId, offset) => {
  if (!canMoveTopic(sectionId, topicId, offset)) return;
  const sections = course.value?.sections || [];
  const section = sections.find((item) => Number(item.id) === Number(sectionId));
  if (!section || !Array.isArray(section.topics)) return;

  const fromIndex = section.topics.findIndex((topic) => Number(topic.id) === Number(topicId));
  const toIndex = fromIndex + Number(offset);
  const [movedTopic] = section.topics.splice(fromIndex, 1);
  section.topics.splice(toIndex, 0, movedTopic);
  await handleTopicsReorder(section);
};

const handleSectionsReorder = async () => {
  if (!course.value || !isEditMode.value) return;
  const sectionIds = (course.value.sections || []).map((section) => Number(section.id)).filter((id) => Number.isInteger(id) && id > 0);
  if ((course.value.sections || []).length <= 1) return;

  reorderingSections.value = true;
  try {
    if (sectionIds.length <= 1) return;
    const response = await reorderCourseSections(courseId.value, sectionIds);
    course.value = response.course;
    syncSectionForms(response.course.sections || []);
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось сохранить порядок тем"), "error");
    await loadCourse();
  } finally {
    reorderingSections.value = false;
  }
};

const handleTopicsReorder = async (section) => {
  if (!course.value || !isEditMode.value || !section?.id) return;
  const topicIds = (section.topics || []).map((topic) => Number(topic.id)).filter((id) => Number.isInteger(id) && id > 0);
  if ((section.topics || []).length <= 1) return;

  reorderingTopicSectionId.value = Number(section.id);
  try {
    if (topicIds.length <= 1) return;
    const response = await reorderCourseTopics(courseId.value, Number(section.id), topicIds);
    course.value = response.course;
    syncSectionForms(response.course.sections || []);
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось сохранить порядок подтем"), "error");
    await loadCourse();
  } finally {
    reorderingTopicSectionId.value = null;
  }
};

const removeTopic = async (topicId, title) => {
  if (!window.confirm(`Удалить подтему "${title}"?`)) return;
  deletingTopicId.value = topicId;
  try {
    const response = await deleteCourseTopic(topicId);
    course.value = response.course;
    syncSectionForms(response.course.sections || []);
    if (topicEditingId.value === topicId) topicEditingId.value = null;
    showToast("Подтема удалена", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось удалить подтему"), "error");
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
      showToast(validationErrors.map((item) => formatPublicationError(item)).join("; "), "error", 7000);
      await loadCourse();
      return;
    }

    showToast(getErrorMessage(error, "Не удалось опубликовать курс"), "error");
  } finally {
    publishing.value = false;
  }
};

const handleArchive = async () => {
  if (!course.value || !window.confirm(`Закрыть курс "${course.value.title}" для новых пользователей?`)) {
    return;
  }

  archiving.value = true;
  try {
    await archiveCourse(course.value.id);
    showToast("Курс закрыт", "success");
    await loadCourse();
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось закрыть курс"), "error");
  } finally {
    archiving.value = false;
  }
};

const goBack = () => {
  router.push("/courses");
};

const saveTargets = async (overrideCourseId = null, silent = false) => {
  const id = Number(overrideCourseId || courseId.value);
  if (!id) {
    return false;
  }

  try {
    await updateCourseTargets(id, {
      positionIds: selectedPositionIds.value,
      branchIds: selectedBranchIds.value,
    });
    if (!silent) {
      showToast("Назначения сохранены", "success");
    }
    return true;
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось сохранить назначения"), "error");
    return false;
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
    const deadlineAt = newAssignmentDeadlineAt.value ? new Date(newAssignmentDeadlineAt.value).toISOString() : null;
    const response = await addCourseAssignment(courseId.value, userId, deadlineAt);
    assignments.value = response.assignments || [];
    newAssignmentUserId.value = "";
    newAssignmentDeadlineAt.value = "";
    showToast("Пользователь добавлен", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось добавить пользователя"), "error");
  } finally {
    addingAssignment.value = false;
  }
};

const handleCloseAssignment = async (userId) => {
  if (!window.confirm("Закрыть курс для этого пользователя?")) {
    return;
  }
  closingAssignmentUserId.value = userId;
  try {
    const response = await closeCourseAssignment(courseId.value, userId);
    assignments.value = response.assignments || [];
    showToast("Курс закрыт для пользователя", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось закрыть курс для пользователя"), "error");
  } finally {
    closingAssignmentUserId.value = null;
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

const formatDuration = (secondsValue) => {
  const totalSeconds = Number(secondsValue || 0);
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "0м";
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}ч ${minutes}м`;
  }
  return `${minutes}м`;
};

const getProgressStatusLabel = (status) => {
  const labels = {
    not_started: "Не начат",
    in_progress: "В процессе",
    completed: "Завершен",
    failed: "Не пройден",
    passed: "Сдан",
  };
  return labels[status] || status;
};

const loadParticipants = async () => {
  if (!isEditMode.value) return;
  loadingParticipants.value = true;
  try {
    const [usersResponse, reportResponse] = await Promise.all([getCourseUsers(courseId.value), getCourseProgressReport(courseId.value)]);
    participants.value = (reportResponse.users || []).length > 0 ? reportResponse.users : usersResponse.users || [];
    participantsReportSummary.value = reportResponse.summary || null;
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
    selectedUserName.value = participant?.name || `Пользователь #${userId}`;
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

const preventWindowFileDrop = (event) => {
  event.preventDefault();
};

watch(
  () => currentStep.value,
  async (step) => {
    if (step === previewStepId.value) {
      await loadPreview();
      if (isEditMode.value) {
        await loadParticipants();
      }
    }
  },
);

onBeforeUnmount(() => {
  clearLocalCoverPreview();
  window.removeEventListener("dragover", preventWindowFileDrop);
  window.removeEventListener("drop", preventWindowFileDrop);
});

onMounted(async () => {
  window.addEventListener("dragover", preventWindowFileDrop);
  window.addEventListener("drop", preventWindowFileDrop);
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
  --course-accent: #6c5ce7;
  --course-accent-strong: #5b46f5;
  --course-page-bg: #f7f8fc;
  --course-surface: #ffffff;
  --course-border: #e4e7ee;
  --course-border-soft: #eceff5;
  --course-text: #1f2937;
  --course-text-muted: #667085;
  --course-text-soft: #98a2b3;
  --course-radius-lg: 14px;
  --course-radius-md: 10px;
  --course-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  color: var(--course-text);
}

/* ──────────────── Шапка страницы ──────────────── */
.course-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.course-editor-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.course-editor-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.2;
  font-weight: 700;
  color: #111827;
}

.course-editor-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.course-editor-header-left :deep(.button),
.course-editor-header-right :deep(.button) {
  border-radius: var(--course-radius-md);
  font-size: 14px;
  font-weight: 600;
  min-height: 38px;
  box-shadow: none;
}

.course-editor-header-left :deep(.button-ghost) {
  border: 1px solid var(--course-border);
  background: #fff;
  color: #344054;
}

.course-editor-header-right :deep(.button-primary) {
  background: var(--course-accent-strong);
  color: #fff;
}

.course-editor-header-right :deep(.button-primary:hover:not(.button-disabled)) {
  background: #4f37e8;
  opacity: 1;
}

.course-editor-header-right :deep(.button-secondary) {
  border: 1px solid var(--course-border);
  background: #fff;
  color: #344054;
}

/* ──────────────── Степпер ──────────────── */
.course-stepper {
  display: flex;
  align-items: center;
  background: var(--course-surface);
  border: 1px solid var(--course-border);
  border-radius: var(--course-radius-lg);
  padding: 16px 18px;
  margin-bottom: 18px;
  overflow-x: auto;
  box-shadow: var(--course-shadow);
}

.stepper-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.stepper-connector {
  flex: 0 0 28px;
  height: 1px;
  background: var(--course-border);
  margin-right: 8px;
  flex-shrink: 0;
}

.stepper-item.stepper-completed .stepper-connector {
  background: var(--course-accent-strong);
}

.stepper-bubble {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  border: 1px solid var(--course-border);
  background: #ffffff;
  color: var(--course-text-muted);
  transition: all 0.2s;
}

.stepper-item.stepper-active .stepper-bubble {
  border-color: var(--course-accent-strong);
  background: var(--course-accent-strong);
  color: #fff;
}

.stepper-item.stepper-completed .stepper-bubble {
  border-color: var(--course-accent-strong);
  background: var(--course-accent-strong);
  color: #fff;
}

.stepper-labels {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stepper-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--course-text);
  white-space: nowrap;
}

.stepper-subtitle {
  font-size: 12px;
  color: var(--course-text-soft);
  white-space: nowrap;
}

.stepper-item.stepper-active .stepper-title {
  color: var(--course-accent-strong);
}

/* ──────────────── Шаг 1 — двухколоночный макет ──────────────── */
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

/* Drag-drop обложка */
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
  transition:
    border-color 0.2s,
    background 0.2s;
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
  object-fit: cover;
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
  transition:
    color 0.15s,
    border-color 0.15s;
}

.cover-preview-remove:hover {
  color: #ef4444;
  border-color: #ef444466;
}

/* ──────────────── Сайдбар ──────────────── */
.step1-sidebar {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tags-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
/* Теги */
.tags-label {
  font-size: 13px;
  font-weight: 600;
  color: #344054;
  display: block;
  margin-bottom: 6px;
}

.tags-input-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 9px 10px;
  border: 1px solid var(--course-border);
  border-radius: var(--course-radius-md);
  background: #fff;
  min-height: 42px;
  align-items: center;
  cursor: text;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(108, 92, 231, 0.1);
  color: var(--course-accent-strong);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 13px;
}

.tag-chip-remove {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  color: inherit;
  padding: 0;
}

.tags-raw-input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  flex: 1;
  min-width: 120px;
  color: var(--course-text);
}

.tags-hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--course-text-soft);
}

/* Карточка информации о курсе */
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

/* Карточка "Что дальше?" */
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

/* Шаг-плейсхолдер */
.step-placeholder {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
  color: var(--text-secondary);
}

.editor-card,
.sections-card,
.final-assessment-card,
.preview-card {
  margin-bottom: 20px;
}

/* Убрать старые стили шапки */
.page-header {
  display: none;
}

.page-header-actions {
  display: none;
}

.wizard-header h2,
.step-card-header h2 {
  margin: 0 0 4px;
}

.wizard-header p,
.step-card-header p {
  margin: 0;
  color: var(--text-secondary);
}

.wizard-step-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wizard-step-text small {
  color: var(--text-secondary);
}

.step-card-header {
  margin-bottom: 14px;
}

.step-card-header-tight {
  margin: 0;
  padding: 20px 20px 0;
}

.topic-tests-card {
  overflow: hidden;
}

.status-summary {
  border: 1px solid var(--divider);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-summary-label,
.preview-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.status-summary-text {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.preview-item {
  border: 1px solid var(--divider);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.wizard-actions {
  margin-top: 18px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
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

.publication-warnings {
  border: 1px solid #f59e0b66;
  border-radius: 12px;
  background: #f59e0b12;
  padding: 12px;
  margin-top: 12px;
}

.publication-warnings h3 {
  margin: 0 0 8px;
  font-size: 15px;
}

.publication-warnings ul {
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

.drag-handle {
  border: 1px dashed var(--divider);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 8px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.reorder-fallback-btn {
  display: none;
  width: 28px;
  height: 28px;
  border: 1px solid var(--divider);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.reorder-fallback-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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

.topic-badge-optional {
  color: #92400e;
  border-color: #f59e0b66;
  background: #fffbeb;
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

.inline-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.structure-card :deep(.card-content) {
  padding: 24px;
}

.structure-card {
  --structure-primary: #5b41f5;
  --structure-muted: #7a849b;
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

.structure-search input {
  width: 100%;
  height: 100%;
  border: 0 !important;
  border-radius: 0;
  background: transparent !important;
  font-size: 14px;
  color: #172033;
}

.structure-search input:focus {
  outline: 0;
}

.structure-secondary-action,
.structure-primary-action {
  height: 42px;
  border-radius: 8px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.structure-secondary-action {
  border: 1px solid var(--structure-border);
  background: #ffffff;
  color: #25314a;
}

.structure-secondary-action-disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.structure-primary-action {
  border: 1px solid var(--structure-primary);
  background: var(--structure-primary);
  color: #ffffff;
  min-width: 154px;
}

.structure-primary-action span,
.structure-add-area span {
  font-size: 24px;
  line-height: 1;
  font-weight: 400;
}

.structure-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 464px;
  gap: 26px;
  align-items: start;
}

.structure-list-panel {
  min-width: 0;
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

.structure-section-active {
  border-color: #e2e5f0;
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

.structure-section-active .structure-section-head {
  background: var(--structure-soft);
  border-bottom: 1px solid var(--structure-border);
}

.structure-drag {
  color: #b4bbcc;
  cursor: grab;
  font-size: 18px;
  line-height: 1;
}

.structure-section-number {
  font-size: 16px;
  line-height: 22px;
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

.structure-chevron {
  width: 16px;
  height: 16px;
  color: #7d879f;
}

.structure-section:not(.structure-section-active) .structure-chevron {
  transform: rotate(180deg);
}

.structure-subtopics {
  padding: 6px 20px 14px 42px;
}

.structure-subtopics-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.structure-subtopic {
  border-bottom: 1px solid #edf0f6;
  background: #ffffff;
  padding: 0;
  color: #27334a;
}

.structure-subtopic-row {
  min-height: 46px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 2px;
}

.structure-doc-icon {
  width: 17px;
  height: 17px;
  color: #65718b;
}

.structure-subtopic-title {
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.structure-kebab {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #5f6980;
  font-size: 22px;
  line-height: 1;
  padding: 0;
  cursor: pointer;
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

.structure-add-subtopic-trigger {
  margin-top: 10px;
  min-height: 34px;
  border: 1px dashed #cdc5ff;
  border-radius: 8px;
  background: #ffffff;
  color: var(--structure-primary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.structure-add-subtopic-trigger span {
  font-size: 20px;
  line-height: 1;
}

.structure-topic-create-title {
  margin-bottom: 10px;
  color: #1f2a42;
  font-size: 13px;
  font-weight: 700;
}

.structure-topic-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 10px;
}

.structure-topic-field {
  display: block;
}

.structure-topic-field-wide {
  min-width: 0;
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
  background: #ffffff;
  color: #172033;
  font-size: 13px;
  padding: 0 10px;
}

.structure-topic-field input:focus {
  outline: 0;
  border-color: var(--structure-primary);
  box-shadow: 0 0 0 3px rgba(91, 65, 245, 0.12);
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

.structure-topic-toggles label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #4b566f;
  font-size: 12px;
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

.structure-topic-actions {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.structure-topic-save,
.structure-topic-delete,
.structure-topic-cancel {
  height: 34px;
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.structure-topic-save {
  background: var(--structure-primary);
  color: #ffffff;
}

.structure-topic-delete {
  background: #ffffff;
  color: #d14343;
  border-color: #ffcfcf;
}

.structure-topic-cancel {
  background: #ffffff;
  color: #4b566f;
  border-color: #d8def0;
}

.structure-add-area {
  width: 100%;
  height: 66px;
  margin-top: 8px;
  border: 1px dashed #b8adff;
  border-radius: 8px;
  background: #ffffff;
  color: var(--structure-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
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
  align-items: flex-start;
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

.structure-detail-head h3 {
  margin: 0;
  color: #111827;
  font-size: 20px;
  line-height: 26px;
  font-weight: 800;
}

.structure-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.structure-detail-head-title {
  flex: 1;
  min-width: 0;
}

.structure-title-input {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--structure-border) !important;
  border-radius: 8px;
  background: #ffffff !important;
  color: #172033;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
  padding: 10px 12px;
  outline: none;
  box-sizing: border-box;
}

.structure-title-input:focus {
  border-color: #4f46e5 !important;
}

.structure-save-button {
  height: 44px;
  border: 1px solid #4f46e5;
  border-radius: 8px;
  background: #4f46e5;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.structure-save-button:hover {
  background: #4338ca;
  border-color: #4338ca;
}

.structure-save-button:disabled,
.structure-edit-button:disabled {
  opacity: 0.6;
  cursor: default;
}

.structure-edit-button {
  height: 44px;
  border: 1px solid var(--structure-border);
  border-radius: 8px;
  background: #ffffff;
  color: #25314a;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
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

.structure-field textarea,
.structure-field input {
  width: 100%;
  border: 1px solid var(--structure-border) !important;
  border-radius: 8px;
  background: #ffffff !important;
  color: #172033;
  font-size: 14px;
}

.structure-field textarea {
  height: 126px;
  padding: 14px;
  line-height: 22px;
  resize: none;
}

.structure-field input {
  height: 46px;
  padding: 0 14px;
}

.structure-field small {
  display: block;
  margin-top: -26px;
  padding-right: 12px;
  color: #64708a;
  font-size: 12px;
  text-align: right;
}

.structure-field em {
  display: block;
  margin-top: 8px;
  color: #7c86a0;
  font-size: 13px;
  font-style: normal;
}

.structure-settings {
  border-top: 1px solid var(--structure-border);
  margin-top: 24px;
  padding-top: 18px;
}

.structure-settings h4 {
  margin: 0 0 18px;
  color: #172033;
  font-size: 15px;
  font-weight: 800;
}

.structure-toggle {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 16px;
  align-items: start;
  margin-bottom: 24px;
}

.structure-toggle strong {
  display: block;
  margin-bottom: 4px;
  color: #344054;
  font-size: 14px;
  font-weight: 700;
}

.structure-toggle small {
  display: block;
  color: #7c86a0;
  font-size: 13px;
  line-height: 18px;
}

.structure-toggle input {
  width: 42px;
  height: 24px;
  appearance: none;
  border: 0;
  border-radius: 999px;
  background: #d8deea;
  cursor: pointer;
  position: relative;
  transition: background 0.2s ease;
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
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.2);
  transition: transform 0.2s ease;
}

.structure-toggle input:checked {
  background: var(--structure-primary);
}

.structure-toggle input:checked::before {
  transform: translateX(18px);
}

.structure-delete-button {
  height: 44px;
  margin-top: 4px;
  border: 1px solid #ffcbc7;
  border-radius: 8px;
  background: #ffffff;
  color: #ef4444;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.structure-topic-material {
  height: 34px;
  border: 1px solid #d8d1ff;
  border-radius: 8px;
  background: #ffffff;
  color: #5b41f5;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.materials-step-card {
  --materials-primary: #5b41f5;
  --materials-border: #e6eaf4;
  --materials-muted: #6f7892;
  border: 1px solid var(--materials-border);
  border-radius: 10px;
  background: #ffffff;
  padding: 28px 28px 24px;
  color: #111827;
}

.materials-breadcrumbs {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  color: #6f7892;
  font-size: 14px;
}

.materials-breadcrumbs button {
  border: 0;
  background: transparent;
  color: var(--materials-primary);
  font: inherit;
  cursor: pointer;
  padding: 0;
}

.materials-breadcrumbs strong {
  color: #172033;
  font-weight: 700;
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
  color: #111827;
}

.materials-title-row p {
  margin: 0;
  max-width: 760px;
  color: var(--materials-muted);
  font-size: 14px;
  line-height: 20px;
}

.materials-preview-button,
.materials-add-button,
.materials-secondary-button,
.materials-save-button,
.materials-cancel-button,
.materials-delete-button {
  height: 40px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.materials-preview-button,
.materials-cancel-button,
.materials-secondary-button {
  border: 1px solid var(--materials-border);
  background: #ffffff;
  color: #25314a;
}

.materials-add-button,
.materials-save-button {
  border: 1px solid var(--materials-primary);
  background: var(--materials-primary);
  color: #ffffff;
}

.materials-add-button:disabled,
.materials-save-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.materials-add-button span {
  font-size: 22px;
  line-height: 1;
  font-weight: 400;
}

.materials-list-panel,
.materials-editor-card,
.materials-info-panel {
  min-width: 0;
}

.materials-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.materials-list-head h3,
.materials-info-card h3,
.materials-preview-card h3,
.materials-settings h3 {
  margin: 0;
  color: #172033;
  font-size: 16px;
  font-weight: 800;
}

.materials-items {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--materials-border);
  border-radius: 8px;
  overflow: hidden;
}

.materials-item {
  min-height: 86px;
  border: 0;
  border-bottom: 1px solid var(--materials-border);
  background: #ffffff;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 14px;
  text-align: left;
  cursor: pointer;
}

.materials-item:last-child {
  border-bottom: 0;
}

.materials-item-active {
  background: #fbfaff;
  box-shadow: inset 0 0 0 1px #cfc7ff;
}

.materials-drag,
.materials-kebab {
  color: #9aa4bb;
  font-size: 18px;
  flex-shrink: 0;
}

.materials-type-icon,
.materials-preview-icon {
  width: 46px;
  height: 46px;
  border-radius: 8px;
  background: #eee8ff;
  color: var(--materials-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 800;
  flex-shrink: 0;
}

.materials-type-filled {
  background: #e9f8ef;
  color: #16a34a;
}

.materials-item-text {
  display: grid;
  gap: 4px;
  min-width: 0;
  width: 100%;
}

.materials-item-text strong {
  overflow: hidden;
  color: #172033;
  font-size: 14px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.materials-item-text small {
  color: #7c86a0;
  font-size: 13px;
}

.materials-order-hint {
  height: 54px;
  margin-top: 18px;
  border: 1px dashed #cbc3ff;
  border-radius: 8px;
  background: #ffffff;
  color: #64708a;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 14px;
}

.materials-empty,
.materials-editor-empty {
  border: 1px dashed #cfd6e7;
  border-radius: 10px;
  padding: 24px;
  background: #fbfcff;
  color: var(--materials-muted);
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

.materials-field {
  display: block;
  position: relative;
  margin-bottom: 22px;
}

.materials-field span {
  display: block;
  margin-bottom: 8px;
  color: #344054;
  font-size: 14px;
  font-weight: 700;
}

.materials-field b {
  color: #ef4444;
}

.materials-field input,
.materials-field textarea {
  width: 100%;
  border: 1px solid var(--materials-border);
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  font-size: 14px;
}

.materials-field input {
  height: 42px;
  padding: 0 14px;
}

.materials-field textarea {
  min-height: 104px;
  padding: 12px 14px;
  line-height: 20px;
  resize: vertical;
}

.materials-field input:focus,
.materials-field textarea:focus {
  outline: 0;
  border-color: var(--materials-primary);
  box-shadow: 0 0 0 3px rgba(91, 65, 245, 0.12);
}

.materials-field input[readonly] {
  background: #f8f9fc;
  color: #64708a;
}

.materials-field small {
  position: absolute;
  right: 12px;
  bottom: -18px;
  color: #64708a;
  font-size: 12px;
}

.materials-content-field :deep(.wysiwyg-editor) {
  border-color: var(--materials-border);
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
  line-height: 19px;
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
  color: #64708a;
  font-size: 14px;
}

.materials-toggle input {
  width: 42px;
  height: 24px;
  appearance: none;
  border: 0;
  border-radius: 999px;
  background: #d8deea;
  cursor: pointer;
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
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.2);
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

.materials-delete-button {
  border: 1px solid #ffcbc7;
  background: #ffffff;
  color: #ef4444;
}

.materials-info-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-items: flex-start;
}

.materials-info-card,
.materials-tip-card,
.materials-preview-card {
  border: 1px solid var(--materials-border);
  border-radius: 10px;
  background: #ffffff;
  padding: 20px;
}

.materials-info-card strong {
  display: block;
  margin: 18px 0 10px;
  color: #172033;
  font-size: 16px;
}

.materials-info-card p {
  margin: 8px 0 0;
  color: var(--materials-muted);
  font-size: 14px;
}

.materials-tip-card {
  display: flex;
  gap: 14px;
  background: #f7f5ff;
}

.materials-tip-card > span {
  width: 20px;
  height: 20px;
  border: 1px solid var(--materials-primary);
  border-radius: 50%;
  color: var(--materials-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  flex-shrink: 0;
}

.materials-tip-card strong {
  color: var(--materials-primary);
  font-size: 14px;
}

.materials-tip-card p {
  margin: 8px 0 0;
  color: #64708a;
  font-size: 13px;
  line-height: 20px;
}

.materials-preview-list {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.materials-preview-item {
  min-height: 58px;
  border: 1px solid var(--materials-border);
  border-radius: 8px;
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #ffffff;
}

.materials-preview-item-open {
  min-height: 142px;
}

.materials-preview-icon {
  width: 34px;
  height: 34px;
  font-size: 15px;
}

.materials-preview-item strong {
  display: block;
  color: #172033;
  font-size: 13px;
  line-height: 18px;
}

.materials-preview-item p {
  margin: 10px 0 0;
  color: #7c86a0;
  font-size: 13px;
  line-height: 19px;
}

.materials-preview-item small {
  display: block;
  margin-top: 12px;
  color: #172033;
  font-size: 12px;
  font-weight: 800;
  text-align: right;
}

.materials-preview-empty {
  color: var(--materials-muted);
  font-size: 14px;
}

.assignments-card {
  margin-top: 16px;
  box-shadow: var(--course-shadow);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 304px;
  gap: 18px;
  align-items: start;
  background: none;
  border: none;
}

.assignments-card :deep(.card-content) {
  background: var(--course-surface);
  border: 1px solid var(--course-border);
  border-radius: var(--course-radius-lg);
}

.assignments-header {
  margin-bottom: 14px;
}

.assignments-header h2 {
  margin: 0 0 4px;
}

.assignments-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.targets-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 16px;
}

.targets-group {
  border-radius: 12px;
  padding: 14px;
  background: var(--surface, #fff);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.targets-group h3 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
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
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid var(--divider);
  border-radius: 10px;
  background: var(--bg-primary);
  padding: 10px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  cursor: pointer;
  min-height: 28px;
}

.checkbox-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  cursor: pointer;
}

.manual-assignments h3 {
  margin: 0 0 12px;
  font-size: 15px;
}

.manual-assignments {
  border-top: 1px solid var(--divider);
  padding-top: 16px;
}

.manual-assignments h3 {
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 700;
}

.add-assignment {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 14px;
}

.add-assignment .input-wrapper {
  width: 200px;
}

.assignments-table {
  width: 100%;
  border: 1px solid var(--divider);
  border-radius: 10px;
  overflow: hidden;
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
  background: var(--bg-secondary);
}

.switch-label input {
  width: 16px;
  height: 16px;
}

/* --- Участники ----------------------------------------------------------- */

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

.participants-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
  margin-bottom: 14px;
}

.participants-summary-item {
  border: 1px solid var(--divider);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.participants-summary-item span {
  font-size: 12px;
  color: var(--text-secondary);
}

.participants-summary-item strong {
  font-size: 16px;
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
  .step1-layout {
    grid-template-columns: 1fr;
  }

  .step1-form-grid {
    grid-template-columns: 1fr;
  }

  .targets-grid {
    grid-template-columns: 1fr;
  }

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

  .cover-upload-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .drag-handle {
    display: none;
  }

  .reorder-fallback-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .structure-layout {
    grid-template-columns: 1fr;
  }

  .structure-toolbar {
    grid-template-columns: 1fr;
  }

  .structure-detail-panel {
    min-height: auto;
    position: static;
  }

  .structure-subtopics {
    padding: 10px 12px 12px;
  }

  .structure-add-subtopic-trigger {
    width: 100%;
    justify-content: center;
  }

  .structure-topic-grid {
    grid-template-columns: 1fr;
  }

  .materials-step-card {
    padding: 20px 16px;
  }

  .materials-title-row,
  .materials-actions,
  .materials-list-head {
    flex-direction: column;
    align-items: stretch;
  }

  .materials-layout {
    grid-template-columns: 1fr;
  }

  .materials-preview-button,
  .materials-add-button,
  .materials-save-button,
  .materials-cancel-button,
  .materials-delete-button {
    width: 100%;
  }

  .materials-actions > div {
    width: 100%;
    flex-direction: column;
  }
}
</style>
