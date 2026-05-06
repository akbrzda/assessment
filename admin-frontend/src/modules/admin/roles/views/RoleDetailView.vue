<template>
  <div class="role-detail-view">
    <PageHeader :title="`Роль: ${role?.name || '—'}`">
      <template #actions>
        <Button variant="secondary" icon="ArrowLeft" @click="goBack">Назад</Button>
        <Button :loading="saving" icon="Save" @click="savePermissions">Сохранить</Button>
      </template>
    </PageHeader>

    <Card v-if="loading">
      <Preloader />
    </Card>

    <template v-else>
      <Card class="role-meta">
        <div class="meta-grid">
          <div><span>Код</span><strong>{{ role?.code || "—" }}</strong></div>
          <div><span>Приоритет</span><strong>{{ role?.priority ?? 0 }}</strong></div>
          <div><span>Системная</span><strong>{{ role?.is_system ? "Да" : "Нет" }}</strong></div>
          <div><span>Активна</span><strong>{{ role?.is_active ? "Да" : "Нет" }}</strong></div>
        </div>
      </Card>

      <PermissionMatrixComponent
        v-model="editablePermissions"
        :permissions="availablePermissions"
        title="Матрица прав роли"
        subtitle="Выберите режим allow/deny для каждого права"
      />
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Button, Card, PageHeader, Preloader } from "@/components/ui";
import PermissionMatrixComponent from "@/components/PermissionMatrixComponent.vue";
import { getRoleById, updateRolePermissions } from "@/api/roles";
import { useToast } from "@/composables/useToast";

const route = useRoute();
const router = useRouter();
const { showToast } = useToast();

const loading = ref(false);
const saving = ref(false);
const role = ref(null);
const availablePermissions = ref([]);
const editablePermissions = ref([]);

const roleId = computed(() => Number(route.params.id));

function normalizePermission(permission) {
  return {
    permissionId: Number(permission.permissionId || permission.id),
    moduleCode: permission.moduleCode || permission.module_code || "",
    entityCode: permission.entityCode || permission.entity_code || "",
    actionCode: permission.actionCode || permission.action_code || "",
  };
}

function normalizeEditablePermission(permission) {
  return {
    permissionId: Number(permission.permissionId || permission.id),
    effect: permission.effect || null,
    conditions: permission.conditions || null,
    expiresAt: permission.expiresAt || null,
  };
}

async function loadRole() {
  loading.value = true;
  try {
    const data = await getRoleById(roleId.value);
    role.value = data?.role || null;

    const currentPermissions = (data?.permissions || []).map((item) => normalizePermission(item));
    const allPermissions = (data?.availablePermissions || []).map((item) => normalizePermission(item));
    const merged = new Map();
    for (const permission of allPermissions) {
      merged.set(permission.permissionId, permission);
    }
    for (const permission of currentPermissions) {
      merged.set(permission.permissionId, permission);
    }

    availablePermissions.value = Array.from(merged.values());
    editablePermissions.value = (data?.permissions || []).map((item) => normalizeEditablePermission(item));
  } catch (error) {
    console.error("Ошибка загрузки роли", error);
    showToast("Не удалось загрузить роль", "error");
  } finally {
    loading.value = false;
  }
}

async function savePermissions() {
  saving.value = true;
  try {
    const payload = editablePermissions.value
      .filter((item) => item.effect)
      .map((item) => ({
        permissionId: item.permissionId,
        effect: item.effect,
        conditions: item.conditions || null,
        expiresAt: item.expiresAt || null,
      }));
    await updateRolePermissions(roleId.value, payload);
    showToast("Права роли обновлены", "success");
    await loadRole();
  } catch (error) {
    console.error("Ошибка сохранения прав роли", error);
    showToast("Не удалось сохранить права роли", "error");
  } finally {
    saving.value = false;
  }
}

function goBack() {
  router.push("/roles");
}

onMounted(loadRole);
</script>

<style scoped>
.role-detail-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 12px;
}

.meta-grid > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-grid span {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

@media (max-width: 900px) {
  .meta-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
