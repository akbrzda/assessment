<template>
  <div class="wysiwyg-group">
    <label v-if="label" class="wysiwyg-label">
      {{ label }}
      <span v-if="required" class="wysiwyg-required">*</span>
    </label>

    <div class="wysiwyg-shell" :class="{ 'wysiwyg-shell-focused': isFocused, 'wysiwyg-shell-error': !!error }">
      <div class="wysiwyg-toolbar">
        <select
          class="wysiwyg-heading-select"
          title="Стиль заголовка"
          aria-label="Стиль заголовка"
          :value="activeHeading"
          @focus="saveSelectionRange"
          @change="applyHeading($event.target.value)"
        >
          <option value="p">Текст</option>
          <option value="h1">Заголовок 1</option>
          <option value="h2">Заголовок 2</option>
          <option value="h3">Заголовок 3</option>
          <option value="h4">Заголовок 4</option>
          <option value="h5">Заголовок 5</option>
          <option value="h6">Заголовок 6</option>
        </select>
        <span class="wysiwyg-divider"></span>
        <button
          type="button"
          class="wysiwyg-btn"
          :class="{ 'wysiwyg-btn-active': activeStates.bold }"
          title="Жирный"
          aria-label="Жирный"
          @mousedown.prevent="exec('bold')"
        >
          <b>B</b>
        </button>
        <button
          type="button"
          class="wysiwyg-btn wysiwyg-btn-italic"
          :class="{ 'wysiwyg-btn-active': activeStates.italic }"
          title="Курсив"
          aria-label="Курсив"
          @mousedown.prevent="exec('italic')"
        >
          <i>I</i>
        </button>
        <button
          type="button"
          class="wysiwyg-btn"
          :class="{ 'wysiwyg-btn-active': activeStates.underline }"
          title="Подчеркнутый"
          aria-label="Подчеркнутый"
          @mousedown.prevent="exec('underline')"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          class="wysiwyg-btn"
          :class="{ 'wysiwyg-btn-active': activeStates.strikeThrough }"
          title="Зачеркнутый"
          aria-label="Зачеркнутый"
          @mousedown.prevent="exec('strikeThrough')"
        >
          <s>S</s>
        </button>
        <span class="wysiwyg-divider"></span>
        <button
          type="button"
          class="wysiwyg-btn"
          :class="{ 'wysiwyg-btn-active': activeStates.unorderedList }"
          title="Маркированный список"
          aria-label="Маркированный список"
          @mousedown.prevent="exec('insertUnorderedList')"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 6h10M9 12h10M9 18h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <circle cx="5" cy="6" r="1.5" fill="currentColor" />
            <circle cx="5" cy="12" r="1.5" fill="currentColor" />
            <circle cx="5" cy="18" r="1.5" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          class="wysiwyg-btn"
          :class="{ 'wysiwyg-btn-active': activeStates.orderedList }"
          title="Нумерованный список"
          aria-label="Нумерованный список"
          @mousedown.prevent="exec('insertOrderedList')"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M10 6h10M10 12h10M10 18h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <path
              d="M3.5 5.5h2M4.5 5.5v3M3.5 11.5h2M3.5 17.8c0-1.2 1.9-1.2 1.9-2.3 0-.5-.4-.9-.9-.9-.5 0-.9.3-1 .8"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button type="button" class="wysiwyg-btn" title="Уменьшить отступ" aria-label="Уменьшить отступ" @mousedown.prevent="exec('outdent')">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M9 6h11M9 12h11M9 18h11M3 12h4M5 10l-2 2 2 2"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button type="button" class="wysiwyg-btn" title="Увеличить отступ" aria-label="Увеличить отступ" @mousedown.prevent="exec('indent')">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 6h11M3 12h11M3 18h11M21 12h-4M19 10l2 2-2 2"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <span class="wysiwyg-divider"></span>
        <button
          type="button"
          class="wysiwyg-btn"
          :class="{ 'wysiwyg-btn-active': activeStates.link }"
          title="Добавить ссылку"
          aria-label="Добавить ссылку"
          @mousedown.prevent="insertLink"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 12a4 4 0 014-4h3a4 4 0 010 8h-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <path d="M15 12a4 4 0 01-4 4H8a4 4 0 010-8h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
        <button type="button" class="wysiwyg-btn" title="Убрать ссылку" aria-label="Убрать ссылку" @mousedown.prevent="exec('unlink')">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 12a4 4 0 014-4h3a4 4 0 010 8h-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <path d="M15 12a4 4 0 01-4 4H8a4 4 0 010-8h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <path d="M5 5l14 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
        <button type="button" class="wysiwyg-btn" title="Добавить изображение" aria-label="Добавить изображение" @mousedown.prevent="insertImage">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.8" />
            <circle cx="9" cy="10" r="1.7" fill="currentColor" />
            <path d="M5.5 17l4.5-4 3.5 3 2-2L19 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button type="button" class="wysiwyg-btn" title="Добавить видео" aria-label="Добавить видео" @mousedown.prevent="insertVideo">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="5" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.8" />
            <path d="M10 10.5l4 2.5-4 2.5v-5z" fill="currentColor" />
            <path d="M17 10l4-2v8l-4-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button type="button" class="wysiwyg-btn" title="Очистить формат" aria-label="Очистить формат" @mousedown.prevent="clearFormatting">C</button>

        <input
          ref="imageInputRef"
          class="wysiwyg-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          @change="handleImageFileChange"
        />
        <input
          ref="videoInputRef"
          class="wysiwyg-file-input"
          type="file"
          accept="video/mp4,video/webm,video/ogg,video/quicktime"
          @change="handleVideoFileChange"
        />
      </div>

      <div
        ref="editorRef"
        class="wysiwyg-content"
        :style="{ minHeight: `${minHeight}px` }"
        contenteditable="true"
        :data-placeholder="placeholder"
        @focus="isFocused = true"
        @blur="handleBlur"
        @input="handleInput"
        @keyup="updateActiveStates"
        @mouseup="updateActiveStates"
        @paste="handlePaste"
      ></div>
    </div>

    <div v-if="showCounter" class="wysiwyg-meta">
      <span class="wysiwyg-counter" :class="{ 'wysiwyg-counter-over': maxLength > 0 && charCount > maxLength }">{{ charCount }}/{{ maxLength }}</span>
    </div>

    <p v-if="error" class="wysiwyg-error">{{ error }}</p>
    <p v-else-if="hint" class="wysiwyg-hint">{{ hint }}</p>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from "vue";
import { uploadCourseMedia } from "../../api/courses";
import { API_BASE_URL } from "../../env";

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  label: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "",
  },
  hint: {
    type: String,
    default: "",
  },
  error: {
    type: String,
    default: "",
  },
  required: {
    type: Boolean,
    default: false,
  },
  minHeight: {
    type: Number,
    default: 120,
  },
  maxLength: {
    type: Number,
    default: 0,
  },
  showCounter: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue"]);

const API_ORIGIN = (API_BASE_URL || "http://localhost:3001/api").replace(/\/api\/?$/, "");

const editorRef = ref(null);
const isFocused = ref(false);
const charCount = ref(0);
const imageInputRef = ref(null);
const videoInputRef = ref(null);
const savedSelectionRange = ref(null);
const activeStates = ref({
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  unorderedList: false,
  orderedList: false,
  link: false,
});
const activeHeading = ref("p");

const getPlainTextLength = () => (editorRef.value?.innerText || "").replace(/\n+$/g, "").length;

const trimContentToLimit = () => {
  if (!editorRef.value || props.maxLength <= 0) {
    return;
  }

  const plainText = editorRef.value.innerText || "";
  if (plainText.length <= props.maxLength) {
    return;
  }

  const trimmed = plainText.slice(0, props.maxLength);
  editorRef.value.innerText = trimmed;
};

const updateActiveStates = () => {
  const block = document.queryCommandValue("formatBlock") || "p";
  activeHeading.value = ["h1", "h2", "h3", "h4", "h5", "h6"].includes(block.toLowerCase()) ? block.toLowerCase() : "p";
  activeStates.value = {
    bold: document.queryCommandState("bold"),
    italic: document.queryCommandState("italic"),
    underline: document.queryCommandState("underline"),
    strikeThrough: document.queryCommandState("strikeThrough"),
    unorderedList: document.queryCommandState("insertUnorderedList"),
    orderedList: document.queryCommandState("insertOrderedList"),
    link: document.queryCommandState("createLink"),
  };
};

const syncEditorValue = (html) => {
  if (!editorRef.value) return;
  if (editorRef.value.innerHTML !== (html || "")) {
    editorRef.value.innerHTML = html || "";
  }
  trimContentToLimit();
  charCount.value = getPlainTextLength();
  updateActiveStates();
};

const handleInput = () => {
  if (!editorRef.value) return;
  trimContentToLimit();
  charCount.value = getPlainTextLength();
  updateActiveStates();
  emit("update:modelValue", editorRef.value.innerHTML);
};

const handlePaste = (event) => {
  if (props.maxLength <= 0 || !editorRef.value) {
    return;
  }

  const pastedText = event.clipboardData?.getData("text/plain") || "";
  const currentLength = getPlainTextLength();
  const availableChars = props.maxLength - currentLength;

  if (availableChars <= 0) {
    event.preventDefault();
    return;
  }

  if (pastedText.length > availableChars) {
    event.preventDefault();
    const limitedText = pastedText.slice(0, availableChars);
    document.execCommand("insertText", false, limitedText);
  }
};

const handleBlur = () => {
  isFocused.value = false;
  if (!editorRef.value) return;
  updateActiveStates();
  emit("update:modelValue", editorRef.value.innerHTML);
};

const exec = (command) => {
  editorRef.value?.focus();
  document.execCommand(command, false, null);
  updateActiveStates();
};

const saveSelectionRange = () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    savedSelectionRange.value = null;
    return;
  }

  savedSelectionRange.value = selection.getRangeAt(0).cloneRange();
};

const restoreSelectionRange = () => {
  if (!savedSelectionRange.value) {
    return;
  }

  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  selection.removeAllRanges();
  selection.addRange(savedSelectionRange.value);
};

const resolveMediaUrl = (url) => {
  if (!url) {
    return "";
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (!url.startsWith("/")) {
    return `${API_ORIGIN}/${url}`;
  }

  return `${API_ORIGIN}${url}`;
};

const setParagraph = () => {
  editorRef.value?.focus();
  document.execCommand("formatBlock", false, "p");
  updateActiveStates();
};

const applyHeading = (tag) => {
  restoreSelectionRange();
  editorRef.value?.focus();
  document.execCommand("formatBlock", false, tag);
  updateActiveStates();
  emit("update:modelValue", editorRef.value?.innerHTML || "");
};

const insertLink = () => {
  const url = window.prompt("Введите URL ссылки:");
  if (!url) return;
  editorRef.value?.focus();
  document.execCommand("createLink", false, url);
  updateActiveStates();
};

const insertImage = () => {
  saveSelectionRange();
  imageInputRef.value?.click();
};

const insertVideo = () => {
  saveSelectionRange();
  videoInputRef.value?.click();
};

const handleImageFileChange = async (event) => {
  const file = event?.target?.files?.[0] || null;
  if (!file || !editorRef.value) {
    return;
  }

  try {
    const response = await uploadCourseMedia(file, "image");
    const mediaUrl = resolveMediaUrl(response?.mediaUrl || "");
    if (!mediaUrl) {
      return;
    }

    editorRef.value.focus();
    restoreSelectionRange();
    document.execCommand("insertImage", false, mediaUrl);
    handleInput();
  } catch (error) {
    console.error("Не удалось загрузить изображение:", error);
  } finally {
    if (event?.target) {
      event.target.value = "";
    }
  }
};

const handleVideoFileChange = async (event) => {
  const file = event?.target?.files?.[0] || null;
  if (!file || !editorRef.value) return;

  try {
    const response = await uploadCourseMedia(file, "video");
    const mediaUrl = resolveMediaUrl(response?.mediaUrl || "");
    if (!mediaUrl) {
      return;
    }

    editorRef.value.focus();
    restoreSelectionRange();
    const safeUrl = mediaUrl.replace(/"/g, "&quot;");
    const videoMarkup = `<video controls preload="metadata" src="${safeUrl}"></video>`;
    document.execCommand("insertHTML", false, videoMarkup);
    handleInput();
  } catch (error) {
    console.error("Не удалось загрузить видео:", error);
  } finally {
    if (event?.target) {
      event.target.value = "";
    }
  }
};

const clearFormatting = () => {
  editorRef.value?.focus();
  document.execCommand("removeFormat", false, null);
  document.execCommand("unlink", false, null);
  updateActiveStates();
};

watch(
  () => props.modelValue,
  async (newValue) => {
    await nextTick();
    syncEditorValue(newValue);
  },
);

onMounted(() => {
  syncEditorValue(props.modelValue);
});
</script>

<style scoped>
.wysiwyg-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.wysiwyg-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.wysiwyg-required {
  color: #ef4444;
}

.wysiwyg-shell {
  border: 1px solid var(--divider);
  border-radius: 12px;
  background: var(--bg-primary, #fff);
  width: 100%;
  min-width: 0;
  overflow: hidden;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.wysiwyg-shell-focused {
  border-color: #d0d5dd;
  box-shadow: 0 0 0 3px rgba(16, 24, 40, 0.05);
}

.wysiwyg-shell-error {
  border-color: #ef4444;
}

.wysiwyg-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--divider);
  background: #f8fafc;
  border-radius: 12px 12px 0 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.wysiwyg-file-input {
  display: none;
}

.wysiwyg-btn {
  width: 26px;
  height: 26px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #667085;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color 0.15s,
    border-color 0.15s,
    color 0.15s;
}

.wysiwyg-btn:hover {
  background: #f2f4f7;
  color: #344054;
  border-color: #e4e7ec;
}

.wysiwyg-btn-italic {
  font-style: italic;
}

.wysiwyg-btn-active {
  background: #eef2ff;
  border-color: #c7d2fe;
  color: #3f3f46;
}

.wysiwyg-btn svg {
  width: 16px;
  height: 16px;
}

.wysiwyg-divider {
  width: 1px;
  height: 16px;
  background: #e4e7ec;
  margin: 0 4px;
}

.wysiwyg-heading-select {
  height: 26px;
  padding: 0 6px;
  border: 1px solid #e4e7ec;
  border-radius: 6px;
  background: transparent;
  color: #667085;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
}

.wysiwyg-heading-select:hover {
  background: #f2f4f7;
  color: #344054;
}

.wysiwyg-content {
  padding: 12px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  outline: none;
  word-break: break-word;
  overflow-wrap: anywhere;
  max-width: 100%;
}

.wysiwyg-content:empty::before {
  content: attr(data-placeholder);
  color: var(--text-tertiary, #9ca3af);
  pointer-events: none;
}

.wysiwyg-content ul,
.wysiwyg-content ol {
  padding-left: 1.4em !important;
  margin: 4px 0 !important;
  margin-left: 0 !important;
  list-style-position: inside;
}

.wysiwyg-content li {
  margin-left: 0 !important;
  text-indent: 0;
}

.wysiwyg-content a {
  color: #2563eb;
  text-decoration: underline;
}

.wysiwyg-content img,
.wysiwyg-content video,
.wysiwyg-content iframe,
.wysiwyg-content table,
.wysiwyg-content pre {
  max-width: 100%;
}

.wysiwyg-meta {
  display: flex;
  justify-content: flex-end;
  padding-right: 2px;
}

.wysiwyg-counter {
  font-size: 12px;
  color: #98a2b3;
}

.wysiwyg-counter-over {
  color: #ef4444;
}

.wysiwyg-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.wysiwyg-error {
  margin: 0;
  font-size: 12px;
  color: #ef4444;
}
</style>
