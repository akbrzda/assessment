<template>
  <div class="course-editor-view">
    <div class="page-header">
      <Button variant="secondary" icon="arrow-left" @click="goBack">К списку курсов</Button>
      <div class="page-header-actions" v-if="isEditMode && course">
        <Badge :variant="getStatusVariant(course.status)" rounded>
          {{ getStatusLabel(course.status) }}
        </Badge>
        <Button
          v-if="course.status === 'published'"
          variant="success"
          icon="send"
          :loading="publishing"
          @click="handlePublish"
        >
          Применить изменения
        </Button>
        <Button v-if="course.status === 'published'" variant="secondary" icon="archive" :loading="archiving" @click="handleArchive">
          Закрыть курс
        </Button>
      </div>
    </div>

    <Preloader v-if="loading" />

    <template v-else>
      <Card class="wizard-card">
        <div class="wizard-header">
          <div>
            <h2>Мастер настройки курса</h2>
            <p>
              {{
                isEditMode
                  ? "Проверьте шаги курса и подготовьте его к публикации."
                  : "Сначала сохраните основу курса, затем добавьте темы и итоговую аттестацию."
              }}
            </p>
          </div>
          <Badge variant="primary" rounded>Шаг {{ currentStep }} из {{ wizardSteps.length }}</Badge>
        </div>

        <div class="wizard-steps">
          <div
            v-for="step in wizardSteps"
            :key="step.id"
            class="wizard-step"
            :class="{ active: currentStep === step.id, completed: currentStep > step.id }"
          >
            <div class="step-number">{{ step.id }}</div>
            <div class="step-label">{{ step.title }}</div>
          </div>
        </div>
      </Card>

      <Card v-if="currentStep === 1" class="editor-card">
        <div class="step-card-header">
          <h2>Шаг 1. Основная информация</h2>
          <p>Заполните общие данные курса и сохраните основу перед наполнением.</p>
        </div>

        <div class="editor-grid">
          <Input v-model="form.title" label="Название курса" placeholder="Например: Стандарты обслуживания" :error="errors.title" required />
          <div class="status-summary">
            <span class="status-summary-label">Статус публикации</span>
            <Badge :variant="course ? getStatusVariant(course.status) : 'default'" rounded>
              {{ course ? getStatusLabel(course.status) : "Не опубликован" }}
            </Badge>
          </div>
          <Textarea
            v-model="form.description"
            class="grid-span-full"
            label="Описание курса"
            placeholder="Кратко опишите цель и содержание курса"
            :rows="4"
          />
          <div class="cover-upload grid-span-full">
            <Input
              v-model="form.coverUrl"
              label="Ссылка на обложку"
              placeholder="https://cdn.example.com/course-cover.jpg"
            />
            <div class="cover-upload-controls">
              <input type="file" accept="image/*" @change="handleCoverFileChange" />
              <Button
                size="sm"
                variant="secondary"
                :loading="uploadingCover"
                :disabled="!isEditMode || !selectedCoverFile"
                @click="handleCoverUpload"
              >
                Загрузить файл
              </Button>
            </div>
            <p class="cover-upload-hint">Для загрузки файла курс должен быть сначала сохранён.</p>
          </div>
          <Input
            v-model="form.category"
            label="Категория"
            placeholder="Например: Сервис"
          />
          <Input
            v-model="form.tagsInput"
            class="grid-span-full"
            label="Теги"
            placeholder="например: касса, стандарты, клиентский сервис"
          />
          <Select
            v-model="form.availabilityMode"
            class="grid-span-full"
            label="Срок действия курса"
            :options="[
              { value: 'unlimited', label: 'Бессрочный курс' },
              { value: 'relative_days', label: 'N дней от назначения пользователю' },
              { value: 'fixed_dates', label: 'Фиксированные даты' },
            ]"
          />
          <Input
            v-if="form.availabilityMode === 'relative_days'"
            v-model="form.availabilityDays"
            type="number"
            min="1"
            max="3650"
            label="Количество дней"
            placeholder="Например, 90"
          />
          <Input
            v-if="form.availabilityMode === 'fixed_dates'"
            v-model="form.availabilityFrom"
            type="datetime-local"
            label="Дата начала действия"
          />
          <Input
            v-if="form.availabilityMode === 'fixed_dates'"
            v-model="form.availabilityTo"
            type="datetime-local"
            label="Дата окончания действия"
          />
        </div>
      </Card>

      <Card v-if="currentStep === 2 && isEditMode && course" class="sections-card">
        <div class="step-card-header">
          <h2>Шаг 2. Темы курса и подтемы</h2>
          <p>Каждая тема курса содержит подтемы и при необходимости завершается своим тестом.</p>
        </div>

        <div v-if="publicationErrorsForDisplay.length > 0" class="publication-errors">
          <h3>Что нужно исправить перед публикацией</h3>
          <ul>
            <li v-for="(errorText, index) in publicationErrorsForDisplay" :key="`${index}-${errorText}`">
              {{ errorText }}
            </li>
          </ul>
        </div>

        <div v-if="!course.sections || course.sections.length === 0" class="empty-sections">
          <p>Темы курса ещё не добавлены.</p>
        </div>

        <draggable v-model="course.sections" item-key="id" handle=".section-drag-handle" class="sections-list" @end="handleSectionsReorder">
          <template #item="{ element: section }">
          <div class="section-item">
            <!-- Строка раздела -->
            <div class="section-row">
              <span class="section-order">{{ section.orderIndex }}</span>
              <div class="section-info">
                <span class="section-name">{{ section.title }}</span>
                <span v-if="!section.isRequired" class="section-badge-optional">необязательная</span>
                <span v-if="!section.assessmentId" class="section-badge-error">нет теста</span>
                <span v-else class="section-badge-ok">тест привязан</span>
              </div>
              <div class="section-actions">
                <button
                  v-if="(course.sections || []).length > 1"
                  type="button"
                  class="drag-handle section-drag-handle"
                  title="Перетащите для изменения порядка"
                >
                  ↕
                </button>
                <button
                  v-if="(course.sections || []).length > 1"
                  type="button"
                  class="reorder-fallback-btn"
                  :disabled="!canMoveSection(section.id, -1)"
                  @click="moveSectionByOffset(section.id, -1)"
                >
                  ↑
                </button>
                <button
                  v-if="(course.sections || []).length > 1"
                  type="button"
                  class="reorder-fallback-btn"
                  :disabled="!canMoveSection(section.id, 1)"
                  @click="moveSectionByOffset(section.id, 1)"
                >
                  ↓
                </button>
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
                <Input v-model="sectionForms[section.id].title" label="Название темы курса" :error="sectionErrors[section.id]?.title" required />
                <Input v-model="sectionForms[section.id].orderIndex" type="number" min="1" label="Порядок" />
                <Select
                  v-model="sectionForms[section.id].assessmentId"
                  label="Проверочный тест темы курса"
                  :options="assessmentOptions"
                  placeholder="Выберите тест"
                />
                <div class="inline-actions">
                  <Button size="sm" variant="secondary" @click="openAssessmentEditor({ type: 'section', id: section.id })">Создать тест</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    :disabled="!sectionForms[section.id].assessmentId"
                    @click="openAssessmentEditor({ type: 'section', id: section.id }, sectionForms[section.id].assessmentId)"
                  >
                    Редактировать тест
                  </Button>
                </div>
                <Input v-model="sectionForms[section.id].estimatedMinutes" type="number" min="1" max="1440" label="Время (мин.)" />
                <div class="field-checkbox">
                  <label class="switch-label">
                    <input v-model="sectionForms[section.id].isRequired" type="checkbox" />
                    <span>Обязательная тема курса</span>
                  </label>
                </div>
                <Textarea v-model="sectionForms[section.id].description" class="grid-span-full" label="Описание" :rows="2" />
              </div>
              <div class="section-edit-actions">
                <Button size="sm" icon="save" :loading="updatingSectionId === section.id" @click="saveSection(section.id)"
                  >Сохранить тему курса</Button
                >
              </div>
            </div>

            <!-- Темы раздела -->
            <div class="topics-container">
              <div v-if="!section.topics || section.topics.length === 0" class="empty-topics">Подтем пока нет.</div>
              <draggable
                v-else
                v-model="section.topics"
                item-key="id"
                handle=".topic-drag-handle"
                class="topics-list"
                @end="() => handleTopicsReorder(section)"
              >
                <template #item="{ element: topic }">
                <div class="topic-item">
                  <div class="topic-row">
                    <span class="topic-order">{{ topic.orderIndex }}</span>
                    <div class="topic-info">
                      <span class="topic-name">{{ topic.title }}</span>
                      <span v-if="!topic.isRequired" class="topic-badge topic-badge-optional">необязательная</span>
                      <span v-if="topic.hasMaterial" class="topic-badge">материал</span>
                      <span v-if="topic.assessmentId" class="topic-badge">тест</span>
                    </div>
                    <div class="topic-actions">
                      <button
                        v-if="(section.topics || []).length > 1"
                        type="button"
                        class="drag-handle topic-drag-handle"
                        title="Перетащите для изменения порядка"
                      >
                        ↕
                      </button>
                      <button
                        v-if="(section.topics || []).length > 1"
                        type="button"
                        class="reorder-fallback-btn"
                        :disabled="!canMoveTopic(section.id, topic.id, -1)"
                        @click="moveTopicByOffset(section.id, topic.id, -1)"
                      >
                        ↑
                      </button>
                      <button
                        v-if="(section.topics || []).length > 1"
                        type="button"
                        class="reorder-fallback-btn"
                        :disabled="!canMoveTopic(section.id, topic.id, 1)"
                        @click="moveTopicByOffset(section.id, topic.id, 1)"
                      >
                        ↓
                      </button>
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
                      <Input v-model="topicForms[topic.id].title" label="Название подтемы" :error="topicErrors[topic.id]?.title" required />
                      <Input v-model="topicForms[topic.id].orderIndex" type="number" min="1" label="Порядок" />
                      <Select
                        v-model="topicForms[topic.id].assessmentId"
                        label="Тест подтемы"
                        :options="assessmentOptions"
                        placeholder="Без теста"
                      />
                      <div class="inline-actions">
                        <Button size="sm" variant="secondary" @click="openAssessmentEditor({ type: 'topic', id: topic.id })">Создать тест</Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          :disabled="!topicForms[topic.id].assessmentId"
                          @click="openAssessmentEditor({ type: 'topic', id: topic.id }, topicForms[topic.id].assessmentId)"
                        >
                          Редактировать тест
                        </Button>
                      </div>
                      <div class="field-checkbox">
                        <label class="switch-label">
                          <input v-model="topicForms[topic.id].isRequired" type="checkbox" />
                          <span>Обязательная подтема</span>
                        </label>
                      </div>
                      <div class="field-checkbox">
                        <label class="switch-label">
                          <input v-model="topicForms[topic.id].hasMaterial" type="checkbox" />
                          <span>Есть материал</span>
                        </label>
                      </div>
                      <Textarea
                        v-if="topicForms[topic.id].hasMaterial"
                        v-model="topicForms[topic.id].content"
                        class="grid-span-full"
                        label="Контент подтемы"
                        :rows="5"
                      />
                    </div>
                    <div class="topic-edit-actions">
                      <Button size="sm" icon="save" :loading="updatingTopicId === topic.id" @click="saveTopic(topic.id)">Сохранить подтему</Button>
                    </div>
                  </div>
                </div>
              </template>
              </draggable>

              <!-- Добавить тему -->
              <div v-if="newTopics[section.id]" class="new-topic">
                <h4>Новая подтема</h4>
                <div class="topic-edit-grid">
                  <Input v-model="newTopics[section.id].title" label="Название подтемы" :error="newTopicErrors[section.id]?.title" required />
                  <Input v-model="newTopics[section.id].orderIndex" type="number" min="1" label="Порядок" />
                  <Select v-model="newTopics[section.id].assessmentId" label="Тест подтемы" :options="assessmentOptions" placeholder="Без теста" />
                  <div class="inline-actions">
                    <Button size="sm" variant="secondary" @click="openAssessmentEditor({ type: 'newTopic', id: section.id })">Создать тест</Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      :disabled="!newTopics[section.id].assessmentId"
                      @click="openAssessmentEditor({ type: 'newTopic', id: section.id }, newTopics[section.id].assessmentId)"
                    >
                      Редактировать тест
                    </Button>
                  </div>
                  <div class="field-checkbox">
                    <label class="switch-label">
                      <input v-model="newTopics[section.id].isRequired" type="checkbox" />
                      <span>Обязательная подтема</span>
                    </label>
                  </div>
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
                    label="Контент подтемы"
                    :rows="4"
                  />
                </div>
                <div class="new-topic-actions">
                  <Button size="sm" icon="plus" :loading="creatingTopicSectionId === section.id" @click="addTopic(section.id)"
                    >Добавить подтему</Button
                  >
                </div>
              </div>
            </div>
          </div>
        </template>
        </draggable>

        <div class="new-section">
          <h3>Новая тема курса</h3>
          <div class="section-edit-grid">
            <Input v-model="newSection.title" label="Название темы курса" :error="newSectionErrors.title" required />
            <Input v-model="newSection.orderIndex" type="number" min="1" label="Порядок" />
            <Select v-model="newSection.assessmentId" label="Проверочный тест темы курса" :options="assessmentOptions" placeholder="Выберите тест" />
            <div class="inline-actions">
              <Button size="sm" variant="secondary" @click="openAssessmentEditor({ type: 'newSection' })">Создать тест</Button>
              <Button
                size="sm"
                variant="ghost"
                :disabled="!newSection.assessmentId"
                @click="openAssessmentEditor({ type: 'newSection' }, newSection.assessmentId)"
              >
                Редактировать тест
              </Button>
            </div>
            <Input v-model="newSection.estimatedMinutes" type="number" min="1" max="1440" label="Время (мин.)" />
            <div class="field-checkbox">
              <label class="switch-label">
                <input v-model="newSection.isRequired" type="checkbox" />
                <span>Обязательная тема курса</span>
              </label>
            </div>
          </div>
          <div class="new-section-actions">
            <Button icon="plus" :loading="creatingSection" @click="addSection">Добавить тему курса</Button>
          </div>
        </div>
      </Card>

      <Card v-if="currentStep === 3 && isEditMode && course" class="editor-card final-assessment-card">
        <div class="step-card-header">
          <h2>Шаг 3. Итоговая аттестация</h2>
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

      <Card v-if="currentStep === 4 && isEditMode && course" class="preview-card">
        <div class="step-card-header">
          <h2>Шаг 4. Предпросмотр курса</h2>
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
            <span class="preview-label">Обязательных тем</span>
            <strong>{{ previewStats.requiredThemesCount }}</strong>
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

      <div class="wizard-navigation">
        <Button v-if="currentStep > 1" variant="secondary" @click="goToPrevStep">Назад</Button>
        <div class="spacer"></div>
        <Button v-if="currentStep < wizardSteps.length" @click="goToNextStep" :disabled="!canProceed">Далее</Button>
        <Button
          v-else-if="course?.status === 'published'"
          variant="success"
          icon="send"
          :loading="publishing"
          @click="handlePublish"
          :disabled="publicationErrorsForDisplay.length > 0"
        >
          Применить изменения
        </Button>
        <Button v-else-if="course?.status === 'published'" variant="secondary" icon="archive" :loading="archiving" @click="handleArchive">Закрыть курс</Button>
      </div>

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

        <div class="targets-actions">
          <Button :loading="savingTargets" icon="save" @click="saveTargets">Сохранить назначения</Button>
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
      <Card v-if="currentStep === 4 && isEditMode && course" class="participants-card">
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
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import draggable from "vuedraggable";
import { Badge, Button, Card, Input, Modal, Preloader, Select, Textarea } from "../components/ui";
import AssessmentForm from "../components/AssessmentForm.vue";
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
const previewWarnings = ref([]);
const tempIdCounter = ref(-1);

const sectionForms = ref({});
const sectionErrors = ref({});
const sectionEditingId = ref(null);
const updatingSectionId = ref(null);
const deletingSectionId = ref(null);
const creatingSection = ref(false);
const newSection = ref({ title: "", orderIndex: "", assessmentId: "", isRequired: true, estimatedMinutes: "", description: "" });
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

const form = ref({
  title: "",
  description: "",
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
const savingTargets = ref(false);
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

const currentStep = ref(1);
const wizardSteps = [
  { id: 1, title: "Основная информация" },
  { id: 2, title: "Темы курса" },
  { id: 3, title: "Итоговая аттестация" },
  { id: 4, title: "Предпросмотр" },
];
const canProceed = computed(() => {
  if (currentStep.value === 1) {
    return Boolean(form.value.title?.trim());
  }
  if (currentStep.value === 3) {
    return Boolean(form.value.finalAssessmentId);
  }
  return true;
});

const publicationErrorsForDisplay = computed(() => publicationErrors.value.map((item) => formatPublicationError(item)));
const selectedFinalAssessmentLabel = computed(() => {
  const currentValue = String(form.value.finalAssessmentId || "");
  const option = assessmentOptions.value.find((item) => item.value === currentValue);
  return option?.label || "Не выбрана";
});

const assessmentTypeLabel = (type) => {
  const labels = {
    section: "теста темы курса",
    newSection: "теста темы курса",
    topic: "теста подтемы",
    newTopic: "теста подтемы",
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
      orderIndex: String(section.orderIndex || ""),
      assessmentId: section.assessmentId ? String(section.assessmentId) : "",
      isRequired: Boolean(section.isRequired),
      estimatedMinutes: section.estimatedMinutes ? String(section.estimatedMinutes) : "",
    };
    for (const topic of section.topics || []) {
      nextTopicForms[topic.id] = {
        title: topic.title || "",
        orderIndex: String(topic.orderIndex || ""),
        isRequired: topic.isRequired !== false,
        hasMaterial: Boolean(topic.hasMaterial),
        content: topic.content || "",
        assessmentId: topic.assessmentId ? String(topic.assessmentId) : "",
      };
    }
    nextNewTopics[section.id] = newTopics.value[section.id] || { title: "", orderIndex: "", isRequired: true, hasMaterial: false, content: "", assessmentId: "" };
  }
  sectionForms.value = nextForms;
  sectionErrors.value = {};
  topicForms.value = nextTopicForms;
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
    form.value = {
      title: "",
      description: "",
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

const handleCoverFileChange = (event) => {
  const file = event?.target?.files?.[0] || null;
  selectedCoverFile.value = file;
};

const handleCoverUpload = async () => {
  if (!isEditMode.value || !courseId.value) {
    showToast("Сначала сохраните курс, затем загрузите обложку", "error");
    return;
  }
  if (!selectedCoverFile.value) {
    showToast("Выберите файл обложки", "error");
    return;
  }

  uploadingCover.value = true;
  try {
    const response = await uploadCourseCover(courseId.value, selectedCoverFile.value);
    const nextCoverUrl = response?.coverUrl || response?.course?.coverUrl || null;
    if (nextCoverUrl) {
      form.value.coverUrl = nextCoverUrl;
    }
    selectedCoverFile.value = null;
    await loadCourse();
    showToast("Обложка курса загружена", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось загрузить обложку"), "error");
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
    coverUrl: form.value.coverUrl.trim() || null,
    category: form.value.category.trim() || null,
    tags: parseTags(form.value.tagsInput),
    finalAssessmentId: sanitizeOptionalNumber(form.value.finalAssessmentId),
    availabilityMode: form.value.availabilityMode || "unlimited",
    availabilityDays: form.value.availabilityMode === "relative_days" ? sanitizeOptionalNumber(form.value.availabilityDays) : null,
    availabilityFrom: form.value.availabilityMode === "fixed_dates" && form.value.availabilityFrom ? new Date(form.value.availabilityFrom).toISOString() : null,
    availabilityTo: form.value.availabilityMode === "fixed_dates" && form.value.availabilityTo ? new Date(form.value.availabilityTo).toISOString() : null,
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
  if (stepId > 1 && !course.value && !isEditMode.value) {
    showToast("Сначала сохраните основную информацию о курсе", "error");
    return;
  }
  if (stepId > currentStep.value && (currentStep.value === 1 || currentStep.value === 3)) {
    const saved = await saveCourse();
    if (!saved) return;
  }
  currentStep.value = stepId;
  if (currentStep.value === 4 && isEditMode.value) {
    await loadParticipants();
  }
};

const goToPrevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value -= 1;
  }
};

const goToNextStep = async () => {
  if (currentStep.value === 1 || currentStep.value === 3) {
    const saved = await saveCourse();
    if (!saved) return;
  }
  if (currentStep.value < wizardSteps.length) {
    currentStep.value += 1;
  }
  if (currentStep.value === 4 && isEditMode.value) {
    await loadParticipants();
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
  } else if (target.type === "topic" && target.id && topicForms.value[target.id]) {
    topicForms.value[target.id].assessmentId = nextId;
    await saveTopic(target.id);
  } else if (target.type === "newSection") {
    newSection.value.assessmentId = nextId;
    showToast("Тест привязан к новой теме курса", "success");
  } else if (target.type === "newTopic" && target.id && newTopics.value[target.id]) {
    newTopics.value[target.id].assessmentId = nextId;
    showToast("Тест привязан к новой подтеме", "success");
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

const resetNewSection = () => {
  newSection.value = { title: "", orderIndex: "", assessmentId: "", isRequired: true, estimatedMinutes: "", description: "" };
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
      orderIndex: sanitizeOptionalNumber(newSection.value.orderIndex),
      assessmentId: sanitizeOptionalNumber(newSection.value.assessmentId),
      isRequired: Boolean(newSection.value.isRequired),
      estimatedMinutes: sanitizeOptionalNumber(newSection.value.estimatedMinutes),
    };
    const response = await createCourseSection(courseId.value, payload);
    course.value = response.course;
    syncSectionForms(response.course.sections || []);
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
      orderIndex: sanitizeOptionalNumber(formState.orderIndex),
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
  if (!formState.hasMaterial && !sanitizeOptionalNumber(formState.assessmentId)) {
    showToast("Подтема должна содержать материал или тест", "error");
    return;
  }
  creatingTopicSectionId.value = sectionId;
  try {
    const payload = {
      title: formState.title.trim(),
      orderIndex: sanitizeOptionalNumber(formState.orderIndex),
      isRequired: Boolean(formState.isRequired),
      hasMaterial: Boolean(formState.hasMaterial),
      content: formState.hasMaterial ? (formState.content || "").trim() || null : null,
      assessmentId: sanitizeOptionalNumber(formState.assessmentId),
    };
    const response = await createCourseTopic(sectionId, payload);
    course.value = response.course;
    syncSectionForms(response.course.sections || []);
    newTopics.value[sectionId] = { title: "", orderIndex: "", isRequired: true, hasMaterial: false, content: "", assessmentId: "" };
    newTopicErrors.value = { ...newTopicErrors.value, [sectionId]: null };
    showToast("Подтема добавлена", "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Не удалось добавить подтему"), "error");
  } finally {
    creatingTopicSectionId.value = null;
  }
};

const saveTopic = async (topicId) => {
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
      orderIndex: sanitizeOptionalNumber(formState.orderIndex),
      isRequired: Boolean(formState.isRequired),
      hasMaterial: Boolean(formState.hasMaterial),
      content: formState.hasMaterial ? (formState.content || "").trim() || null : null,
      assessmentId: sanitizeOptionalNumber(formState.assessmentId),
    };
    const response = await updateCourseTopic(topicId, payload);
    course.value = response.course;
    syncSectionForms(response.course.sections || []);
    topicEditingId.value = null;
    showToast("Подтема обновлена", "success");
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

watch(
  () => currentStep.value,
  async (step) => {
    if (step === 4) {
      await loadPreview();
    }
  },
);

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

.wizard-card,
.editor-card,
.sections-card,
.final-assessment-card,
.preview-card {
  margin-bottom: 20px;
}

.wizard-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
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

.wizard-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.wizard-step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--divider);
  border-radius: 12px;
  background: var(--surface, #fff);
  text-align: left;
}

.wizard-step.active {
  border-color: var(--primary, #6366f1);
  background: rgba(99, 102, 241, 0.08);
}

.wizard-step.completed {
  border-color: rgba(34, 197, 94, 0.45);
}

.step-number {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.step-label {
  font-size: 14px;
  font-weight: 600;
}

.cover-upload {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cover-upload-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cover-upload-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.wizard-navigation {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 20px;
}

.spacer {
  flex: 1;
}

.wizard-step-index {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
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
}
</style>
