<template>
  <div class="wysiwyg-group">
    <label v-if="label" class="wysiwyg-label">
      {{ label }}
      <span v-if="required" class="wysiwyg-required">*</span>
    </label>

    <div v-if="isFullscreen" class="wysiwyg-fullscreen-backdrop" @click="toggleFullscreen"></div>

    <div class="wysiwyg-shell" :class="{ 'wysiwyg-shell-error': !!error, 'wysiwyg-shell-fullscreen': isFullscreen }">
      <div v-if="isFullscreen" class="wysiwyg-fullscreen-header">
        <div class="wysiwyg-fullscreen-title">{{ label || "Редактор материала" }}</div>
        <button type="button" class="wysiwyg-fullscreen-close" @click="closeFullscreen">
          <X class="wysiwyg-btn-icon" />
          <span>Закрыть</span>
        </button>
      </div>

      <div class="wysiwyg-toolbar">
        <select
          class="wysiwyg-heading-select"
          :value="activeHeading"
          title="Стиль заголовка"
          aria-label="Стиль заголовка"
          @change="setHeading($event.target.value)"
        >
          <option value="p">Текст</option>
          <option value="h1">Заголовок 1</option>
          <option value="h2">Заголовок 2</option>
          <option value="h3">Заголовок 3</option>
          <option value="h4">Заголовок 4</option>
          <option value="h5">Заголовок 5</option>
          <option value="h6">Заголовок 6</option>
        </select>
        <select
          class="wysiwyg-heading-select"
          :value="activeFontSize"
          title="Размер текста"
          aria-label="Размер текста"
          @change="setFontSize($event.target.value)"
        >
          <option v-for="size in fontSizeOptions" :key="size.value" :value="size.value">{{ size.label }}</option>
        </select>
        <span class="wysiwyg-divider"></span>

        <button
          type="button"
          class="wysiwyg-btn"
          :class="{ 'wysiwyg-btn-active': isActive('bold') }"
          title="Жирный"
          aria-label="Жирный"
          @mousedown.prevent="run('toggleBold')"
        >
          <Bold class="wysiwyg-btn-icon" />
        </button>
        <button
          type="button"
          class="wysiwyg-btn wysiwyg-btn-italic"
          :class="{ 'wysiwyg-btn-active': isActive('italic') }"
          title="Курсив"
          aria-label="Курсив"
          @mousedown.prevent="run('toggleItalic')"
        >
          <Italic class="wysiwyg-btn-icon" />
        </button>
        <button
          type="button"
          class="wysiwyg-btn"
          :class="{ 'wysiwyg-btn-active': isActive('underline') }"
          title="Подчеркнутый"
          aria-label="Подчеркнутый"
          @mousedown.prevent="run('toggleUnderline')"
        >
          <UnderlineIcon class="wysiwyg-btn-icon" />
        </button>
        <button
          type="button"
          class="wysiwyg-btn"
          :class="{ 'wysiwyg-btn-active': isActive('strike') }"
          title="Зачеркнутый"
          aria-label="Зачеркнутый"
          @mousedown.prevent="run('toggleStrike')"
        >
          <Strikethrough class="wysiwyg-btn-icon" />
        </button>
        <span class="wysiwyg-divider"></span>

        <button
          type="button"
          class="wysiwyg-btn"
          :class="{ 'wysiwyg-btn-active': isActive('bulletList') }"
          title="Маркированный список"
          aria-label="Маркированный список"
          @mousedown.prevent="run('toggleBulletList')"
        >
          <List class="wysiwyg-btn-icon" />
        </button>
        <button
          type="button"
          class="wysiwyg-btn"
          :class="{ 'wysiwyg-btn-active': isActive('orderedList') }"
          title="Нумерованный список"
          aria-label="Нумерованный список"
          @mousedown.prevent="run('toggleOrderedList')"
        >
          <ListOrdered class="wysiwyg-btn-icon" />
        </button>
        <span class="wysiwyg-divider"></span>

        <button type="button" class="wysiwyg-btn" title="Ссылка" aria-label="Ссылка" @mousedown.prevent="setLink">
          <LinkIcon class="wysiwyg-btn-icon" />
        </button>
        <button type="button" class="wysiwyg-btn" title="Убрать ссылку" aria-label="Убрать ссылку" @mousedown.prevent="run('unsetLink')">
          <Unlink class="wysiwyg-btn-icon" />
        </button>
        <button type="button" class="wysiwyg-btn" title="Добавить изображение" aria-label="Добавить изображение" @mousedown.prevent="openImageUpload">
          <ImagePlus class="wysiwyg-btn-icon" />
        </button>
        <button type="button" class="wysiwyg-btn" title="Добавить видео" aria-label="Добавить видео" @mousedown.prevent="openVideoUpload">
          <Video class="wysiwyg-btn-icon" />
        </button>
        <button type="button" class="wysiwyg-btn" title="Очистить формат" aria-label="Очистить формат" @mousedown.prevent="clearFormatting">
          <Eraser class="wysiwyg-btn-icon" />
        </button>
        <span class="wysiwyg-divider"></span>

        <label class="wysiwyg-color" title="Цвет текста" aria-label="Цвет текста">
          <input type="color" :value="currentColor" @input="setColor($event.target.value)" />
        </label>
        <button
          type="button"
          class="wysiwyg-btn"
          :class="{ 'wysiwyg-btn-active': sourceMode }"
          title="Исходный код"
          aria-label="Исходный код"
          @mousedown.prevent="toggleSourceMode"
        >
          <Code2 class="wysiwyg-btn-icon" />
        </button>
        <button
          type="button"
          class="wysiwyg-btn"
          :class="{ 'wysiwyg-btn-active': isFullscreen }"
          :title="isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'"
          :aria-label="isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'"
          @mousedown.prevent="toggleFullscreen"
        >
          <Minimize2 v-if="isFullscreen" class="wysiwyg-btn-icon" />
          <Maximize2 v-else class="wysiwyg-btn-icon" />
        </button>

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

      <textarea
        v-if="sourceMode"
        v-model="sourceValue"
        class="wysiwyg-source"
        :class="{ 'wysiwyg-source-fullscreen': isFullscreen }"
        :style="{ minHeight: `${minHeight}px` }"
        spellcheck="false"
        @input="handleSourceInput"
      />
      <EditorContent
        v-else-if="editor"
        :editor="editor"
        class="wysiwyg-content"
        :class="{ 'wysiwyg-content-fullscreen': isFullscreen }"
        :style="{ minHeight: `${minHeight}px` }"
      />
    </div>

    <div v-if="showCounter" class="wysiwyg-meta">
      <span class="wysiwyg-counter" :class="{ 'wysiwyg-counter-over': maxLength > 0 && charCount > maxLength }">{{ charCount }}/{{ maxLength }}</span>
    </div>

    <p v-if="error" class="wysiwyg-error">{{ error }}</p>
    <p v-else-if="hint" class="wysiwyg-hint">{{ hint }}</p>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Editor, EditorContent } from "@tiptap/vue-3";
import { Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  ImagePlus,
  Video,
  Eraser,
  Code2,
  Maximize2,
  Minimize2,
  X,
} from "lucide-vue-next";
import { uploadCourseMedia } from "../../api/courses";
import { API_BASE_URL } from "../../env";
import { useToast } from "../../composables/useToast";

const VideoNode = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: "" },
      controls: { default: true },
      preload: { default: "metadata" },
      width: { default: null },
      height: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "video[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["video", HTMLAttributes];
  },
});

const IframeNode = Node.create({
  name: "iframe",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: "" },
      width: { default: null },
      height: { default: null },
      frameborder: { default: "0" },
      allowfullscreen: { default: "true" },
      allow: {
        default: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
      },
      referrerpolicy: { default: "strict-origin-when-cross-origin" },
    };
  },
  parseHTML() {
    return [{ tag: "iframe[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["iframe", HTMLAttributes];
  },
});

const props = defineProps({
  modelValue: { type: String, default: "" },
  label: { type: String, default: "" },
  placeholder: { type: String, default: "" },
  hint: { type: String, default: "" },
  error: { type: String, default: "" },
  required: { type: Boolean, default: false },
  minHeight: { type: Number, default: 120 },
  maxLength: { type: Number, default: 0 },
  showCounter: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);
const { showToast } = useToast();

const IMAGE_MAX_SIZE_BYTES = 50 * 1024 * 1024;
const VIDEO_MAX_SIZE_BYTES = 1024 * 1024 * 1024;

const API_ORIGIN = (API_BASE_URL || "http://localhost:3001/api").replace(/\/api\/?$/, "");
const imageInputRef = ref(null);
const videoInputRef = ref(null);
const sourceMode = ref(false);
const isFullscreen = ref(false);
const sourceValue = ref(props.modelValue || "");
const currentColor = ref("#000000");
const charCount = ref(0);
const lastValidHtml = ref(props.modelValue || "<p></p>");
const bodyScrollLockPadding = ref(0);

const fontSizeOptions = [
  { value: "", label: "Размер" },
  { value: "12px", label: "12" },
  { value: "14px", label: "14" },
  { value: "16px", label: "16" },
  { value: "18px", label: "18" },
  { value: "20px", label: "20" },
  { value: "24px", label: "24" },
  { value: "28px", label: "28" },
  { value: "32px", label: "32" },
];

const editor = ref(
  new Editor({
    content: props.modelValue || "",
    extensions: [
      StarterKit,
      TextStyle,
      FontSize,
      Color,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Image,
      VideoNode,
      IframeNode,
    ],
    editorProps: {
      attributes: {
        class: "wysiwyg-editor-content",
      },
    },
    onUpdate: ({ editor: instance }) => {
      if (sourceMode.value) {
        return;
      }
      const plain = instance.getText() || "";
      if (props.maxLength > 0 && plain.length > props.maxLength) {
        instance.commands.setContent(lastValidHtml.value, false);
        return;
      }
      const html = instance.getHTML();
      lastValidHtml.value = html;
      sourceValue.value = html;
      charCount.value = plain.length;
      emit("update:modelValue", html);
    },
    onCreate: ({ editor: instance }) => {
      charCount.value = (instance.getText() || "").length;
      sourceValue.value = instance.getHTML();
      lastValidHtml.value = instance.getHTML();
    },
  }),
);

const activeHeading = computed(() => {
  if (!editor.value) return "p";
  if (editor.value.isActive("heading", { level: 1 })) return "h1";
  if (editor.value.isActive("heading", { level: 2 })) return "h2";
  if (editor.value.isActive("heading", { level: 3 })) return "h3";
  if (editor.value.isActive("heading", { level: 4 })) return "h4";
  if (editor.value.isActive("heading", { level: 5 })) return "h5";
  if (editor.value.isActive("heading", { level: 6 })) return "h6";
  return "p";
});

const activeFontSize = computed(() => {
  const value = editor.value?.getAttributes("textStyle")?.fontSize;
  return value || "";
});

const isActive = (name) => Boolean(editor.value?.isActive(name));

const run = (command) => {
  if (!editor.value || sourceMode.value) return;
  editor.value.chain().focus()[command]().run();
};

const setHeading = (value) => {
  if (!editor.value || sourceMode.value) return;
  const chain = editor.value.chain().focus();
  if (value === "p") {
    chain.setParagraph().run();
    return;
  }
  const level = Number(value.replace("h", ""));
  chain.toggleHeading({ level }).run();
};

const setFontSize = (value) => {
  if (!editor.value || sourceMode.value) return;
  const chain = editor.value.chain().focus();
  if (!value) {
    chain.unsetFontSize().run();
    return;
  }
  chain.setFontSize(value).run();
};

const setColor = (value) => {
  currentColor.value = value || "#111827";
  if (!editor.value || sourceMode.value) return;
  editor.value.chain().focus().setColor(currentColor.value).run();
};

const clearFormatting = () => {
  if (!editor.value || sourceMode.value) return;
  editor.value.chain().focus().unsetAllMarks().clearNodes().run();
};

const setLink = () => {
  if (!editor.value || sourceMode.value) return;
  const previous = editor.value.getAttributes("link").href || "";
  const url = window.prompt("Введите URL ссылки:", previous);
  if (url === null) return;
  if (!url) {
    editor.value.chain().focus().unsetLink().run();
    return;
  }
  editor.value.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
};

const resolveMediaUrl = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (!url.startsWith("/")) return `${API_ORIGIN}/${url}`;
  return `${API_ORIGIN}${url}`;
};

const openImageUpload = () => {
  imageInputRef.value?.click();
};

const openVideoUpload = () => {
  videoInputRef.value?.click();
};

const getVideoDimensionsFromFile = (file) =>
  new Promise((resolve) => {
    if (!file) {
      resolve({ width: null, height: null });
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const probeVideo = document.createElement("video");
    probeVideo.preload = "metadata";
    probeVideo.src = objectUrl;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      probeVideo.removeAttribute("src");
    };

    probeVideo.onloadedmetadata = () => {
      const width = Number(probeVideo.videoWidth) || null;
      const height = Number(probeVideo.videoHeight) || null;
      cleanup();
      resolve({ width, height });
    };

    probeVideo.onerror = () => {
      cleanup();
      resolve({ width: null, height: null });
    };
  });

const resolveUploadErrorMessage = (error, fallback) => {
  return error?.response?.data?.error || error?.message || fallback;
};

const handleImageFileChange = async (event) => {
  const file = event?.target?.files?.[0] || null;
  if (!file || !editor.value) return;

  if (Number(file.size || 0) > IMAGE_MAX_SIZE_BYTES) {
    showToast(
      {
        title: "Файл слишком большой",
        description: "Изображение должно быть не больше 50 МБ.",
      },
      "warning",
    );
    if (event?.target) event.target.value = "";
    return;
  }

  try {
    const response = await uploadCourseMedia(file, "image");
    const mediaUrl = resolveMediaUrl(response?.mediaUrl || "");
    if (!mediaUrl) return;
    editor.value.chain().focus().setImage({ src: mediaUrl }).run();
  } catch (error) {
    console.error("Не удалось загрузить изображение:", error);
    showToast(
      {
        title: "Ошибка загрузки изображения",
        description: resolveUploadErrorMessage(error, "Не удалось загрузить изображение. Попробуйте еще раз."),
      },
      "error",
    );
  } finally {
    if (event?.target) event.target.value = "";
  }
};

const handleVideoFileChange = async (event) => {
  const file = event?.target?.files?.[0] || null;
  if (!file || !editor.value) return;

  if (Number(file.size || 0) > VIDEO_MAX_SIZE_BYTES) {
    showToast(
      {
        title: "Файл слишком большой",
        description: "Видео должно быть не больше 1024 МБ.",
      },
      "warning",
    );
    if (event?.target) event.target.value = "";
    return;
  }

  try {
    const { width, height } = await getVideoDimensionsFromFile(file);
    const response = await uploadCourseMedia(file, "video");
    const mediaUrl = resolveMediaUrl(response?.mediaUrl || "");
    if (!mediaUrl) return;
    editor.value
      .chain()
      .focus()
      .insertContent({
        type: "video",
        attrs: {
          src: mediaUrl,
          controls: true,
          preload: "metadata",
          width,
          height,
        },
      })
      .run();
  } catch (error) {
    console.error("Не удалось загрузить видео:", error);
    showToast(
      {
        title: "Ошибка загрузки видео",
        description: resolveUploadErrorMessage(error, "Не удалось загрузить видео. Попробуйте еще раз."),
      },
      "error",
    );
  } finally {
    if (event?.target) event.target.value = "";
  }
};

const toggleSourceMode = () => {
  sourceMode.value = !sourceMode.value;
  if (sourceMode.value) {
    sourceValue.value = editor.value?.getHTML() || props.modelValue || "";
    return;
  }
  if (!editor.value) return;
  editor.value.commands.setContent(sourceValue.value || "", false);
  const plain = editor.value.getText() || "";
  charCount.value = plain.length;
  lastValidHtml.value = editor.value.getHTML();
  emit("update:modelValue", lastValidHtml.value);
};

const handleSourceInput = () => {
  emit("update:modelValue", sourceValue.value || "");
};

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
};

const closeFullscreen = () => {
  isFullscreen.value = false;
};

const handleKeyDown = (event) => {
  if (event?.key === "Escape" && isFullscreen.value) {
    closeFullscreen();
  }
};

watch(isFullscreen, (enabled) => {
  if (typeof document === "undefined") return;

  if (enabled) {
    bodyScrollLockPadding.value = Math.max(window.innerWidth - document.documentElement.clientWidth, 0);
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = bodyScrollLockPadding.value > 0 ? `${bodyScrollLockPadding.value}px` : "";
    return;
  }

  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
});

onMounted(() => {
  if (typeof window === "undefined") return;
  window.addEventListener("keydown", handleKeyDown);
});

watch(
  () => props.modelValue,
  (newValue) => {
    const normalized = newValue || "";
    if (sourceMode.value) {
      if (sourceValue.value !== normalized) {
        sourceValue.value = normalized;
      }
      return;
    }
    if (!editor.value) return;
    const current = editor.value.getHTML();
    if (current !== normalized) {
      editor.value.commands.setContent(normalized, false);
    }
    lastValidHtml.value = normalized || "<p></p>";
    charCount.value = (editor.value.getText() || "").length;
  },
);

onBeforeUnmount(() => {
  if (typeof document !== "undefined") {
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  }
  if (typeof window !== "undefined") {
    window.removeEventListener("keydown", handleKeyDown);
  }
  editor.value?.destroy();
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
  display: flex;
  flex-direction: column;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.wysiwyg-fullscreen-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 999;
}

.wysiwyg-shell-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 1000;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.35);
}

.wysiwyg-fullscreen-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--divider);
  background: #ffffff;
  position: sticky;
  top: 0;
  z-index: 7;
}

.wysiwyg-fullscreen-title {
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.wysiwyg-fullscreen-close {
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  background: #ffffff;
  color: #344054;
  height: 32px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  flex-shrink: 0;
}

.wysiwyg-fullscreen-close:hover {
  background: #f8fafc;
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
  position: sticky;
  top: 0;
  z-index: 5;
}

.wysiwyg-shell-fullscreen .wysiwyg-toolbar {
  top: 53px;
}

.wysiwyg-file-input {
  display: none;
}

.wysiwyg-btn {
  min-width: 28px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #667085;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color 0.15s,
    border-color 0.15s,
    color 0.15s;
  padding: 0 6px;
}

.wysiwyg-btn-icon {
  width: 15px;
  height: 15px;
  stroke-width: 2;
  flex-shrink: 0;
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

.wysiwyg-divider {
  width: 1px;
  height: 16px;
  background: #e4e7ec;
  margin: 0 2px;
}

.wysiwyg-heading-select {
  height: 28px;
  padding: 0 6px;
  border: 1px solid #e4e7ec;
  border-radius: 6px;
  background: #fff;
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

.wysiwyg-content :deep(.ProseMirror) {
  min-height: inherit;
  padding: 12px;
  font-size: 14px;
  line-height: 1.6;
  color: #000000;
  outline: none;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.wysiwyg-content-fullscreen {
  min-height: 0;
  flex: 1 1 auto;
  overflow: auto;
}

.wysiwyg-shell-fullscreen .wysiwyg-content :deep(.ProseMirror) {
  min-height: calc(100vh - 173px);
}

.wysiwyg-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  color: var(--text-tertiary, #9ca3af);
  pointer-events: none;
  float: left;
  height: 0;
}

.wysiwyg-content :deep(ul) {
  padding-left: 1.6em !important;
  margin: 4px 0 !important;
  list-style-type: disc !important;
  list-style-position: outside;
}

.wysiwyg-content :deep(ol) {
  padding-left: 1.6em !important;
  margin: 4px 0 !important;
  list-style-type: decimal !important;
  list-style-position: outside;
}

.wysiwyg-content :deep(li) {
  margin: 0 0 4px !important;
  text-indent: 0 !important;
  display: list-item !important;
}

.wysiwyg-content :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}

.wysiwyg-content :deep(img),
.wysiwyg-content :deep(table),
.wysiwyg-content :deep(pre) {
  max-width: 100%;
}

.wysiwyg-content :deep(video) {
  display: block;
  max-width: none;
}

.wysiwyg-content :deep(iframe) {
  display: block;
  max-width: none;
}

.wysiwyg-source {
  width: 100%;
  border: 0;
  outline: none;
  resize: vertical;
  padding: 12px;
  font-family: Consolas, "Courier New", monospace;
  font-size: 13px;
  line-height: 1.45;
  color: #0f172a;
  background: #fbfdff;
}

.wysiwyg-shell-fullscreen .wysiwyg-source {
  min-height: calc(100vh - 173px) !important;
  resize: none;
  flex: 1 1 auto;
}

.wysiwyg-source-fullscreen {
  min-height: calc(100vh - 173px) !important;
}

.wysiwyg-color {
  display: inline-flex;
  align-items: center;
}

.wysiwyg-color input {
  width: 24px;
  height: 24px;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  padding: 0;
  background: transparent;
  cursor: pointer;
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
