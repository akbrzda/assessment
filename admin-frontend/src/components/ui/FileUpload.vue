<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-sm font-medium text-foreground leading-none">
      {{ label }}
      <span v-if="required" class="text-destructive ml-0.5">*</span>
    </label>

    <!-- Drag & Drop зона -->
    <div
      v-if="!buttonOnly"
      :class="[
        'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
        isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-ring hover:bg-accent/30',
        error && 'border-destructive',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
      ]"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
      @click="!disabled && triggerInput()"
    >
      <div :class="['flex items-center justify-center w-12 h-12 rounded-xl', isDragging ? 'bg-primary/10' : 'bg-muted']">
        <Icon name="UploadCloud" :size="24" :class="isDragging ? 'text-primary' : 'text-muted-foreground'" />
      </div>
      <div>
        <p class="text-sm font-medium text-foreground">
          Перетащите файлы сюда
          <span class="text-primary">или нажмите для выбора</span>
        </p>
        <p v-if="accept || maxSizeMb" class="text-xs text-muted-foreground mt-1">
          {{ acceptHint }}
        </p>
      </div>
    </div>

    <!-- Кнопка-вариант -->
    <div v-if="buttonOnly" class="flex items-center gap-3">
      <button
        type="button"
        :disabled="disabled"
        :class="[
          'inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-background text-sm font-medium text-foreground',
          'hover:bg-accent transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
        ]"
        @click="triggerInput"
      >
        <Icon name="Upload" :size="15" />
        {{ buttonLabel }}
      </button>
      <span class="text-sm text-muted-foreground">{{ buttonFileName }}</span>
    </div>

    <input ref="inputRef" type="file" :accept="accept" :multiple="multiple" :disabled="disabled" class="hidden" @change="onFileChange" />

    <!-- Список файлов с превью и статусами -->
    <div v-if="files.length" class="flex flex-col gap-2 mt-1">
      <div v-for="(file, index) in files" :key="index" class="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
        <!-- Превью или иконка типа -->
        <div class="shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
          <img v-if="file.preview" :src="file.preview" :alt="file.name" class="w-full h-full object-cover" />
          <Icon v-else :name="fileIcon(file.type)" :size="20" class="text-muted-foreground" />
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-foreground truncate">{{ file.name }}</p>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-xs text-muted-foreground">{{ formatSize(file.size) }}</span>

            <!-- Прогресс загрузки -->
            <template v-if="file.status === 'uploading'">
              <div class="flex-1 h-1 bg-muted rounded-full overflow-hidden max-w-[100px]">
                <div class="h-full bg-primary rounded-full transition-all duration-300" :style="{ width: `${file.progress || 0}%` }" />
              </div>
              <span class="text-xs text-muted-foreground">{{ file.progress || 0 }}%</span>
            </template>

            <span v-else-if="file.status === 'success'" class="text-xs text-accent-green flex items-center gap-1">
              <Icon name="CircleCheck" :size="12" /> Загружено
            </span>
            <span v-else-if="file.status === 'error'" class="text-xs text-destructive flex items-center gap-1">
              <Icon name="CircleX" :size="12" /> Ошибка
            </span>
          </div>
        </div>

        <button
          type="button"
          class="shrink-0 text-muted-foreground hover:text-foreground transition bg-transparent border-none cursor-pointer p-1"
          @click="removeFile(index)"
        >
          <Icon name="X" :size="16" />
        </button>
      </div>
    </div>

    <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-muted-foreground">{{ hint }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import Icon from "./Icon.vue";

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  label: String,
  error: String,
  hint: String,
  accept: String,
  multiple: Boolean,
  buttonOnly: Boolean,
  buttonLabel: { type: String, default: "Загрузить файл" },
  maxSizeMb: { type: Number, default: null },
  disabled: Boolean,
  required: Boolean,
  preview: { type: Boolean, default: true },
});

const emit = defineEmits(["update:modelValue", "add", "remove"]);

const inputRef = ref(null);
const isDragging = ref(false);
const files = ref([]);

const triggerInput = () => inputRef.value?.click();

const buttonFileName = computed(() => {
  if (!props.buttonOnly) return "";
  return files.value[0]?.name ?? "Файл не выбран";
});

const acceptHint = computed(() => {
  const parts = [];
  if (props.accept) parts.push(`Форматы: ${props.accept}`);
  if (props.maxSizeMb) parts.push(`Макс. размер: ${props.maxSizeMb} МБ`);
  return parts.join(" · ");
});

const processFiles = (rawFiles) => {
  Array.from(rawFiles).forEach((raw) => {
    if (props.maxSizeMb && raw.size > props.maxSizeMb * 1024 * 1024) return;
    const entry = {
      name: raw.name,
      size: raw.size,
      type: raw.type,
      raw,
      status: null,
      progress: 0,
      preview: null,
    };
    if (props.preview && raw.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => (entry.preview = e.target.result);
      reader.readAsDataURL(raw);
    }
    if (!props.multiple) files.value = [entry];
    else files.value.push(entry);
    emit("add", raw);
  });
  emit(
    "update:modelValue",
    files.value.map((f) => f.raw),
  );
};

const onFileChange = (e) => processFiles(e.target.files);
const onDrop = (e) => {
  isDragging.value = false;
  processFiles(e.dataTransfer.files);
};

const removeFile = (index) => {
  const removed = files.value.splice(index, 1)[0];
  emit("remove", removed?.raw);
  emit(
    "update:modelValue",
    files.value.map((f) => f.raw),
  );
};

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};

const fileIcon = (type = "") => {
  if (type.startsWith("image/")) return "Image";
  if (type.includes("pdf")) return "FileText";
  if (type.includes("video")) return "Video";
  if (type.includes("zip") || type.includes("archive")) return "Archive";
  return "File";
};

// Публичный метод для обновления статуса конкретного файла
defineExpose({
  setFileStatus(index, status, progress = 100) {
    if (files.value[index]) {
      files.value[index].status = status;
      files.value[index].progress = progress;
    }
  },
});
</script>
