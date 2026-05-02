<template>
  <div class="flex flex-col gap-2" data-filter-bar>
    <!-- Компактная строка фильтров -->
    <div class="flex items-center gap-0.5 bg-card border border-border rounded-2xl px-2 py-1.5 flex-nowrap">
      <!-- Поиск -->
      <div class="flex items-center gap-1.5 flex-1 min-w-[160px] max-w-[240px] md:max-w-none md:flex-1 px-1.5 py-1">
        <Icon name="search" :size="15" class="text-muted-foreground shrink-0" />
        <input
          :value="modelValue[searchKey] || ''"
          :placeholder="searchPlaceholder"
          class="flex-1 border-none outline-none bg-transparent text-foreground text-sm min-w-0 placeholder:text-muted-foreground"
          type="text"
          @input="onSearchInput($event.target.value)"
        />
        <button
          v-if="modelValue[searchKey]"
          class="border-none bg-transparent cursor-pointer text-muted-foreground flex items-center p-0.5 rounded hover:text-foreground"
          @click="clearSearch"
        >
          <Icon name="x" :size="13" />
        </button>
      </div>

      <div class="w-px h-5 bg-border shrink-0 mx-1 hidden md:block" />

      <!-- Фильтры-дропдауны -->
      <template v-for="(def, index) in filterDefs" :key="def.key">
        <!-- Select фильтр -->
        <div v-if="def.type === 'select' || !def.type" class="relative shrink-0 hidden md:block">
          <button
            :class="[
              'flex items-center gap-1 px-2.5 py-1.5 rounded-xl border-none cursor-pointer text-sm whitespace-nowrap transition-all duration-150',
              modelValue[def.key] || openDropdown === def.key
                ? 'bg-nav-active text-nav-active-text font-medium'
                : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
            ]"
            @click.stop="toggleDropdown(def.key)"
          >
            <span class="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">{{ getSelectedLabel(def) }}</span>
            <span v-if="modelValue[def.key]" class="w-1.5 h-1.5 bg-nav-active-text rounded-full shrink-0" />
            <Icon
              name="chevron-down"
              :size="14"
              :class="['shrink-0 transition-transform duration-200', openDropdown === def.key ? 'rotate-180' : '']"
            />
          </button>

          <!-- Дропдаун -->
          <div
            v-if="openDropdown === def.key"
            :class="[
              'absolute top-[calc(100%+6px)] z-[200] bg-card border border-border rounded-xl shadow-modal min-w-[180px] max-w-[min(320px,calc(100vw-24px))] p-1.5',
              getDropdownAlignmentClass(index),
            ]"
          >
            <div class="flex flex-col gap-px">
              <button
                class="flex items-center gap-2 px-2.5 py-2 rounded-lg border-none bg-transparent cursor-pointer text-foreground text-sm text-left w-full transition-colors hover:bg-accent"
                :class="{ 'text-nav-active-text font-medium': !modelValue[def.key] }"
                @click="selectOption(def.key, '')"
              >
                <span class="w-4 h-4 flex items-center justify-center shrink-0 text-nav-active-text">
                  <Icon v-if="!modelValue[def.key]" name="check" :size="13" />
                </span>
                {{ def.placeholder || "Все" }}
              </button>
              <button
                v-for="opt in def.options"
                :key="opt.value"
                class="flex items-center gap-2 px-2.5 py-2 rounded-lg border-none bg-transparent cursor-pointer text-foreground text-sm text-left w-full transition-colors hover:bg-accent"
                :class="{ 'text-nav-active-text font-medium': modelValue[def.key] === opt.value }"
                @click="selectOption(def.key, opt.value)"
              >
                <span class="w-4 h-4 flex items-center justify-center shrink-0 text-nav-active-text">
                  <Icon v-if="modelValue[def.key] === opt.value" name="check" :size="13" />
                </span>
                {{ opt.label }}
                <span v-if="opt.count != null" class="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-px min-w-6 text-center">{{
                  opt.count
                }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Дата-фильтр (range) -->
        <div v-else-if="def.type === 'daterange'" class="relative shrink-0 hidden md:block">
          <button
            :class="[
              'flex items-center gap-1 px-2.5 py-1.5 rounded-xl border-none cursor-pointer text-sm whitespace-nowrap transition-all duration-150',
              modelValue[def.keyFrom] || modelValue[def.keyTo] || openDropdown === def.key
                ? 'bg-nav-active text-nav-active-text font-medium'
                : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
            ]"
            @click.stop="toggleDropdown(def.key)"
          >
            <Icon name="calendar" :size="14" class="shrink-0" />
            <span>{{ getDateRangeLabel(def) }}</span>
            <span v-if="modelValue[def.keyFrom] || modelValue[def.keyTo]" class="w-1.5 h-1.5 bg-nav-active-text rounded-full shrink-0" />
            <Icon
              name="chevron-down"
              :size="14"
              :class="['shrink-0 transition-transform duration-200', openDropdown === def.key ? 'rotate-180' : '']"
            />
          </button>

          <div
            v-if="openDropdown === def.key"
            :class="[
              'absolute top-[calc(100%+6px)] z-[200] bg-card border border-border rounded-xl shadow-modal min-w-[240px] max-w-[min(360px,calc(100vw-24px))] p-1.5',
              getDropdownAlignmentClass(index),
            ]"
          >
            <div class="flex flex-col gap-px border-b border-border pb-1.5 mb-2">
              <button
                v-for="preset in datePresets"
                :key="preset.key"
                class="flex items-center gap-2 px-2.5 py-2 rounded-lg border-none bg-transparent cursor-pointer text-foreground text-sm text-left w-full transition-colors hover:bg-accent"
                :class="{ 'text-nav-active-text font-medium': activeDatePreset(def) === preset.key }"
                @click="applyDatePreset(def, preset)"
              >
                <span class="w-4 h-4 flex items-center justify-center shrink-0 text-nav-active-text">
                  <Icon v-if="activeDatePreset(def) === preset.key" name="check" :size="13" />
                </span>
                {{ preset.label }}
              </button>
            </div>
            <div class="flex flex-col gap-2 px-1">
              <DatePicker
                :model-value="modelValue[def.keyFrom] || null"
                placeholder="Начало"
                @update:model-value="onDateInput(def.keyFrom, $event)"
              />
              <DatePicker :model-value="modelValue[def.keyTo] || null" placeholder="Конец" @update:model-value="onDateInput(def.keyTo, $event)" />
            </div>
            <div class="flex gap-1.5 px-1 pt-2 justify-end">
              <button
                class="px-3 py-1.5 rounded-lg border-none bg-muted text-foreground text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity"
                @click="closeAllDropdowns"
              >
                Отмена
              </button>
              <button
                class="px-3 py-1.5 rounded-lg border-none bg-nav-active text-nav-active-text text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity"
                @click="applyDate(def)"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Кнопка сброса -->
      <button
        v-if="hasActiveFilters"
        class="hidden md:flex items-center gap-1 px-2.5 py-1.5 border-none bg-transparent text-muted-foreground text-sm cursor-pointer rounded-xl whitespace-nowrap shrink-0 ml-0.5 transition-all hover:bg-accent hover:text-foreground"
        @click="resetAll"
      >
        <Icon name="rotate-ccw" :size="14" />
        Очистить
      </button>

      <template v-for="def in mobileInlineFilterDefs" :key="`${def.key}-mobile-inline`">
        <select
          class="md:hidden h-8 max-w-[130px] px-2 py-1 text-xs border border-border rounded-lg bg-background text-foreground outline-none"
          :value="modelValue[def.key] || ''"
          :aria-label="def.label"
          @change="selectOption(def.key, $event.target.value)"
        >
          <option value="">{{ def.placeholder || def.label || "Все" }}</option>
          <option v-for="opt in def.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </template>

      <!-- Разворачивание (мобильное) -->
      <button
        class="flex md:hidden items-center gap-1.5 px-2.5 py-1.5 border-none bg-transparent cursor-pointer text-muted-foreground text-sm rounded-xl shrink-0 ml-auto"
        @click="mobileExpanded = !mobileExpanded"
      >
        <Icon name="sliders-horizontal" :size="15" />
        <span>Фильтры</span>
        <span v-if="activeCount > 0" class="bg-nav-active-text text-white rounded-full px-1.5 py-px text-xs font-semibold">{{ activeCount }}</span>
      </button>
    </div>

    <!-- Мобильное раскрытое меню -->
    <div v-if="mobileExpanded" class="md:hidden bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
      <div v-if="modelValue[searchKey] !== undefined" class="flex flex-col gap-1.5">
        <label class="text-xs font-medium text-muted-foreground">Поиск</label>
        <div class="flex items-center gap-1.5 border border-border rounded-xl px-3 py-2">
          <Icon name="search" :size="15" class="text-muted-foreground shrink-0" />
          <input
            :value="modelValue[searchKey] || ''"
            :placeholder="searchPlaceholder"
            class="flex-1 border-none outline-none bg-transparent text-foreground text-sm placeholder:text-muted-foreground"
            type="text"
            @input="onSearchInput($event.target.value)"
          />
        </div>
      </div>

      <div v-for="def in mobileDrawerFilterDefs" :key="def.key + '_mobile'" class="flex flex-col gap-1.5">
        <template v-if="def.type === 'select' || !def.type">
          <label class="text-xs font-medium text-muted-foreground">{{ def.label }}</label>
          <select
            class="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm outline-none appearance-none"
            :value="modelValue[def.key] || ''"
            @change="selectOption(def.key, $event.target.value)"
          >
            <option value="">{{ def.placeholder || "Все" }}</option>
            <option v-for="opt in def.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </template>
        <template v-else-if="def.type === 'daterange'">
          <label class="text-xs font-medium text-muted-foreground">{{ def.label }}</label>
          <div class="flex flex-col gap-2">
            <DatePicker :model-value="modelValue[def.keyFrom] || null" placeholder="Начало" @update:model-value="onDateInput(def.keyFrom, $event)" />
            <DatePicker :model-value="modelValue[def.keyTo] || null" placeholder="Конец" @update:model-value="onDateInput(def.keyTo, $event)" />
          </div>
        </template>
      </div>

      <div class="flex gap-2 justify-end pt-1 border-t border-border">
        <button class="px-4 py-2 rounded-xl border border-border bg-muted text-foreground text-sm cursor-pointer" @click="resetAll">Сбросить</button>
        <button
          class="px-4 py-2 rounded-xl border-none bg-nav-active text-nav-active-text text-sm font-semibold cursor-pointer"
          @click="mobileExpanded = false"
        >
          Применить
        </button>
      </div>
    </div>

    <!-- Активные чипы фильтров -->
    <div v-if="activeChips.length > 0" class="flex items-center gap-2 flex-wrap">
      <span class="text-xs text-muted-foreground whitespace-nowrap">Фильтры:</span>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="chip in activeChips"
          :key="chip.key"
          class="inline-flex items-center gap-1 py-1 pl-3 pr-2 bg-nav-active text-nav-active-text rounded-full text-xs font-medium"
        >
          {{ chip.label }}
          <button
            class="flex items-center justify-center w-4 h-4 border-none bg-transparent cursor-pointer text-nav-active-text rounded-full p-0 opacity-70 hover:opacity-100 transition-opacity"
            @click="removeChip(chip)"
          >
            <Icon name="x" :size="11" />
          </button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import Icon from "./Icon.vue";
import DatePicker from "./DatePicker.vue";
import { toLocalDateInputValue } from "@/utils/dateUtils";

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({}),
  },
  searchKey: {
    type: String,
    default: "search",
  },
  searchPlaceholder: {
    type: String,
    default: "Поиск...",
  },
  filterDefs: {
    type: Array,
    default: () => [],
  },
  searchDebounce: {
    type: Number,
    default: 300,
  },
});

const emit = defineEmits(["update:modelValue", "change"]);

const openDropdown = ref(null);
const mobileExpanded = ref(false);
let searchTimer = null;

const datePresets = [
  { key: "all", label: "За все время" },
  { key: "today", label: "Сегодня" },
  { key: "yesterday", label: "Вчера" },
  { key: "7days", label: "За 7 дней" },
  { key: "30days", label: "За 30 дней" },
  { key: "month", label: "За этот месяц" },
  { key: "custom", label: "Произвольный диапазон" },
];

function getDropdownAlignmentClass(index) {
  const shouldAlignRight = index >= Math.max(props.filterDefs.length - 2, 0);
  return shouldAlignRight ? "right-0 left-auto" : "left-0 right-auto";
}

function getToday() {
  return toLocalDateInputValue(new Date());
}

function getDateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toLocalDateInputValue(d);
}

function getMonthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function activeDatePreset(def) {
  const from = props.modelValue[def.keyFrom] || "";
  const to = props.modelValue[def.keyTo] || "";
  if (!from && !to) return "all";
  const today = getToday();
  if (from === today && to === today) return "today";
  if (from === getDateOffset(1) && to === getDateOffset(1)) return "yesterday";
  if (from === getDateOffset(7) && to === today) return "7days";
  if (from === getDateOffset(30) && to === today) return "30days";
  if (from === getMonthStart() && to === today) return "month";
  return "custom";
}

function applyDatePreset(def, preset) {
  const today = getToday();
  const updates = { ...props.modelValue };
  if (preset.key === "all") {
    updates[def.keyFrom] = "";
    updates[def.keyTo] = "";
  } else if (preset.key === "today") {
    updates[def.keyFrom] = today;
    updates[def.keyTo] = today;
  } else if (preset.key === "yesterday") {
    const y = getDateOffset(1);
    updates[def.keyFrom] = y;
    updates[def.keyTo] = y;
  } else if (preset.key === "7days") {
    updates[def.keyFrom] = getDateOffset(7);
    updates[def.keyTo] = today;
  } else if (preset.key === "30days") {
    updates[def.keyFrom] = getDateOffset(30);
    updates[def.keyTo] = today;
  } else if (preset.key === "month") {
    updates[def.keyFrom] = getMonthStart();
    updates[def.keyTo] = today;
  }
  if (preset.key !== "custom") {
    emit("update:modelValue", updates);
    emit("change", updates);
    closeAllDropdowns();
  }
}

function applyDate(def) {
  closeAllDropdowns();
  emit("change", props.modelValue);
}

function onDateInput(key, value) {
  const updates = { ...props.modelValue, [key]: value };
  emit("update:modelValue", updates);
}

function getSelectedLabel(def) {
  if (!props.modelValue[def.key]) return def.label || def.placeholder || "";
  const opt = (def.options || []).find((o) => String(o.value) === String(props.modelValue[def.key]));
  return opt ? opt.label : def.label || def.placeholder || "";
}

function getDateRangeLabel(def) {
  const from = props.modelValue[def.keyFrom];
  const to = props.modelValue[def.keyTo];
  if (!from && !to) return def.label;
  if (from && to) return `${formatDateShort(from)} — ${formatDateShort(to)}`;
  if (from) return `от ${formatDateShort(from)}`;
  return `до ${formatDateShort(to)}`;
}

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

function toggleDropdown(key) {
  openDropdown.value = openDropdown.value === key ? null : key;
}

function closeAllDropdowns() {
  openDropdown.value = null;
}

function selectOption(key, value) {
  const updates = { ...props.modelValue, [key]: value };
  emit("update:modelValue", updates);
  emit("change", updates);
  closeAllDropdowns();
}

function onSearchInput(value) {
  if (searchTimer) clearTimeout(searchTimer);
  const updates = { ...props.modelValue, [props.searchKey]: value };
  emit("update:modelValue", updates);
  searchTimer = setTimeout(() => {
    emit("change", updates);
  }, props.searchDebounce);
}

function clearSearch() {
  onSearchInput("");
}

function resetAll() {
  const reset = {};
  if (props.searchKey in props.modelValue) reset[props.searchKey] = "";
  for (const def of props.filterDefs) {
    if (def.type === "daterange") {
      reset[def.keyFrom] = "";
      reset[def.keyTo] = "";
    } else {
      reset[def.key] = "";
    }
  }
  emit("update:modelValue", reset);
  emit("change", reset);
  mobileExpanded.value = false;
}

function removeChip(chip) {
  const updates = { ...props.modelValue };
  if (chip.type === "daterange") {
    updates[chip.keyFrom] = "";
    updates[chip.keyTo] = "";
  } else {
    updates[chip.key] = "";
  }
  emit("update:modelValue", updates);
  emit("change", updates);
}

const activeChips = computed(() => {
  const chips = [];
  for (const def of props.filterDefs) {
    if (def.type === "daterange") {
      const from = props.modelValue[def.keyFrom];
      const to = props.modelValue[def.keyTo];
      if (from || to) {
        chips.push({
          key: def.key,
          type: "daterange",
          keyFrom: def.keyFrom,
          keyTo: def.keyTo,
          label: `${def.label}: ${getDateRangeLabel(def)}`,
        });
      }
    } else {
      const val = props.modelValue[def.key];
      if (val) {
        const opt = (def.options || []).find((o) => String(o.value) === String(val));
        chips.push({
          key: def.key,
          label: `${def.label}: ${opt ? opt.label : val}`,
        });
      }
    }
  }
  return chips;
});

const activeCount = computed(() => activeChips.value.length);
const mobileInlineFilterDefs = computed(() => props.filterDefs.filter((def) => def.type === "select" || !def.type).slice(0, 2));
const mobileDrawerFilterDefs = computed(() =>
  props.filterDefs.filter((def) => !mobileInlineFilterDefs.value.some((inlineDef) => inlineDef.key === def.key)),
);

const hasActiveFilters = computed(() => {
  if (props.modelValue[props.searchKey]) return true;
  return activeCount.value > 0;
});

function handleClickOutside(event) {
  const el = event.target.closest("[data-filter-bar]");
  if (!el) closeAllDropdowns();
}

onMounted(() => document.addEventListener("click", handleClickOutside));
onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  if (searchTimer) clearTimeout(searchTimer);
});
</script>
