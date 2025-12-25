<template>
  <div class="theory-view">
    <div class="page-header">
      <div class="page-header-left">
        <Button variant="ghost" icon="arrow-left" @click="goBack"> Назад </Button>
        <div class="page-header-texts">
          <h1>Теория аттестации</h1>
          <p>Настройте обязательные и дополнительные блоки, сохраните черновик и опубликуйте версию.</p>
        </div>
      </div>
      <div class="page-actions">
        <Button icon="refresh-ccw" variant="secondary" size="sm" :disabled="loading" @click="loadTheory"> Обновить </Button>
        <Button icon="save" variant="secondary" size="sm" :loading="saving" :disabled="loading || publishing" @click="handleSaveDraft">
          Сохранить черновик
        </Button>
        <Button
          icon="bookmark-check"
          variant="primary"
          size="sm"
          :loading="publishing && publishMode === 'current'"
          :disabled="loading || saving || publishing"
          @click="() => handlePublish('current')"
        >
          Опубликовать текущую
        </Button>
        <Button
          icon="sparkles"
          variant="success"
          size="sm"
          :loading="publishing && publishMode === 'new'"
          :disabled="loading || saving || publishing"
          @click="() => handlePublish('new')"
        >
          Новая версия
        </Button>
      </div>
    </div>

    <Preloader v-if="loading" />

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <Button variant="primary" icon="refresh-cw" @click="loadTheory"> Повторить </Button>
    </div>

    <div v-else class="theory-content">
      <Card class="version-card">
        <div class="version-info-grid">
          <div class="version-block">
            <p class="version-label">Текущая версия</p>
            <h3 class="version-value">
              {{ currentVersionLabel }}
            </h3>
            <p class="version-meta">
              {{ currentVersionMeta }}
            </p>
          </div>
          <div class="version-block">
            <p class="version-label">Черновик</p>
            <h3 class="version-value">
              {{ draftVersionLabel }}
            </h3>
            <p class="version-meta">
              {{ draftVersionMeta }}
            </p>
          </div>
          <div class="version-block">
            <p class="version-label">Статус</p>
            <h3 class="version-value">
              {{ formStatusLabel }}
            </h3>
            <p class="version-meta">
              {{ formStatusHint }}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div class="section-header">
          <div>
            <h2>Обязательные блоки</h2>
            <p>Сотрудник должен пройти каждый из них, иначе попытка недоступна.</p>
            <p v-if="requiredReadingSeconds > 0" class="reading-summary">
              Среднее время чтения текстовых блоков: {{ formatReadingTime(requiredReadingSeconds) }}
            </p>
          </div>
          <div class="section-actions">
            <Button size="sm" variant="secondary" icon="text" @click="addRequiredBlock('text')"> Текст </Button>
            <Button size="sm" variant="secondary" icon="video" @click="addRequiredBlock('video')"> Видео </Button>
            <Button size="sm" variant="secondary" icon="link" @click="addRequiredBlock('link')"> Ссылка </Button>
          </div>
        </div>

        <draggable v-model="requiredBlocks" :animation="200" handle=".drag-handle" item-key="uid" class="blocks-list">
          <template #item="{ element: block, index }">
            <div class="block-card">
              <div class="block-card-header">
                <div class="block-header-left">
                  <div class="drag-handle">
                    <GripVertical :size="20" />
                  </div>
                  <div>
                    <p class="block-order">#{{ index + 1 }}</p>
                    <p class="block-type">{{ getBlockTypeLabel(block.type) }}</p>
                  </div>
                </div>
                <Button icon="trash" variant="ghost" size="sm" :disabled="requiredBlocks.length === 1" @click="removeBlock('required', block.uid)">
                  Удалить
                </Button>
              </div>

              <div class="block-grid">
                <Input v-model="block.title" label="Заголовок" required placeholder='Например, "Введение"' />
                <Select v-model="block.type" label="Тип блока" :options="blockTypeOptions" />
              </div>

              <FullscreenTextarea
                v-model="block.content"
                :label="block.type === 'text' ? 'Содержимое' : 'Описание (опционально)'"
                :required="block.type === 'text'"
                :rows="block.type === 'text' ? 6 : 3"
                placeholder="Опишите содержание блока"
              />

              <Input v-if="block.type === 'video'" v-model="block.videoUrl" label="Ссылка на видео" required placeholder="https://" />

              <Input v-if="block.type === 'link'" v-model="block.externalUrl" label="Ссылка на материал" required placeholder="https://" />
            </div>
          </template>
        </draggable>
      </Card>

      <Card>
        <div class="section-header">
          <div>
            <h2>Дополнительные материалы</h2>
            <p>Отображаются в аккордеоне и не влияют на допуск.</p>
            <p v-if="optionalReadingSeconds > 0" class="reading-summary">
              Среднее время чтения текстовых блоков: {{ formatReadingTime(optionalReadingSeconds) }}
            </p>
          </div>
          <div class="section-actions">
            <Button size="sm" variant="secondary" icon="text" @click="addOptionalBlock('text')"> Текст </Button>
            <Button size="sm" variant="secondary" icon="video" @click="addOptionalBlock('video')"> Видео </Button>
            <Button size="sm" variant="secondary" icon="link" @click="addOptionalBlock('link')"> Ссылка </Button>
            <Button size="sm" variant="ghost" icon="chevrons-up-down" @click="optionalExpanded = !optionalExpanded">
              {{ optionalExpanded ? "Свернуть" : "Развернуть" }}
            </Button>
          </div>
        </div>

        <div v-if="!optionalBlocks.length" class="empty-blocks">Нет дополнительных блоков</div>

        <draggable
          v-else
          v-model="optionalBlocks"
          :animation="200"
          handle=".drag-handle"
          item-key="uid"
          class="blocks-list"
          v-show="optionalExpanded"
        >
          <template #item="{ element: block, index }">
            <div class="block-card">
              <div class="block-card-header">
                <div class="block-header-left">
                  <div class="drag-handle">
                    <GripVertical :size="20" />
                  </div>
                  <div>
                    <p class="block-order">#{{ index + 1 }}</p>
                    <p class="block-type">{{ getBlockTypeLabel(block.type) }}</p>
                  </div>
                </div>
                <Button icon="trash" variant="ghost" size="sm" @click="removeBlock('optional', block.uid)"> Удалить </Button>
              </div>

              <div class="block-grid">
                <Input v-model="block.title" label="Заголовок" required placeholder="Название блока" />
                <Select v-model="block.type" label="Тип блока" :options="blockTypeOptions" />
              </div>

              <FullscreenTextarea
                v-model="block.content"
                :label="block.type === 'text' ? 'Содержимое' : 'Описание (опционально)'"
                :rows="block.type === 'text' ? 6 : 3"
                :required="block.type === 'text'"
                placeholder="Опишите содержание блока"
              />

              <Input v-if="block.type === 'video'" v-model="block.videoUrl" label="Ссылка на видео" required placeholder="https://" />

              <Input v-if="block.type === 'link'" v-model="block.externalUrl" label="Ссылка на материал" required placeholder="https://" />
            </div>
          </template>
        </draggable>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import draggable from "vuedraggable";
import { GripVertical } from "lucide-vue-next";
import Button from "../components/ui/Button.vue";
import Card from "../components/ui/Card.vue";
import Input from "../components/ui/Input.vue";
import Select from "../components/ui/Select.vue";
import Textarea from "../components/ui/Textarea.vue";
import FullscreenTextarea from "../components/ui/FullscreenTextarea.vue";
import Preloader from "../components/ui/Preloader.vue";
import { getAdminTheory, saveTheoryDraft, publishTheory } from "../api/theory";
import { useToast } from "../composables/useToast";
import { calculateReadingSeconds, formatReadingTime, sumReadingSeconds } from "../utils/readingTime";

const router = useRouter();
const route = useRoute();
const { showToast } = useToast();

const loading = ref(true);
const saving = ref(false);
const publishing = ref(false);
const publishMode = ref(null);
const error = ref(null);

const currentVersion = ref(null);
const draftVersion = ref(null);
const requiredBlocks = ref([]);
const optionalBlocks = ref([]);
const optionalExpanded = ref(true);

const blockTypeOptions = [
  { value: "text", label: "Текст" },
  { value: "video", label: "Видео" },
  { value: "link", label: "Ссылка" },
];

const assessmentId = computed(() => Number(route.params.id));

const currentVersionLabel = computed(() => {
  if (!currentVersion.value) {
    return "—";
  }
  return `v${currentVersion.value.versionNumber}`;
});

const currentVersionMeta = computed(() => {
  if (!currentVersion.value) {
    return "Нет опубликованной теории";
  }
  const date = currentVersion.value.publishedAt ? new Date(currentVersion.value.publishedAt) : null;
  const published = date ? date.toLocaleString("ru-RU") : "ожидает публикации";
  return `Опубликована: ${published}`;
});

const draftVersionLabel = computed(() => {
  if (!draftVersion.value) {
    return "Не создан";
  }
  return `v${draftVersion.value.versionNumber}`;
});

const draftVersionMeta = computed(() => {
  if (!draftVersion.value) {
    return "Начните с любого блока и сохраните черновик";
  }
  const updated = draftVersion.value.updatedAt ? new Date(draftVersion.value.updatedAt).toLocaleString("ru-RU") : "—";
  return `Обновлён: ${updated}`;
});

const formStatusLabel = computed(() => {
  if (!requiredBlocks.value.length) {
    return "Недостаточно блоков";
  }
  if (draftVersion.value) {
    return "Черновик готов";
  }
  return "Изменения не сохранены";
});

const formStatusHint = computed(() => {
  if (!requiredBlocks.value.length) {
    return "Добавьте минимум один обязательный блок";
  }
  if (draftVersion.value) {
    return "Сохранённый черновик готов к публикации";
  }
  return "Сохраните изменения, чтобы опубликовать";
});

const requiredReadingSeconds = computed(() => sumReadingSeconds(requiredBlocks.value));
const optionalReadingSeconds = computed(() => sumReadingSeconds(optionalBlocks.value));

const goBack = () => {
  router.push(`/assessments/${assessmentId.value}`);
};

const createBlock = (type = "text") => ({
  uid: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  title: "",
  type,
  content: "",
  videoUrl: "",
  externalUrl: "",
  metadata: {},
});

const mapBlock = (block) => ({
  uid: `${block.id || Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  title: block.title || "",
  type: block.type || "text",
  content: block.content || "",
  videoUrl: block.videoUrl || "",
  externalUrl: block.externalUrl || "",
  metadata: block.metadata || {},
});

const applyVersion = (version) => {
  if (!version) {
    requiredBlocks.value = [createBlock()];
    optionalBlocks.value = [];
    return;
  }

  requiredBlocks.value = (version.requiredBlocks || []).map(mapBlock);
  optionalBlocks.value = (version.optionalBlocks || []).map(mapBlock);

  if (!requiredBlocks.value.length) {
    requiredBlocks.value = [createBlock()];
  }
};

const loadTheory = async () => {
  loading.value = true;
  error.value = null;
  try {
    const data = await getAdminTheory(assessmentId.value);
    currentVersion.value = data.theory?.currentVersion || null;
    draftVersion.value = data.theory?.draftVersion || null;

    if (draftVersion.value) {
      applyVersion(draftVersion.value);
    } else if (currentVersion.value) {
      applyVersion(currentVersion.value);
    } else {
      applyVersion(null);
    }
  } catch (err) {
    console.error(err);
    error.value = err.response?.data?.error || "Не удалось загрузить теорию";
  } finally {
    loading.value = false;
  }
};

const addRequiredBlock = (type) => {
  requiredBlocks.value.push(createBlock(type));
};

const addOptionalBlock = (type) => {
  optionalBlocks.value.push(createBlock(type));
  optionalExpanded.value = true;
};

const removeBlock = (target, uid) => {
  const list = target === "required" ? requiredBlocks.value : optionalBlocks.value;
  if (target === "required" && list.length === 1) {
    showToast("Нужен минимум один обязательный блок", "warning");
    return;
  }
  const index = list.findIndex((block) => block.uid === uid);
  if (index > -1) {
    list.splice(index, 1);
  }
  if (target === "required" && requiredBlocks.value.length === 0) {
    requiredBlocks.value.push(createBlock());
  }
};

const getBlockTypeLabel = (type) => {
  const option = blockTypeOptions.find((item) => item.value === type);
  return option ? option.label : type;
};

const validateBlocks = () => {
  if (!requiredBlocks.value.length) {
    showToast("Добавьте хотя бы один обязательный блок", "error");
    return false;
  }

  const allBlocks = [
    ...requiredBlocks.value.map((block) => ({ ...block, isRequired: true })),
    ...optionalBlocks.value.map((block) => ({ ...block, isRequired: false })),
  ];

  for (const block of allBlocks) {
    if (!block.title.trim()) {
      showToast("У каждого блока должен быть заголовок", "error");
      return false;
    }
    if (block.type === "text" && !block.content.trim()) {
      showToast(`Блок "${block.title}" должен содержать текст`, "error");
      return false;
    }
    if (block.type === "video" && !block.videoUrl.trim()) {
      showToast(`Укажите ссылку на видео для блока "${block.title}"`, "error");
      return false;
    }
    if (block.type === "link" && !block.externalUrl.trim()) {
      showToast(`Укажите ссылку на материал для блока "${block.title}"`, "error");
      return false;
    }
  }

  return true;
};

const buildPayload = () => ({
  requiredBlocks: requiredBlocks.value.map((block) => ({
    title: block.title.trim(),
    type: block.type,
    content: block.type === "text" ? block.content.trim() : block.content?.trim() || "",
    videoUrl: block.type === "video" ? block.videoUrl.trim() : null,
    externalUrl: block.type === "link" ? block.externalUrl.trim() : null,
    metadata: block.metadata || {},
  })),
  optionalBlocks: optionalBlocks.value.map((block) => ({
    title: block.title.trim(),
    type: block.type,
    content: block.content?.trim() || "",
    videoUrl: block.type === "video" ? block.videoUrl.trim() : null,
    externalUrl: block.type === "link" ? block.externalUrl.trim() : null,
    metadata: block.metadata || {},
  })),
});

const persistDraft = async () => {
  const payload = buildPayload();
  const data = await saveTheoryDraft(assessmentId.value, payload);
  draftVersion.value = data.draft;
  applyVersion(data.draft);
  return data.draft;
};

const handleSaveDraft = async () => {
  if (!validateBlocks()) {
    return;
  }
  saving.value = true;
  try {
    await persistDraft();
    showToast("Черновик сохранён", "success");
  } catch (err) {
    console.error(err);
    const message = err.response?.data?.error || "Не удалось сохранить черновик";
    showToast(message, "error");
  } finally {
    saving.value = false;
  }
};

const handlePublish = async (mode) => {
  if (!validateBlocks()) {
    return;
  }
  publishing.value = true;
  publishMode.value = mode;
  try {
    await persistDraft();
    const result = await publishTheory(assessmentId.value, mode === "current" ? "current" : "new");
    currentVersion.value = result.version;
    draftVersion.value = null;
    applyVersion(result.version);
    showToast(result.createdNewVersion ? "Опубликована новая версия" : "Текущая версия обновлена", "success");
  } catch (err) {
    console.error(err);
    const message = err.response?.data?.error || "Не удалось опубликовать теорию";
    showToast(message, "error");
  } finally {
    publishing.value = false;
    publishMode.value = null;
  }
};

onMounted(() => {
  loadTheory();
});
</script>

<style scoped>
.theory-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.page-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-header-texts h1 {
  margin: 0 0 4px 0;
  font-size: 26px;
  font-weight: 700;
}

.page-header-texts p {
  margin: 0;
  color: var(--text-secondary);
}

.page-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.theory-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.version-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}

.version-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.version-label {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  margin: 0;
}

.version-value {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.version-meta {
  margin: 0;
  color: var(--text-secondary);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.section-header h2 {
  margin: 0;
  font-size: 20px;
}

.section-header p {
  margin: 4px 0 0 0;
  color: var(--text-secondary);
}

.reading-summary {
  margin-top: 8px !important;
  padding: 8px 12px;
  background: #f0f9ff;
  border-left: 3px solid #3b82f6;
  border-radius: 4px;
  font-size: 14px;
  color: #1e40af;
  font-weight: 500;
}

.section-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.blocks-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.block-card {
  border: 1px solid var(--divider);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background-color: var(--bg-secondary);
}

.block-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.block-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.drag-handle {
  cursor: grab;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.drag-handle:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.drag-handle:active {
  cursor: grabbing;
}

.block-order {
  margin: 0;
  font-weight: 600;
}

.block-type {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.block-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.empty-blocks {
  text-align: center;
  padding: 24px;
  color: var(--text-secondary);
}

.error-state {
  text-align: center;
  padding: 40px;
  border: 1px dashed var(--divider);
  border-radius: 12px;
}

.error-state p {
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .page-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .block-card {
    padding: 16px;
  }
}
</style>
