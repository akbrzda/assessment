<template>
  <div class="theory-builder">
    <section class="theory-section">
      <div class="section-header">
        <div>
          <h4>Обязательные блоки</h4>
          <p class="section-hint">Сотрудники должны изучить каждый блок, чтобы начать тест.</p>
          <p v-if="requiredReadingSeconds > 0" class="reading-summary">
            Среднее время чтения текстовых блоков: {{ formatReadingTime(requiredReadingSeconds) }}
          </p>
        </div>
        <div class="header-actions">
          <Button size="sm" variant="secondary" icon="text" @click="addRequiredBlock('text')"> Текст </Button>
          <Button size="sm" variant="secondary" icon="video" @click="addRequiredBlock('video')"> Видео </Button>
          <Button size="sm" variant="secondary" icon="link" @click="addRequiredBlock('link')"> Ссылка </Button>
        </div>
      </div>

      <draggable v-model="localValue.requiredBlocks" :animation="200" handle=".drag-handle" item-key="uid" class="blocks-list">
        <template #item="{ element: block, index }">
          <div class="block-card">
            <header class="block-header">
              <div class="block-header-left">
                <div class="drag-handle">
                  <GripVertical :size="20" />
                </div>
                <div>
                  <p class="block-label">Блок #{{ index + 1 }}</p>
                  <p class="block-type">{{ getTypeLabel(block.type) }}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" icon="trash" :disabled="localValue.requiredBlocks.length === 1" @click="removeRequiredBlock(index)">
                Удалить
              </Button>
            </header>

            <div class="block-grid">
              <Input v-model="block.title" label="Заголовок" placeholder="Например, «Введение»" required />
              <Select v-model="block.type" label="Тип" :options="typeOptions" />
            </div>

            <FullscreenTextarea
              v-model="block.content"
              :label="block.type === 'text' ? 'Текст блока' : 'Описание (опционально)'"
              :rows="block.type === 'text' ? 5 : 3"
              :required="block.type === 'text'"
            />
            <p v-if="block.type === 'text'" class="reading-hint">Среднее время чтения: {{ getBlockReadingTime(block) }}</p>

            <Input v-if="block.type === 'video'" v-model="block.videoUrl" label="Ссылка на видео" placeholder="https://..." required />
            <Input v-if="block.type === 'link'" v-model="block.externalUrl" label="Ссылка на материал" placeholder="https://..." required />
          </div>
        </template>
      </draggable>
    </section>

    <section class="theory-section">
      <div class="section-header">
        <div>
          <h4>Дополнительные материалы</h4>
          <p class="section-hint">Не влияют на допуск, отображаются в аккордеоне.</p>
          <p v-if="optionalReadingSeconds > 0" class="reading-summary">
            Среднее время чтения текстовых блоков: {{ formatReadingTime(optionalReadingSeconds) }}
          </p>
        </div>
        <div class="header-actions">
          <Button size="sm" variant="secondary" icon="text" @click="addOptionalBlock('text')"> Текст </Button>
          <Button size="sm" variant="secondary" icon="video" @click="addOptionalBlock('video')"> Видео </Button>
          <Button size="sm" variant="secondary" icon="link" @click="addOptionalBlock('link')"> Ссылка </Button>
        </div>
      </div>

      <div v-if="!localValue.optionalBlocks.length" class="empty-blocks">Дополнительных материалов нет</div>

      <draggable v-else v-model="localValue.optionalBlocks" :animation="200" handle=".drag-handle" item-key="uid" class="blocks-list">
        <template #item="{ element: block, index }">
          <div class="block-card optional">
            <header class="block-header">
              <div class="block-header-left">
                <div class="drag-handle">
                  <GripVertical :size="20" />
                </div>
                <div>
                  <p class="block-label">Блок #{{ index + 1 }}</p>
                  <p class="block-type">{{ getTypeLabel(block.type) }}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" icon="trash" @click="removeOptionalBlock(index)">Удалить</Button>
            </header>

            <div class="block-grid">
              <Input v-model="block.title" label="Заголовок" placeholder="Название блока" required />
              <Select v-model="block.type" label="Тип" :options="typeOptions" />
            </div>

            <FullscreenTextarea
              v-model="block.content"
              :label="block.type === 'text' ? 'Текст блока' : 'Описание (опционально)'"
              :rows="block.type === 'text' ? 5 : 3"
            />
            <p v-if="block.type === 'text'" class="reading-hint">Среднее время чтения: {{ getBlockReadingTime(block) }}</p>

            <Input v-if="block.type === 'video'" v-model="block.videoUrl" label="Ссылка на видео" placeholder="https://..." required />
            <Input v-if="block.type === 'link'" v-model="block.externalUrl" label="Ссылка на материал" placeholder="https://..." required />
          </div>
        </template>
      </draggable>
    </section>
  </div>
</template>

<script setup>
import { computed } from "vue";
import draggable from "vuedraggable";
import { GripVertical } from "lucide-vue-next";
import Input from "./ui/Input.vue";
import Select from "./ui/Select.vue";
import Textarea from "./ui/Textarea.vue";
import FullscreenTextarea from "./ui/FullscreenTextarea.vue";
import Button from "./ui/Button.vue";
import { cloneTheoryData, createTheoryBlock } from "../utils/theory";
import { calculateReadingSeconds, formatReadingTime, sumReadingSeconds } from "../utils/readingTime";

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      requiredBlocks: [],
      optionalBlocks: [],
    }),
  },
});

const emit = defineEmits(["update:modelValue"]);

const typeOptions = [
  { value: "text", label: "Текст" },
  { value: "video", label: "Видео" },
  { value: "link", label: "Ссылка" },
];

// Используем computed с getter/setter для избежания бесконечного цикла
const localValue = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const requiredReadingSeconds = computed(() => sumReadingSeconds(localValue.value.requiredBlocks));
const optionalReadingSeconds = computed(() => sumReadingSeconds(localValue.value.optionalBlocks));

const getTypeLabel = (type) => {
  const option = typeOptions.find((item) => item.value === type);
  return option ? option.label : type;
};

const addRequiredBlock = (type) => {
  localValue.value.requiredBlocks.push(createTheoryBlock(type));
};

const removeRequiredBlock = (index) => {
  if (localValue.value.requiredBlocks.length <= 1) {
    return;
  }
  localValue.value.requiredBlocks.splice(index, 1);
};

const addOptionalBlock = (type) => {
  localValue.value.optionalBlocks.push(createTheoryBlock(type));
};

const removeOptionalBlock = (index) => {
  localValue.value.optionalBlocks.splice(index, 1);
};

const getBlockReadingTime = (block) => formatReadingTime(calculateReadingSeconds(block.content || ""));
</script>

<style scoped>
.theory-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--divider);
}

.theory-section:last-of-type {
  border-bottom: none;
  padding-bottom: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.section-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-hint {
  margin: 4px 0 0 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.reading-summary,
.reading-hint {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.reading-hint {
  font-style: italic;
}

.header-actions {
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
  background-color: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s ease;
}

.block-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.block-card.optional {
  background-color: var(--bg-primary);
}

.block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.block-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.drag-handle {
  display: flex;
  align-items: center;
  cursor: grab;
  color: var(--text-secondary);
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.drag-handle:hover {
  color: var(--text-primary);
  background-color: var(--bg-hover);
}

.drag-handle:active {
  cursor: grabbing;
}

.block-label {
  margin: 0;
  font-weight: 600;
  color: var(--text-primary);
}

.block-type {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.block-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.empty-blocks {
  padding: 16px;
  border-radius: 12px;
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  text-align: center;
}

@media (max-width: 768px) {
  .block-card {
    padding: 16px;
  }
}
</style>
