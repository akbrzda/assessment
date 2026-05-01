<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="fieldId" class="text-sm font-medium text-foreground leading-none">
      {{ label }}
      <span v-if="required" class="text-destructive ml-0.5">*</span>
    </label>

    <div ref="rootRef" class="relative">
      <button
        :id="fieldId"
        type="button"
        :disabled="disabled"
        :aria-expanded="isOpen ? 'true' : 'false'"
        :aria-describedby="messageId"
        :aria-invalid="Boolean(error)"
        :class="
          cn(
            'flex h-9 w-full items-center gap-2 rounded-xl border border-input bg-[hsl(var(--field-surface))] px-3 text-sm shadow-sm transition cursor-pointer',
            'hover:border-[hsl(var(--field-border-strong))] hover:bg-[hsl(var(--field-surface-hover))]',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 focus:border-transparent',
            disabled && 'cursor-not-allowed text-muted-foreground opacity-70',
            !modelValue && 'text-muted-foreground',
            error && 'border-[hsl(var(--field-border-error))] bg-[hsl(var(--field-error-bg))]',
          )
        "
        @click="toggleOpen"
      >
        <CalendarIcon :size="15" class="shrink-0 text-muted-foreground" />
        <span class="flex-1 text-left truncate">{{ displayValue || placeholder || "Выберите дату..." }}</span>
        <span
          v-if="modelValue && clearable"
          role="button"
          tabindex="0"
          class="shrink-0 text-muted-foreground hover:text-foreground leading-none"
          @click.stop="clear"
          @keydown.enter.prevent="clear"
        >
          <XIcon :size="14" />
        </span>
      </button>

      <div v-if="isOpen" class="absolute left-0 top-[calc(100%+6px)] z-[9999] w-72 rounded-xl border border-border bg-card shadow-lg p-3">
        <!-- Навигация по месяцу -->
        <div class="flex items-center justify-between mb-3">
          <button
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition"
            @click="prevMonth"
          >
            <ChevronLeftIcon :size="14" />
          </button>
          <span class="text-sm font-semibold text-foreground capitalize select-none">{{ monthLabel }}</span>
          <button
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition"
            @click="nextMonth"
          >
            <ChevronRightIcon :size="14" />
          </button>
        </div>

        <!-- Заголовки дней недели -->
        <div class="grid grid-cols-7 mb-1">
          <span
            v-for="d in WEEK_HEADERS"
            :key="d"
            class="flex h-7 items-center justify-center text-[11px] font-medium text-muted-foreground select-none"
            >{{ d }}</span
          >
        </div>

        <!-- Ячейки дней -->
        <div class="grid grid-cols-7 gap-y-0.5">
          <button
            v-for="cell in calendarCells"
            :key="cell.key"
            type="button"
            :class="
              cn(
                'flex h-8 w-full items-center justify-center rounded-lg text-sm select-none transition',
                cell.outside ? 'text-muted-foreground/30 pointer-events-none' : 'cursor-pointer hover:bg-accent hover:text-accent-foreground',
                cell.isSelected && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-semibold',
                cell.isToday && !cell.isSelected && 'border border-ring font-medium',
              )
            "
            @click="() => !cell.outside && selectCell(cell)"
          >
            {{ cell.day }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="error" :id="messageId" class="text-xs text-destructive font-medium flex items-center gap-1.5">
      <CircleAlertIcon :size="12" class="shrink-0" />
      {{ error }}
    </p>
    <p v-else-if="hint" :id="messageId" class="text-xs text-muted-foreground">{{ hint }}</p>
  </div>
</template>

<script setup>
import { ref, computed, useId, onMounted, onUnmounted } from "vue";
import {
  CalendarIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CircleAlert as CircleAlertIcon,
  X as XIcon,
} from "lucide-vue-next";
import { cn } from "@/lib/utils";

const props = defineProps({
  modelValue: { type: String, default: null },
  label: String,
  placeholder: String,
  hint: String,
  error: String,
  disabled: Boolean,
  required: Boolean,
  clearable: { type: Boolean, default: true },
});

const emit = defineEmits(["update:modelValue"]);

// ─── State ────────────────────────────────────────────
const isOpen = ref(false);
const rootRef = ref(null);
const viewYear = ref(new Date().getFullYear());
const viewMonth = ref(new Date().getMonth()); // 0-indexed

// ─── IDs ─────────────────────────────────────────────
const localId = typeof useId === "function" ? useId() : `dp-${Math.random().toString(36).slice(2, 9)}`;
const fieldId = computed(() => `field-${localId}`);
const messageId = computed(() => (props.error || props.hint ? `${fieldId.value}-msg` : undefined));

// ─── Константы ───────────────────────────────────────
const WEEK_HEADERS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const RU_MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];

// ─── Разбор выбранной даты ────────────────────────────
const selectedDate = computed(() => {
  if (!props.modelValue) return null;
  const m = props.modelValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return { year: +m[1], month: +m[2] - 1, day: +m[3] };
  return null;
});

// ─── Заголовок месяца ─────────────────────────────────
const monthLabel = computed(() => `${RU_MONTHS[viewMonth.value]} ${viewYear.value}`);

// ─── Сетка дней ──────────────────────────────────────
const calendarCells = computed(() => {
  const year = viewYear.value;
  const month = viewMonth.value;
  const todayDate = new Date();
  const cells = [];

  // Первый день недели месяца (0=Вс → Mon-start: Пн=0)
  const firstDow = new Date(year, month, 1).getDay();
  const startOffset = (firstDow + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  // Заполнение предыдущего месяца
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ key: `p${i}`, day: daysInPrev - i, outside: true });
  }

  // Текущий месяц
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = todayDate.getFullYear() === year && todayDate.getMonth() === month && todayDate.getDate() === d;
    const sel = selectedDate.value;
    const isSelected = Boolean(sel && sel.year === year && sel.month === month && sel.day === d);
    cells.push({ key: `c${d}`, day: d, outside: false, isToday, isSelected, year, month, fullDay: d });
  }

  // Заполнение следующего месяца до полной строки
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ key: `n${d}`, day: d, outside: true });
  }

  return cells;
});

// ─── Отображение значения ─────────────────────────────
const ruFormatter = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

const displayValue = computed(() => {
  if (!props.modelValue) return "";
  const m = props.modelValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (!isNaN(d)) return ruFormatter.format(d);
  }
  return props.modelValue;
});

// ─── Действия ─────────────────────────────────────────
function toggleOpen() {
  if (props.disabled) return;
  if (!isOpen.value) {
    const sel = selectedDate.value;
    if (sel) {
      viewYear.value = sel.year;
      viewMonth.value = sel.month;
    } else {
      const now = new Date();
      viewYear.value = now.getFullYear();
      viewMonth.value = now.getMonth();
    }
  }
  isOpen.value = !isOpen.value;
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11;
    viewYear.value--;
  } else viewMonth.value--;
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0;
    viewYear.value++;
  } else viewMonth.value++;
}

function selectCell(cell) {
  const y = cell.year;
  const mo = String(cell.month + 1).padStart(2, "0");
  const d = String(cell.fullDay).padStart(2, "0");
  emit("update:modelValue", `${y}-${mo}-${d}`);
  isOpen.value = false;
}

function clear() {
  emit("update:modelValue", null);
}

// ─── Клик вне компонента ──────────────────────────────
function handlePointerDown(e) {
  if (rootRef.value && !rootRef.value.contains(e.target)) {
    isOpen.value = false;
  }
}

onMounted(() => document.addEventListener("pointerdown", handlePointerDown));
onUnmounted(() => document.removeEventListener("pointerdown", handlePointerDown));
</script>
