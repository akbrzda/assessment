<template>
  <div class="permission-matrix">
    <div class="permission-matrix__header">
      <h3>{{ title }}</h3>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>

    <div class="permission-matrix__table-wrap">
      <table class="permission-matrix__table">
        <thead>
          <tr>
            <th>Модуль</th>
            <th>Сущность</th>
            <th>Действие</th>
            <th>Режим</th>
            <th>Условия (JSON)</th>
            <th>Истекает</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="permission in normalizedPermissions" :key="permission.permissionId">
            <td>{{ permission.moduleCode || "—" }}</td>
            <td>{{ permission.entityCode || "—" }}</td>
            <td>{{ permission.actionCode || "—" }}</td>
            <td>
              <div class="permission-matrix__effects">
                <label>
                  <input
                    type="radio"
                    :name="`effect-${permission.permissionId}`"
                    :checked="resolveEffect(permission.permissionId) === 'allow'"
                    @change="updateEffect(permission.permissionId, 'allow')"
                  />
                  allow
                </label>
                <label>
                  <input
                    type="radio"
                    :name="`effect-${permission.permissionId}`"
                    :checked="resolveEffect(permission.permissionId) === 'deny'"
                    @change="updateEffect(permission.permissionId, 'deny')"
                  />
                  deny
                </label>
                <label>
                  <input
                    type="radio"
                    :name="`effect-${permission.permissionId}`"
                    :checked="resolveEffect(permission.permissionId) === null"
                    @change="updateEffect(permission.permissionId, null)"
                  />
                  none
                </label>
              </div>
            </td>
            <td>
              <textarea
                :class="['permission-matrix__textarea', resolveJsonError(permission.permissionId) && 'permission-matrix__textarea--error']"
                :value="resolveConditions(permission.permissionId)"
                :aria-invalid="Boolean(resolveJsonError(permission.permissionId))"
                placeholder='{"branchId":1}'
                @change="updateConditions(permission.permissionId, $event.target.value)"
              />
              <p v-if="resolveJsonError(permission.permissionId)" class="permission-matrix__json-error">
                {{ resolveJsonError(permission.permissionId) }}
              </p>
            </td>
            <td>
              <input
                class="permission-matrix__date"
                type="datetime-local"
                :value="resolveExpiresAt(permission.permissionId)"
                @change="updateExpiresAt(permission.permissionId, $event.target.value)"
              />
            </td>
          </tr>
          <tr v-if="!normalizedPermissions.length">
            <td colspan="6" class="permission-matrix__empty">Нет доступных прав</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  permissions: {
    type: Array,
    default: () => [],
  },
  modelValue: {
    type: Array,
    default: () => [],
  },
  title: {
    type: String,
    default: "Матрица прав",
  },
  subtitle: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:modelValue"]);

const jsonErrors = ref(new Map());

const normalizedPermissions = computed(() =>
  (props.permissions || []).map((item) => ({
    permissionId: Number(item.permissionId || item.id),
    moduleCode: item.moduleCode || item.module_code || "",
    entityCode: item.entityCode || item.entity_code || "",
    actionCode: item.actionCode || item.action_code || "",
  })),
);

const normalizedValueMap = computed(() => {
  const map = new Map();
  for (const item of props.modelValue || []) {
    map.set(Number(item.permissionId), {
      permissionId: Number(item.permissionId),
      effect: item.effect || null,
      conditions: item.conditions || null,
      expiresAt: item.expiresAt || null,
    });
  }
  return map;
});

function emitNext(nextMap) {
  emit(
    "update:modelValue",
    Array.from(nextMap.values()).filter((item) => item.effect),
  );
}

function resolveEffect(permissionId) {
  return normalizedValueMap.value.get(Number(permissionId))?.effect || null;
}

function resolveConditions(permissionId) {
  const value = normalizedValueMap.value.get(Number(permissionId))?.conditions;
  if (!value) {
    return "";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function resolveExpiresAt(permissionId) {
  const value = normalizedValueMap.value.get(Number(permissionId))?.expiresAt;
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function resolveJsonError(permissionId) {
  return jsonErrors.value.get(Number(permissionId)) || null;
}

function updateEffect(permissionId, effect) {
  const key = Number(permissionId);
  const nextMap = new Map(normalizedValueMap.value);
  const prev = nextMap.get(key) || { permissionId: key, effect: null, conditions: null, expiresAt: null };
  prev.effect = effect;
  nextMap.set(key, prev);
  emitNext(nextMap);
}

function updateConditions(permissionId, rawValue) {
  const key = Number(permissionId);
  const nextMap = new Map(normalizedValueMap.value);
  const prev = nextMap.get(key) || { permissionId: key, effect: null, conditions: null, expiresAt: null };

  const value = String(rawValue || "").trim();
  const nextErrors = new Map(jsonErrors.value);
  if (!value) {
    prev.conditions = null;
    nextErrors.delete(key);
    jsonErrors.value = nextErrors;
  } else {
    try {
      prev.conditions = JSON.parse(value);
      nextErrors.delete(key);
      jsonErrors.value = nextErrors;
    } catch {
      nextErrors.set(key, "Некорректный JSON");
      jsonErrors.value = nextErrors;
      return;
    }
  }

  nextMap.set(key, prev);
  emitNext(nextMap);
}

function updateExpiresAt(permissionId, rawValue) {
  const key = Number(permissionId);
  const nextMap = new Map(normalizedValueMap.value);
  const prev = nextMap.get(key) || { permissionId: key, effect: null, conditions: null, expiresAt: null };
  prev.expiresAt = rawValue ? new Date(rawValue).toISOString() : null;
  nextMap.set(key, prev);
  emitNext(nextMap);
}
</script>

<style scoped>
.permission-matrix {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.permission-matrix__header h3 {
  margin: 0;
}

.permission-matrix__header p {
  margin: 4px 0 0;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.permission-matrix__table-wrap {
  overflow: auto;
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
}

.permission-matrix__table {
  width: 100%;
  border-collapse: collapse;
  min-width: 920px;
}

.permission-matrix__table th,
.permission-matrix__table td {
  border-bottom: 1px solid hsl(var(--border));
  padding: 10px;
  text-align: left;
  vertical-align: top;
  font-size: 13px;
}

.permission-matrix__table th {
  background: hsl(var(--muted));
}

.permission-matrix__effects {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.permission-matrix__effects label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.permission-matrix__textarea {
  width: 100%;
  min-height: 74px;
  resize: vertical;
  border: 1px solid hsl(var(--input));
  border-radius: 10px;
  padding: 8px;
  font-size: 12px;
}

.permission-matrix__date {
  width: 100%;
  border: 1px solid hsl(var(--input));
  border-radius: 10px;
  padding: 8px;
  font-size: 12px;
}

.permission-matrix__empty {
  color: hsl(var(--muted-foreground));
  text-align: center;
}

.permission-matrix__textarea--error {
  border-color: hsl(var(--field-border-error));
  background: hsl(var(--field-error-bg));
}

.permission-matrix__json-error {
  margin: 4px 0 0;
  font-size: 11px;
  color: hsl(var(--destructive));
}
</style>
