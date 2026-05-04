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
        <button type="button" class="wysiwyg-btn" title="Медиагалерея" aria-label="Медиагалерея" @mousedown.prevent="openMediaLibrary">
          <Images class="wysiwyg-btn-icon" />
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

    <Modal v-model="mediaLibraryOpen" title="Медиагалерея" size="xl" :z-index="1200">
      <div class="media-library-head">
        <div class="media-library-tabs">
          <button
            type="button"
            class="media-library-tab"
            :class="{ 'media-library-tab-active': mediaLibraryFilter === 'all' }"
            @click="mediaLibraryFilter = 'all'"
          >
            Все
          </button>
          <button
            type="button"
            class="media-library-tab"
            :class="{ 'media-library-tab-active': mediaLibraryFilter === 'image' }"
            @click="mediaLibraryFilter = 'image'"
          >
            Изображения
          </button>
          <button
            type="button"
            class="media-library-tab"
            :class="{ 'media-library-tab-active': mediaLibraryFilter === 'video' }"
            @click="mediaLibraryFilter = 'video'"
          >
            Видео
          </button>
        </div>

        <div class="media-library-actions">
          <button
            type="button"
            class="media-library-refresh"
            :disabled="mediaLibraryLoading || mediaLibraryUploading"
            @click="loadMediaLibrary(true)"
          >
            {{ mediaLibraryLoading ? "Обновление..." : "Обновить" }}
          </button>
          <button
            type="button"
            class="media-library-refresh"
            :disabled="mediaLibraryUploading || mediaLibraryDeleting"
            @click="openMediaLibraryUpload"
          >
            <Upload :size="14" />
            <span>{{ mediaLibraryUploading ? "Загрузка..." : "Добавить файлы" }}</span>
          </button>
          <button type="button" class="media-library-refresh" :disabled="!filteredMediaLibraryItems.length" @click="selectAllVisibleMedia">
            <CheckSquare :size="14" />
            <span>Выбрать все</span>
          </button>
          <button type="button" class="media-library-refresh" :disabled="!hasSelectedMedia" @click="clearMediaSelection">
            <Square :size="14" />
            <span>Снять выбор</span>
          </button>
        </div>
      </div>

      <div class="media-library-bulk-actions">
        <span class="media-library-selection">Выбрано: {{ selectedMediaUrls.length }}</span>
        <button type="button" class="media-library-refresh" :disabled="!hasSelectedMedia" @click="insertSelectedMedia">Вставить выбранное</button>
        <button
          type="button"
          class="media-library-refresh media-library-danger"
          :disabled="!hasSelectedMedia || mediaLibraryDeleting"
          @click="deleteSelectedMedia"
        >
          <Trash2 :size="14" />
          <span>{{ mediaLibraryDeleting ? "Удаление..." : "Удалить выбранное" }}</span>
        </button>
      </div>

      <input
        ref="mediaLibraryInputRef"
        class="wysiwyg-file-input"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/ogg,video/quicktime"
        @change="handleMediaLibraryUpload"
      />

      <div v-if="mediaLibraryLoading" class="media-library-empty">Загружаем медиатеку...</div>
      <div v-else-if="!filteredMediaLibraryItems.length" class="media-library-empty">
        Файлы не найдены. Загрузите изображение или видео, и они появятся здесь.
      </div>
      <div v-else class="media-library-grid">
        <article
          v-for="item in filteredMediaLibraryItems"
          :key="item.mediaUrl"
          class="media-library-item"
          :class="{ 'media-library-item-selected': isMediaSelected(item.mediaUrl) }"
          @click="toggleMediaSelection(item.mediaUrl)"
        >
          <div class="media-library-check">
            <CheckSquare v-if="isMediaSelected(item.mediaUrl)" :size="14" />
            <Square v-else :size="14" />
          </div>

          <div class="media-library-preview">
            <img v-if="item.mediaType === 'image'" :src="resolveMediaUrl(item.mediaUrl)" :alt="item.fileName || 'Изображение'" />
            <video v-else :src="resolveMediaUrl(item.mediaUrl)" muted preload="none"></video>
          </div>

          <div class="media-library-meta">
            <div class="media-library-name">{{ item.fileName }}</div>
            <div class="media-library-info">{{ item.mediaType === "video" ? "Видео" : "Изображение" }} · {{ formatBytes(item.size) }}</div>
          </div>

          <div class="media-library-item-actions">
            <button type="button" class="media-library-refresh" @click.stop="insertMediaFromLibrary(item)">Вставить</button>
            <button
              type="button"
              class="media-library-refresh media-library-danger"
              :disabled="mediaLibraryDeleting"
              @click.stop="deleteSingleMedia(item.mediaUrl)"
            >
              Удалить
            </button>
          </div>
        </article>
      </div>
    </Modal>
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
  Images,
  Upload,
  Trash2,
  CheckSquare,
  Square,
  Eraser,
  Code2,
  Maximize2,
  Minimize2,
  X,
} from "lucide-vue-next";
import { deleteCourseMediaLibraryItems, getCourseMediaLibrary, uploadCourseMedia } from "../../api/courses";
import { API_BASE_URL } from "../../env";
import { useToast } from "../../composables/useToast";
import Modal from "./Modal.vue";
import { toast as sonnerToast } from "vue-sonner";

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
const mediaLibraryOpen = ref(false);
const mediaLibraryLoading = ref(false);
const mediaLibraryUploading = ref(false);
const mediaLibraryDeleting = ref(false);
const mediaLibraryItems = ref([]);
const mediaLibraryFilter = ref("all");
const mediaLibraryInputRef = ref(null);
const selectedMediaUrls = ref([]);

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

const filteredMediaLibraryItems = computed(() => {
  if (mediaLibraryFilter.value === "all") {
    return mediaLibraryItems.value;
  }

  return mediaLibraryItems.value.filter((item) => item.mediaType === mediaLibraryFilter.value);
});

const hasSelectedMedia = computed(() => selectedMediaUrls.value.length > 0);

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

const formatBytes = (value) => {
  const bytes = Number(value || 0);
  if (!bytes) return "0 Б";

  const units = ["Б", "КБ", "МБ", "ГБ"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const normalized = bytes / 1024 ** unitIndex;
  return `${normalized >= 10 ? normalized.toFixed(0) : normalized.toFixed(1)} ${units[unitIndex]}`;
};

const putMediaItemToLibrary = (item) => {
  if (!item?.mediaUrl) return;

  const normalizedItem = {
    fileName: item.fileName || item.originalName || "Без названия",
    mediaUrl: item.mediaUrl,
    mediaType: item.mediaType || "image",
    mimeType: item.mimeType || "",
    size: Number(item.size || 0),
    updatedAt: item.updatedAt || new Date().toISOString(),
  };

  mediaLibraryItems.value = [normalizedItem, ...mediaLibraryItems.value.filter((entry) => entry.mediaUrl !== normalizedItem.mediaUrl)];
};

const loadMediaLibrary = async (forceReload = false) => {
  if (mediaLibraryLoading.value) return;
  if (!forceReload && mediaLibraryItems.value.length) return;

  mediaLibraryLoading.value = true;
  try {
    const payload = await getCourseMediaLibrary();
    mediaLibraryItems.value = Array.isArray(payload?.items) ? payload.items : [];
  } catch (error) {
    console.error("Не удалось загрузить медиатеку:", error);
    showToast(
      {
        title: "Не удалось открыть медиагалерею",
        description: resolveUploadErrorMessage(error, "Попробуйте обновить список файлов."),
      },
      "error",
    );
  } finally {
    mediaLibraryLoading.value = false;
  }
};

const detectMediaTypeByFile = (file) => {
  const mimeType = String(file?.type || "").toLowerCase();
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return null;
};

const openMediaLibraryUpload = () => {
  mediaLibraryInputRef.value?.click();
};

const openMediaLibrary = async () => {
  mediaLibraryOpen.value = true;
  clearMediaSelection();
  void loadMediaLibrary(false);
};

const isMediaSelected = (mediaUrl) => selectedMediaUrls.value.includes(mediaUrl);

const toggleMediaSelection = (mediaUrl) => {
  if (!mediaUrl) return;

  if (isMediaSelected(mediaUrl)) {
    selectedMediaUrls.value = selectedMediaUrls.value.filter((url) => url !== mediaUrl);
    return;
  }

  selectedMediaUrls.value = [...selectedMediaUrls.value, mediaUrl];
};

const clearMediaSelection = () => {
  selectedMediaUrls.value = [];
};

const selectAllVisibleMedia = () => {
  const allVisible = filteredMediaLibraryItems.value.map((item) => item.mediaUrl).filter(Boolean);
  selectedMediaUrls.value = [...new Set(allVisible)];
};

const insertOneMediaItem = (item) => {
  if (!item || !editor.value) return;

  const mediaUrl = resolveMediaUrl(item.mediaUrl || "");
  if (!mediaUrl) return;

  if (item.mediaType === "video") {
    editor.value
      .chain()
      .focus()
      .insertContent({
        type: "video",
        attrs: {
          src: mediaUrl,
          controls: true,
          preload: "metadata",
          width: null,
          height: null,
        },
      })
      .run();
    return;
  }

  editor.value.chain().focus().setImage({ src: mediaUrl }).run();
};

const insertMediaFromLibrary = (item) => {
  insertOneMediaItem(item);
  mediaLibraryOpen.value = false;
};

const insertSelectedMedia = () => {
  if (!hasSelectedMedia.value || !editor.value) return;

  const selectedSet = new Set(selectedMediaUrls.value);
  const selectedItems = mediaLibraryItems.value.filter((item) => selectedSet.has(item.mediaUrl));
  if (!selectedItems.length) return;

  selectedItems.forEach((item) => {
    insertOneMediaItem(item);
  });

  showToast(
    {
      title: "Медиа добавлено в материал",
      description: `Вставлено элементов: ${selectedItems.length}.`,
    },
    "success",
  );

  mediaLibraryOpen.value = false;
};

const deleteMediaItems = async (mediaUrls) => {
  if (!Array.isArray(mediaUrls) || !mediaUrls.length) return;

  mediaLibraryDeleting.value = true;
  try {
    await deleteCourseMediaLibraryItems(mediaUrls);
    const deletedSet = new Set(mediaUrls);
    mediaLibraryItems.value = mediaLibraryItems.value.filter((item) => !deletedSet.has(item.mediaUrl));
    selectedMediaUrls.value = selectedMediaUrls.value.filter((url) => !deletedSet.has(url));
    showToast(
      {
        title: "Файлы удалены",
        description: `Удалено элементов: ${mediaUrls.length}.`,
      },
      "success",
    );
  } catch (error) {
    console.error("Не удалось удалить медиафайлы:", error);
    showToast(
      {
        title: "Ошибка удаления",
        description: resolveUploadErrorMessage(error, "Не удалось удалить выбранные файлы."),
      },
      "error",
    );
  } finally {
    mediaLibraryDeleting.value = false;
  }
};

const deleteSelectedMedia = async () => {
  if (!hasSelectedMedia.value) return;
  await deleteMediaItems([...selectedMediaUrls.value]);
};

const deleteSingleMedia = async (mediaUrl) => {
  if (!mediaUrl) return;
  await deleteMediaItems([mediaUrl]);
};

const handleMediaLibraryUpload = async (event) => {
  const files = Array.from(event?.target?.files || []);
  if (!files.length) return;

  mediaLibraryUploading.value = true;
  let uploadedCount = 0;
  let skippedCount = 0;

  try {
    for (const file of files) {
      const mediaType = detectMediaTypeByFile(file);
      if (!mediaType) {
        skippedCount += 1;
        continue;
      }

      if (mediaType === "image" && Number(file.size || 0) > IMAGE_MAX_SIZE_BYTES) {
        skippedCount += 1;
        showToast(
          {
            title: "Пропуск файла",
            description: `Изображение ${file.name} больше 50 МБ.`,
          },
          "warning",
        );
        continue;
      }

      if (mediaType === "video" && Number(file.size || 0) > VIDEO_MAX_SIZE_BYTES) {
        skippedCount += 1;
        showToast(
          {
            title: "Пропуск файла",
            description: `Видео ${file.name} больше 1024 МБ.`,
          },
          "warning",
        );
        continue;
      }

      try {
        const response = await uploadCourseMedia(file, mediaType);
        putMediaItemToLibrary({
          ...response,
          size: file.size,
          fileName: response?.fileName || response?.originalName || file.name,
          mediaType: response?.mediaType || mediaType,
        });
        uploadedCount += 1;
      } catch (error) {
        skippedCount += 1;
        showToast(
          {
            title: "Ошибка загрузки файла",
            description: resolveUploadErrorMessage(error, `Не удалось загрузить ${file.name}.`),
          },
          "error",
        );
      }
    }

    if (uploadedCount > 0) {
      showToast(
        {
          title: "Галерея обновлена",
          description: `Добавлено файлов: ${uploadedCount}.`,
        },
        "success",
      );
    }

    if (skippedCount > 0) {
      showToast(
        {
          title: "Часть файлов пропущена",
          description: `Пропущено файлов: ${skippedCount}.`,
        },
        "warning",
      );
    }
  } finally {
    mediaLibraryUploading.value = false;
    if (event?.target) event.target.value = "";
  }
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
    putMediaItemToLibrary({
      ...response,
      size: file.size,
      fileName: response?.fileName || response?.originalName || file.name,
      mediaType: response?.mediaType || "image",
    });
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

  const initialProgressText = `Загрузка видео: 0% (0 Б из ${formatBytes(file.size)})`;
  let toastId = sonnerToast.loading("Загружается видео", {
    description: initialProgressText,
    duration: Infinity,
    position: "top-right",
  });
  let lastProgressPercent = -1;

  try {
    const { width, height } = await getVideoDimensionsFromFile(file);
    const response = await uploadCourseMedia(file, "video", {
      onUploadProgress: (progressEvent) => {
        const total = Number(progressEvent?.total || file.size || 0);
        const loaded = Number(progressEvent?.loaded || 0);
        const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;

        if (percent === lastProgressPercent && percent !== 100) {
          return;
        }

        lastProgressPercent = percent;
        const progressText = `Загрузка видео: ${percent}% (${formatBytes(loaded)} из ${formatBytes(total || file.size)})`;
        toastId = sonnerToast.loading("Загружается видео", {
          id: toastId,
          description: progressText,
          duration: Infinity,
          position: "top-right",
        });
      },
    });
    const mediaUrl = resolveMediaUrl(response?.mediaUrl || "");
    if (!mediaUrl) return;
    putMediaItemToLibrary({
      ...response,
      size: file.size,
      fileName: response?.fileName || response?.originalName || file.name,
      mediaType: response?.mediaType || "video",
    });
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

    sonnerToast.success("Видео успешно загружено", {
      id: toastId,
      description: `${response?.fileName || response?.originalName || file.name} добавлено в материал.`,
      duration: 3500,
      position: "top-right",
    });
  } catch (error) {
    console.error("Не удалось загрузить видео:", error);
    sonnerToast.error("Ошибка загрузки видео", {
      id: toastId,
      description: resolveUploadErrorMessage(error, "Не удалось загрузить видео. Попробуйте еще раз."),
      duration: 6000,
      position: "top-right",
    });
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

.media-library-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.media-library-tabs {
  display: flex;
  gap: 8px;
}

.media-library-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.media-library-bulk-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.media-library-selection {
  margin-right: auto;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
}

.media-library-tab,
.media-library-refresh {
  border: 1px solid var(--divider);
  background: #ffffff;
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.media-library-tab-active {
  background: var(--bg-secondary);
  border-color: var(--text-primary);
}

.media-library-refresh:disabled {
  opacity: 0.6;
  cursor: default;
}

.media-library-danger {
  border-color: #fecaca;
  color: #b91c1c;
}

.media-library-danger:hover:not(:disabled) {
  background: #fef2f2;
}

.media-library-empty {
  border: 1px dashed var(--divider);
  border-radius: 10px;
  color: var(--text-secondary);
  font-size: 14px;
  text-align: center;
  padding: 24px 16px;
}

.media-library-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 2px;
}

.media-library-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid var(--divider);
  border-radius: 10px;
  background: #ffffff;
  padding: 8px;
  text-align: left;
  cursor: pointer;
  position: relative;
}

.media-library-item-selected {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.25);
}

.media-library-item:hover {
  border-color: var(--primary, #3b82f6);
}

.media-library-check {
  position: absolute;
  top: 8px;
  right: 8px;
  border: 1px solid var(--divider);
  border-radius: 6px;
  background: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  z-index: 2;
}

.media-library-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 110px;
  border-radius: 8px;
  overflow: hidden;
  background: #f8fafc;
}

.media-library-preview img,
.media-library-preview video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-library-preview video {
  pointer-events: none;
}

.media-library-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.media-library-name {
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.media-library-info {
  color: var(--text-secondary);
  font-size: 12px;
}

.media-library-item-actions {
  display: flex;
  gap: 6px;
}

.media-library-item-actions .media-library-refresh {
  font-size: 12px;
  padding: 5px 8px;
}
</style>
