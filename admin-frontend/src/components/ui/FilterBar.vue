<template>
  <div class="filter-bar-wrap" v-click-outside="closeAllDropdowns">
    <!-- Компактная строка фильтров -->
    <div class="filter-bar">
      <!-- Поиск -->
      <div class="filter-search">
        <Icon name="search" :size="15" class="filter-search-icon" />
        <input
          :value="modelValue[searchKey] || ''"
          :placeholder="searchPlaceholder"
          class="filter-search-input"
          type="text"
          @input="onSearchInput($event.target.value)"
        />
        <button v-if="modelValue[searchKey]" class="filter-search-clear" @click="clearSearch">
          <Icon name="x" :size="13" />
        </button>
      </div>

      <div class="filter-sep" />

      <!-- Фильтры-дропдауны -->
      <template v-for="def in filterDefs" :key="def.key">
        <!-- Select фильтр -->
        <div v-if="def.type === 'select' || !def.type" class="filter-dropdown-wrap">
          <button
            class="filter-dropdown-trigger"
            :class="{ active: !!modelValue[def.key], open: openDropdown === def.key }"
            @click.stop="toggleDropdown(def.key)"
          >
            <span class="filter-trigger-label">
              {{ getSelectedLabel(def) }}
            </span>
            <span v-if="modelValue[def.key]" class="filter-active-dot" />
            <Icon name="chevron-down" :size="14" class="filter-chevron" :class="{ rotated: openDropdown === def.key }" />
          </button>

          <!-- Дропдаун -->
          <div v-if="openDropdown === def.key" class="filter-dropdown-panel">
            <div class="filter-dropdown-list">
              <button class="filter-dropdown-option" :class="{ selected: !modelValue[def.key] }" @click="selectOption(def.key, '')">
                <span class="filter-option-check">
                  <Icon v-if="!modelValue[def.key]" name="check" :size="13" />
                </span>
                {{ def.placeholder || "Все" }}
              </button>
              <button
                v-for="opt in def.options"
                :key="opt.value"
                class="filter-dropdown-option"
                :class="{ selected: modelValue[def.key] === opt.value }"
                @click="selectOption(def.key, opt.value)"
              >
                <span class="filter-option-check">
                  <Icon v-if="modelValue[def.key] === opt.value" name="check" :size="13" />
                </span>
                {{ opt.label }}
                <span v-if="opt.count != null" class="filter-option-count">{{ opt.count }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Дата-фильтр (range) -->
        <div v-else-if="def.type === 'daterange'" class="filter-dropdown-wrap">
          <button
            class="filter-dropdown-trigger"
            :class="{ active: modelValue[def.keyFrom] || modelValue[def.keyTo], open: openDropdown === def.key }"
            @click.stop="toggleDropdown(def.key)"
          >
            <Icon name="calendar" :size="14" class="filter-cal-icon" />
            <span class="filter-trigger-label">{{ getDateRangeLabel(def) }}</span>
            <span v-if="modelValue[def.keyFrom] || modelValue[def.keyTo]" class="filter-active-dot" />
            <Icon name="chevron-down" :size="14" class="filter-chevron" :class="{ rotated: openDropdown === def.key }" />
          </button>

          <div v-if="openDropdown === def.key" class="filter-dropdown-panel filter-date-panel">
            <div class="filter-date-list">
              <button
                v-for="preset in datePresets"
                :key="preset.key"
                class="filter-dropdown-option"
                :class="{ selected: activeDatePreset(def) === preset.key }"
                @click="applyDatePreset(def, preset)"
              >
                <span class="filter-option-check">
                  <Icon v-if="activeDatePreset(def) === preset.key" name="check" :size="13" />
                </span>
                {{ preset.label }}
              </button>
            </div>
            <div class="filter-date-range">
              <div class="filter-date-field">
                <span class="filter-date-label">С</span>
                <input
                  type="date"
                  class="filter-date-input"
                  :value="modelValue[def.keyFrom] || ''"
                  @input="onDateInput(def.keyFrom, $event.target.value)"
                />
              </div>
              <div class="filter-date-field">
                <span class="filter-date-label">По</span>
                <input
                  type="date"
                  class="filter-date-input"
                  :value="modelValue[def.keyTo] || ''"
                  @input="onDateInput(def.keyTo, $event.target.value)"
                />
              </div>
            </div>
            <div class="filter-date-actions">
              <button class="filter-date-cancel" @click="closeAllDropdowns">Отмена</button>
              <button class="filter-date-apply" @click="applyDate(def)">Применить</button>
            </div>
          </div>
        </div>
      </template>

      <!-- Кнопка сброса -->
      <button v-if="hasActiveFilters" class="filter-reset-btn" @click="resetAll">
        <Icon name="rotate-ccw" :size="14" />
        Очистить
      </button>

      <!-- Разворачивание (мобильное) -->
      <button class="filter-expand-btn hide-desktop" @click="mobileExpanded = !mobileExpanded">
        <Icon name="sliders-horizontal" :size="15" />
        <span class="filter-expand-label">Фильтры</span>
        <span v-if="activeCount > 0" class="filter-count-badge">{{ activeCount }}</span>
      </button>
    </div>

    <!-- Мобильное раскрытое меню -->
    <div v-if="mobileExpanded" class="filter-mobile-panel">
      <div v-if="modelValue[searchKey] !== undefined" class="filter-mobile-field">
        <label class="filter-mobile-label">Поиск</label>
        <div class="filter-search filter-search-mobile">
          <Icon name="search" :size="15" class="filter-search-icon" />
          <input
            :value="modelValue[searchKey] || ''"
            :placeholder="searchPlaceholder"
            class="filter-search-input"
            type="text"
            @input="onSearchInput($event.target.value)"
          />
        </div>
      </div>

      <div v-for="def in filterDefs" :key="def.key + '_mobile'" class="filter-mobile-field">
        <template v-if="def.type === 'select' || !def.type">
          <label class="filter-mobile-label">{{ def.label }}</label>
          <select class="filter-mobile-select" :value="modelValue[def.key] || ''" @change="selectOption(def.key, $event.target.value)">
            <option value="">{{ def.placeholder || "Все" }}</option>
            <option v-for="opt in def.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </template>
        <template v-else-if="def.type === 'daterange'">
          <label class="filter-mobile-label">{{ def.label }}</label>
          <div class="filter-mobile-date-row">
            <input
              type="date"
              class="filter-mobile-date"
              :value="modelValue[def.keyFrom] || ''"
              @input="onDateInput(def.keyFrom, $event.target.value)"
            />
            <span>—</span>
            <input type="date" class="filter-mobile-date" :value="modelValue[def.keyTo] || ''" @input="onDateInput(def.keyTo, $event.target.value)" />
          </div>
        </template>
      </div>

      <div class="filter-mobile-actions">
        <button class="filter-mobile-reset" @click="resetAll">Сбросить</button>
        <button class="filter-mobile-apply" @click="mobileExpanded = false">Применить</button>
      </div>
    </div>

    <!-- Активные чипы фильтров -->
    <div v-if="activeChips.length > 0" class="filter-chips-row">
      <span class="filter-chips-label">Фильтры:</span>
      <div class="filter-chips">
        <span v-for="chip in activeChips" :key="chip.key" class="filter-chip">
          {{ chip.label }}
          <button class="filter-chip-remove" @click="removeChip(chip)">
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
  // Массив определений фильтров:
  // { key, label, type: 'select'|'daterange', options?, placeholder?, keyFrom?, keyTo? }
  filterDefs: {
    type: Array,
    default: () => [],
  },
  // Задержка поиска (мс)
  searchDebounce: {
    type: Number,
    default: 300,
  },
});

const emit = defineEmits(["update:modelValue", "change"]);

const openDropdown = ref(null);
const mobileExpanded = ref(false);
let searchTimer = null;

// Preset'ы для дат
const datePresets = [
  { key: "all", label: "За все время" },
  { key: "today", label: "Сегодня" },
  { key: "yesterday", label: "Вчера" },
  { key: "7days", label: "За 7 дней" },
  { key: "30days", label: "За 30 дней" },
  { key: "month", label: "За этот месяц" },
  { key: "custom", label: "Произвольный диапазон" },
];

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getDateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function getMonthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// Определить активный пресет по текущим значениям
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

// Получить label выбранного значения для select-фильтра
function getSelectedLabel(def) {
  if (!props.modelValue[def.key]) return def.label;
  const opt = (def.options || []).find((o) => String(o.value) === String(props.modelValue[def.key]));
  return opt ? opt.label : def.label;
}

// Получить label диапазона дат
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

// Переключить дропдаун
function toggleDropdown(key) {
  openDropdown.value = openDropdown.value === key ? null : key;
}

function closeAllDropdowns() {
  openDropdown.value = null;
}

// Выбрать значение select-фильтра
function selectOption(key, value) {
  const updates = { ...props.modelValue, [key]: value };
  emit("update:modelValue", updates);
  emit("change", updates);
  closeAllDropdowns();
}

// Поиск с debounce
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

// Сброс всех фильтров
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

// Убрать один чип
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

// Список активных чипов
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

// Количество активных фильтров (без поиска)
const activeCount = computed(() => activeChips.value.length);

// Есть ли активные фильтры (включая поиск)
const hasActiveFilters = computed(() => {
  if (props.modelValue[props.searchKey]) return true;
  return activeCount.value > 0;
});

// Click outside — закрыть дропдауны
function handleClickOutside(event) {
  const el = event.target.closest(".filter-bar-wrap");
  if (!el) closeAllDropdowns();
}

onMounted(() => document.addEventListener("click", handleClickOutside));
onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<style scoped>
/* === Обёртка === */
.filter-bar-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* === Компактная строка фильтров === */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--surface-card);
  border: 1px solid var(--divider);
  border-radius: 14px;
  padding: 6px 8px;
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
}

.filter-bar::-webkit-scrollbar {
  display: none;
}

/* === Поиск === */
.filter-search {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 160px;
  max-width: 240px;
  padding: 4px 6px;
}

.filter-search-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.filter-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  min-width: 0;
}

.filter-search-input::placeholder {
  color: var(--text-secondary);
}

.filter-search-clear {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  padding: 2px;
  border-radius: 4px;
}

.filter-search-clear:hover {
  color: var(--text-primary);
}

/* === Разделитель === */
.filter-sep {
  width: 1px;
  height: 22px;
  background: var(--divider);
  flex-shrink: 0;
  margin: 0 4px;
}

/* === Дропдаун-триггеры === */
.filter-dropdown-wrap {
  position: relative;
  flex-shrink: 0;
}

.filter-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.filter-dropdown-trigger:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.filter-dropdown-trigger.active {
  color: var(--nav-active-text);
  background: var(--nav-active-bg);
  font-weight: 500;
}

.filter-dropdown-trigger.open {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.filter-trigger-label {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-active-dot {
  width: 6px;
  height: 6px;
  background: var(--nav-active-text);
  border-radius: 50%;
  flex-shrink: 0;
}

.filter-chevron {
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.filter-chevron.rotated {
  transform: rotate(180deg);
}

.filter-cal-icon {
  flex-shrink: 0;
}

/* === Выпадающие панели === */
.filter-dropdown-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 200;
  background: var(--surface-card);
  border: 1px solid var(--divider);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  min-width: 180px;
  padding: 6px;
  animation: dropdown-appear 0.15s ease;
}

@keyframes dropdown-appear {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.filter-dropdown-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.filter-dropdown-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 14px;
  text-align: left;
  width: 100%;
  transition: background 0.1s ease;
}

.filter-dropdown-option:hover {
  background: var(--bg-secondary);
}

.filter-dropdown-option.selected {
  color: var(--nav-active-text);
  font-weight: 500;
}

.filter-option-check {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--nav-active-text);
}

.filter-option-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border-radius: 20px;
  padding: 1px 7px;
  min-width: 24px;
  text-align: center;
}

/* === Дата-панель === */
.filter-date-panel {
  min-width: 240px;
}

.filter-date-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  border-bottom: 1px solid var(--divider);
  padding-bottom: 6px;
  margin-bottom: 8px;
}

.filter-date-range {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 4px;
}

.filter-date-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-date-label {
  font-size: 13px;
  color: var(--text-secondary);
  width: 24px;
  flex-shrink: 0;
}

.filter-date-input {
  flex: 1;
  border: 1px solid var(--divider);
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-primary);
  outline: none;
}

.filter-date-input:focus {
  border-color: var(--nav-active-text);
}

.filter-date-actions {
  display: flex;
  gap: 6px;
  padding: 8px 4px 2px;
  justify-content: flex-end;
}

.filter-date-cancel,
.filter-date-apply {
  padding: 6px 14px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  
  font-weight: 500;
  transition: opacity 0.15s;
}

.filter-date-cancel {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.filter-date-apply {
  background: var(--nav-active-bg);
  color: var(--nav-active-text);
}

.filter-date-cancel:hover,
.filter-date-apply:hover {
  opacity: 0.8;
}

/* === Кнопка сброса === */
.filter-reset-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  
  cursor: pointer;
  border-radius: 10px;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s;
  margin-left: 2px;
}

.filter-reset-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* === Кнопка разворачивания (мобильная) === */
.filter-expand-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
  
  border-radius: 10px;
  flex-shrink: 0;
  margin-left: auto;
}

.filter-count-badge {
  background: var(--nav-active-text);
  color: #fff;
  border-radius: 20px;
  padding: 1px 7px;
  font-size: 12px;
  font-weight: 600;
}

/* === Активные чипы === */
.filter-chips-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-chips-label {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px 4px 12px;
  background: var(--nav-active-bg);
  color: var(--nav-active-text);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.filter-chip-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--nav-active-text);
  border-radius: 50%;
  padding: 0;
  opacity: 0.7;
  transition: opacity 0.15s;
}

.filter-chip-remove:hover {
  opacity: 1;
}

/* === Мобильная панель === */
.filter-mobile-panel {
  background: var(--surface-card);
  border: 1px solid var(--divider);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-mobile-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-mobile-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.filter-mobile-select {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--divider);
  border-radius: 10px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  
  outline: none;
  appearance: none;
}

.filter-mobile-date-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-mobile-date {
  flex: 1;
  padding: 9px 12px;
  border: 1px solid var(--divider);
  border-radius: 10px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  
  outline: none;
}

.filter-search-mobile {
  max-width: none;
  flex: unset;
  border: 1px solid var(--divider);
  border-radius: 10px;
  padding: 8px 12px;
}

.filter-mobile-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 4px;
  border-top: 1px solid var(--divider);
}

.filter-mobile-reset {
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid var(--divider);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  
  cursor: pointer;
}

.filter-mobile-apply {
  padding: 8px 16px;
  border-radius: 10px;
  border: none;
  background: var(--nav-active-bg);
  color: var(--nav-active-text);
  font-size: 14px;
  font-weight: 600;
  
  cursor: pointer;
}

/* === Адаптивность === */
@media (max-width: 768px) {
  .hide-desktop {
    display: flex !important;
  }

  .filter-dropdown-wrap {
    display: none;
  }

  .filter-sep {
    display: none;
  }

  .filter-search {
    max-width: none;
    flex: 1;
  }

  .filter-reset-btn {
    display: none;
  }
}

@media (min-width: 769px) {
  .hide-desktop {
    display: none !important;
  }

  .filter-mobile-panel {
    display: none;
  }
}
</style>
