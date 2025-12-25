<template>
  <div class="permissions-container">
    <div class="permissions-header">
      <h3>Права доступа к модулям</h3>
      <p class="hint">Настройте индивидуальные права доступа для этого пользователя</p>
    </div>

    <div v-if="loading" class="loading">Загрузка прав доступа...</div>

    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-else class="permissions-list">
      <div v-for="permission in permissions" :key="permission.moduleId" class="permission-item" :class="{ 'is-custom': permission.isCustom }">
        <div class="permission-content">
          <div class="permission-info">
            <label class="permission-label">
              <input
                type="checkbox"
                :checked="permission.hasAccess"
                @change="toggleAccess(permission.moduleId, $event.target.checked)"
                class="permission-checkbox"
              />
              <span class="module-name">{{ permission.moduleName }}</span>
            </label>
            <p v-if="permission.moduleDescription" class="module-description">
              {{ permission.moduleDescription }}
            </p>
            <div v-if="permission.isCustom" class="custom-badge">Индивидуальная настройка</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading" class="actions">
      <div class="actions-left">
        <button
          @click="resetToDefaults"
          :disabled="saving || !hasCustomPermissions"
          class="btn btn-ghost"
          title="Сбросить все настройки до умолчаний роли"
        >
          Сбросить до умолчаний
        </button>
      </div>
      <div v-if="hasChanges" class="actions-right">
        <button @click="savePermissions" :disabled="saving" class="btn btn-primary">
          {{ saving ? "Сохранение..." : "Сохранить права" }}
        </button>
        <button @click="cancelChanges" :disabled="saving" class="btn btn-secondary">Отменить</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { getUserPermissions, updateUserPermissions } from "../api/users";
import { useToast } from "../composables/useToast";

const props = defineProps({
  userId: {
    type: Number,
    required: true,
  },
});

const { showToast } = useToast();

const loading = ref(false);
const saving = ref(false);
const error = ref(null);
const permissions = ref([]);
const originalPermissions = ref([]);

const hasChanges = computed(() => {
  return JSON.stringify(permissions.value) !== JSON.stringify(originalPermissions.value);
});

const hasCustomPermissions = computed(() => {
  return permissions.value.some((p) => p.isCustom);
});

const loadPermissions = async () => {
  if (!props.userId) return;

  loading.value = true;
  error.value = null;

  try {
    const response = await getUserPermissions(props.userId);
    permissions.value = response.permissions || [];
    originalPermissions.value = JSON.parse(JSON.stringify(permissions.value));
  } catch (err) {
    console.error("Ошибка загрузки прав:", err);
    error.value = "Не удалось загрузить права доступа";
    showToast("Ошибка загрузки прав доступа", "error");
  } finally {
    loading.value = false;
  }
};

const toggleAccess = (moduleId, hasAccess) => {
  const permission = permissions.value.find((p) => p.moduleId === moduleId);
  if (permission) {
    permission.hasAccess = hasAccess;
    permission.isCustom = true;
  }
};

const savePermissions = async () => {
  saving.value = true;

  try {
    const modules = permissions.value.map((p) => ({
      moduleId: p.moduleId,
      hasAccess: p.hasAccess,
    }));

    await updateUserPermissions(props.userId, modules);
    originalPermissions.value = JSON.parse(JSON.stringify(permissions.value));
    showToast("Права доступа успешно обновлены", "success");
  } catch (err) {
    console.error("Ошибка сохранения прав:", err);
    showToast("Не удалось сохранить права доступа", "error");
  } finally {
    saving.value = false;
  }
};

const cancelChanges = () => {
  permissions.value = JSON.parse(JSON.stringify(originalPermissions.value));
};

const resetToDefaults = async () => {
  if (!confirm("Вы уверены, что хотите сбросить все индивидуальные права до умолчаний роли?")) {
    return;
  }

  saving.value = true;
  try {
    // Отправляем пустой массив модулей, чтобы удалить все кастомные права
    await updateUserPermissions(props.userId, []);
    showToast("Права сброшены до умолчаний", "success");
    // Перезагружаем права
    await loadPermissions();
  } catch (err) {
    console.error("Ошибка сброса прав:", err);
    showToast("Не удалось сбросить права", "error");
  } finally {
    saving.value = false;
  }
};

watch(
  () => props.userId,
  () => {
    loadPermissions();
  },
  { immediate: true }
);
</script>

<style scoped>
.permissions-container {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.permissions-header {
  margin-bottom: 24px;
}

.permissions-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.hint {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.loading,
.error-message {
  padding: 20px;
  text-align: center;
  color: #6b7280;
}

.error-message {
  color: #ef4444;
}

.permissions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.permission-item {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  transition: all 0.2s;
}

.permission-item:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.permission-item.is-custom {
  border-color: #6366f1;
  background: #eef2ff;
}

.permission-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.permission-info {
  flex: 1;
}

.permission-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-weight: 500;
  color: #1f2937;
}

.permission-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #6366f1;
}

.module-name {
  font-size: 15px;
}

.module-description {
  margin: 8px 0 0 30px;
  font-size: 13px;
  color: #6b7280;
}

.custom-badge {
  margin: 8px 0 0 30px;
  display: inline-block;
  padding: 2px 8px;
  background: #6366f1;
  color: white;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.actions-left {
  display: flex;
  gap: 12px;
}

.actions-right {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #6366f1;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #4f46e5;
}

.btn-secondary {
  background: #e5e7eb;
  color: #1f2937;
}

.btn-secondary:hover:not(:disabled) {
  background: #d1d5db;
}

.btn-ghost {
  background: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.btn-ghost:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}
</style>
