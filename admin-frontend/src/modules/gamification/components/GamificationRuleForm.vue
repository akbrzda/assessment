<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-modal p-4">
    <div class="bg-card rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Заголовок -->
      <div class="sticky top-0 bg-card border-b border-border px-6 py-4 flex justify-between items-center">
        <h3 class="text-xl font-semibold text-foreground">
          {{ isEditing ? "Редактировать правило" : "Новое правило" }}
        </h3>
        <Button @click="$emit('close')" variant="ghost" icon="x" :icon-only="true" aria-label="Закрыть форму" />
      </div>

      <!-- Контент формы -->
      <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
        <!-- Основные поля -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-foreground mb-1"> Код правила <span class="text-destructive">*</span> </label>
            <input
              v-model="formData.code"
              type="text"
              required
              :disabled="isEditing"
              class="w-full px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder:text-muted-foreground disabled:bg-muted disabled:cursor-not-allowed"
              placeholder="base_score"
            />
            <p class="mt-1 text-xs text-muted-foreground">Уникальный идентификатор (только английские буквы, цифры, _)</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-foreground mb-1"> Название <span class="text-destructive">*</span> </label>
            <input
              v-model="formData.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder:text-muted-foreground"
              placeholder="Базовые очки"
            />
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-foreground mb-1"> Тип правила <span class="text-destructive">*</span> </label>
            <select
              v-model="formData.ruleType"
              required
              class="w-full px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
            >
              <option value="points">Очки</option>
              <option value="badge">Бейдж</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-foreground mb-1">Приоритет</label>
            <input
              v-model.number="formData.priority"
              type="number"
              min="0"
              class="w-full px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
            />
            <p class="mt-1 text-xs text-muted-foreground">Меньше = выше</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-foreground mb-1">Статус</label>
            <div class="flex items-center h-10">
              <input v-model="formData.isActive" type="checkbox" class="h-4 w-4 text-primary focus:ring-ring border-input rounded" />
              <label class="ml-2 text-sm text-foreground">Активно</label>
            </div>
          </div>
        </div>

        <!-- Период действия -->
        <div class="grid grid-cols-2 gap-4">
          <DatePicker v-model="formData.activeFrom" label="Активно с" />
          <DatePicker v-model="formData.activeTo" label="Активно до" />
        </div>

        <!-- Условия (Condition) -->
        <div>
          <label class="block text-sm font-medium text-foreground mb-2">Условия применения</label>
          <div class="bg-muted/40 p-4 rounded-lg space-y-3">
            <div>
              <label class="text-xs text-muted-foreground">Событие</label>
              <select v-model="conditionForm.event" class="w-full px-2 py-1 border border-input bg-background rounded text-sm text-foreground">
                <option value="attempt">Завершение попытки</option>
                <option value="answer">Ответ на вопрос</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <label class="flex items-center">
                <input v-model="conditionForm.passed" type="checkbox" class="rounded border-input text-primary" />
                <span class="ml-2 text-sm text-foreground">Тест пройден</span>
              </label>
              <label class="flex items-center">
                <input v-model="conditionForm.perfect" type="checkbox" class="rounded border-input text-primary" />
                <span class="ml-2 text-sm text-foreground">Идеальный результат</span>
              </label>
            </div>
            <div v-if="conditionForm.event === 'answer'">
              <label class="flex items-center">
                <input v-model="conditionForm.answer_correct" type="checkbox" class="rounded border-input text-primary" />
                <span class="ml-2 text-sm text-foreground">Ответ верный</span>
              </label>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="text-xs text-muted-foreground">Мин. балл (%)</label>
                <input
                  v-model.number="conditionForm.min_score"
                  type="number"
                  min="0"
                  max="100"
                  class="w-full px-2 py-1 border border-input bg-background rounded text-sm text-foreground"
                />
              </div>
              <div>
                <label class="text-xs text-muted-foreground">Макс. балл (%)</label>
                <input
                  v-model.number="conditionForm.max_score"
                  type="number"
                  min="0"
                  max="100"
                  class="w-full px-2 py-1 border border-input bg-background rounded text-sm text-foreground"
                />
              </div>
              <div>
                <label class="text-xs text-muted-foreground">Макс. время (ratio)</label>
                <input
                  v-model.number="conditionForm.max_time_ratio"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  class="w-full px-2 py-1 border border-input bg-background rounded text-sm text-foreground"
                />
              </div>
            </div>
            <div>
              <label class="text-xs text-muted-foreground">Мин. серия</label>
              <input
                v-model.number="conditionForm.min_streak"
                type="number"
                min="0"
                class="w-full px-2 py-1 border border-input bg-background rounded text-sm text-foreground"
              />
            </div>
          </div>
        </div>

        <!-- Формула -->
        <div>
          <label class="block text-sm font-medium text-foreground mb-2">Формула начисления</label>
          <div class="bg-muted/40 p-4 rounded-lg space-y-3">
            <div v-if="formData.ruleType === 'points'">
              <div>
                <label class="text-xs text-muted-foreground">Режим</label>
                <select v-model="formulaForm.mode" class="w-full px-2 py-1 border border-input bg-background rounded text-sm text-foreground">
                  <option value="fixed">Фиксированное значение</option>
                  <option value="percent_of_score">Процент от балла</option>
                  <option value="multiplier">Множитель</option>
                </select>
              </div>
              <div class="mt-2">
                <label class="text-xs text-muted-foreground">Значение</label>
                <input
                  v-model.number="formulaForm.value"
                  type="number"
                  step="0.01"
                  class="w-full px-2 py-1 border border-input bg-background rounded text-sm text-foreground"
                />
              </div>
              <div v-if="formulaForm.mode === 'percent_of_score'" class="mt-2">
                <label class="text-xs text-muted-foreground">Максимальный лимит (cap)</label>
                <input
                  v-model.number="formulaForm.cap"
                  type="number"
                  class="w-full px-2 py-1 border border-input bg-background rounded text-sm text-foreground"
                />
              </div>
            </div>
            <div v-else>
              <label class="text-xs text-muted-foreground">Код бейджа</label>
              <input
                v-model="formulaForm.badge_code"
                type="text"
                class="w-full px-2 py-1 border border-input bg-background rounded text-sm text-foreground"
                placeholder="perfect_run"
              />
            </div>
          </div>
        </div>

        <!-- Scope (опционально) -->
        <div>
          <label class="block text-sm font-medium text-foreground mb-2">Область применения (необязательно)</label>
          <div class="bg-muted/40 p-4 rounded-lg space-y-3">
            <div>
              <label class="text-xs text-muted-foreground">ID филиалов (через запятую)</label>
              <input
                v-model="scopeForm.branchIdsStr"
                type="text"
                class="w-full px-2 py-1 border border-input bg-background rounded text-sm text-foreground"
                placeholder="1,2,3"
              />
            </div>
            <div>
              <label class="text-xs text-muted-foreground">ID должностей (через запятую)</label>
              <input
                v-model="scopeForm.positionIdsStr"
                type="text"
                class="w-full px-2 py-1 border border-input bg-background rounded text-sm text-foreground"
                placeholder="1,2"
              />
            </div>
            <div>
              <label class="text-xs text-muted-foreground">ID аттестаций (через запятую)</label>
              <input
                v-model="scopeForm.assessmentIdsStr"
                type="text"
                class="w-full px-2 py-1 border border-input bg-background rounded text-sm text-foreground"
                placeholder="10,15"
              />
            </div>
          </div>
        </div>

        <!-- Кнопки -->
        <div class="flex justify-end gap-3 pt-4 border-t border-border">
          <ActionButton action="cancel" @click="$emit('close')" />
          <ActionButton action="save" type="submit" :loading="saving" :disabled="saving" />
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useToast } from "@/composables/useToast";
import gamificationRulesApi from "@/api/gamificationRules";
import Button from "@/components/ui/Button.vue";
import ActionButton from "@/components/ui/ActionButton.vue";
import DatePicker from "@/components/ui/DatePicker.vue";
import { toLocalDateTimeInputValue } from "@/utils/dateUtils";

const props = defineProps({
  rule: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["close", "save"]);

const { showError } = useToast();

const isEditing = computed(() => !!props.rule);
const saving = ref(false);

const formData = ref({
  code: "",
  name: "",
  ruleType: "points",
  priority: 100,
  isActive: true,
  activeFrom: null,
  activeTo: null,
});

const conditionForm = ref({
  event: "attempt",
  passed: null,
  perfect: null,
  min_score: null,
  max_score: null,
  max_time_ratio: null,
  min_streak: null,
  answer_correct: null,
});

const formulaForm = ref({
  mode: "fixed",
  value: 0,
  cap: null,
  badge_code: "",
});

const scopeForm = ref({
  branchIdsStr: "",
  positionIdsStr: "",
  assessmentIdsStr: "",
});

// Инициализация формы из props.rule
if (props.rule) {
  formData.value = {
    code: props.rule.code,
    name: props.rule.name,
    ruleType: props.rule.ruleType,
    priority: props.rule.priority || 100,
    isActive: props.rule.isActive,
    activeFrom: props.rule.activeFrom ? toLocalDateTimeInputValue(props.rule.activeFrom) : null,
    activeTo: props.rule.activeTo ? toLocalDateTimeInputValue(props.rule.activeTo) : null,
  };

  if (props.rule.condition) {
    Object.assign(conditionForm.value, props.rule.condition);
    if (!conditionForm.value.event) conditionForm.value.event = "attempt";
  }

  if (props.rule.formula) {
    Object.assign(formulaForm.value, props.rule.formula);
  }

  if (props.rule.scope) {
    scopeForm.value = {
      branchIdsStr: (props.rule.scope.branchIds || []).join(","),
      positionIdsStr: (props.rule.scope.positionIds || []).join(","),
      assessmentIdsStr: (props.rule.scope.assessmentIds || []).join(","),
    };
  }
}

watch(
  () => conditionForm.value.event,
  (ev) => {
    if (ev !== "answer") {
      conditionForm.value.answer_correct = null;
    } else if (conditionForm.value.answer_correct === null || conditionForm.value.answer_correct === undefined) {
      conditionForm.value.answer_correct = true;
    }
  },
);

function parseIds(str) {
  if (!str || !str.trim()) return [];
  return str
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s)
    .map((s) => parseInt(s, 10))
    .filter((n) => !isNaN(n));
}

function cleanObject(obj) {
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== "") {
      cleaned[key] = value;
    }
  }
  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

async function handleSubmit() {
  saving.value = true;
  try {
    const condition = cleanObject(conditionForm.value);
    const formula = cleanObject(formulaForm.value);

    const scopeData = {
      branchIds: parseIds(scopeForm.value.branchIdsStr),
      positionIds: parseIds(scopeForm.value.positionIdsStr),
      assessmentIds: parseIds(scopeForm.value.assessmentIdsStr),
    };
    const scope = scopeData.branchIds.length || scopeData.positionIds.length || scopeData.assessmentIds.length ? scopeData : null;

    const payload = {
      code: formData.value.code,
      name: formData.value.name,
      ruleType: formData.value.ruleType,
      condition: condition || {},
      formula: formula || {},
      scope,
      priority: formData.value.priority,
      isActive: formData.value.isActive,
      activeFrom: formData.value.activeFrom || null,
      activeTo: formData.value.activeTo || null,
    };

    if (isEditing.value) {
      await gamificationRulesApi.update(props.rule.id, payload);
    } else {
      await gamificationRulesApi.create(payload);
    }

    emit("save");
  } catch (err) {
    showError(err.response?.data?.error || "Не удалось сохранить правило");
  } finally {
    saving.value = false;
  }
}
</script>
