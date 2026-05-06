<template>
  <div class="roles-view">
    <PageHeader title="Роли">
      <template #actions>
        <Input v-model="search" placeholder="Поиск по роли" />
      </template>
    </PageHeader>

    <DataTable
      :total="total"
      :page="page"
      :limit="limit"
      :loading="loading"
      :is-empty="!loading && !roles.length"
      empty-title="Роли не найдены"
      empty-description="Попробуйте изменить параметры фильтрации"
      @update:page="handlePageChange"
      @update:limit="handleLimitChange"
    >
      <template #head>
        <TableHead>Название</TableHead>
        <TableHead>Описание</TableHead>
        <TableHead>Приоритет</TableHead>
        <TableHead>Права</TableHead>
        <TableHead>Пользователи</TableHead>
        <TableHead>Статус</TableHead>
        <TableHead>Действия</TableHead>
      </template>
      <template #body>
        <TableRow v-for="role in roles" :key="role.id">
          <TableCell>{{ role.name }}</TableCell>
          <TableCell>{{ role.description || "—" }}</TableCell>
          <TableCell>{{ role.priority ?? 0 }}</TableCell>
          <TableCell>{{ role.permissions_count ?? 0 }}</TableCell>
          <TableCell>{{ role.users_count ?? 0 }}</TableCell>
          <TableCell>
            <Badge :variant="role.is_active ? 'success' : 'secondary'" size="sm">
              {{ role.is_active ? "Активна" : "Отключена" }}
            </Badge>
          </TableCell>
          <TableCell>
            <div class="role-actions">
              <Button size="sm" variant="secondary" icon="Pencil" @click="openRole(role.id)">Редактировать</Button>
            </div>
          </TableCell>
        </TableRow>
      </template>
    </DataTable>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { Badge, Button, DataTable, Input, PageHeader, TableCell, TableHead, TableRow } from "@/components/ui";
import { getRoles } from "@/api/roles";
import { useToast } from "@/composables/useToast";

const router = useRouter();
const { showToast } = useToast();

const loading = ref(false);
const roles = ref([]);
const total = ref(0);
const page = ref(1);
const limit = ref(20);
const search = ref("");

let searchTimer = null;

async function loadRoles() {
  loading.value = true;
  try {
    const data = await getRoles({ page: page.value, limit: limit.value, search: search.value.trim() || undefined });
    roles.value = data?.roles || [];
    total.value = Number(data?.total || 0);
  } catch (error) {
    console.error("Ошибка загрузки ролей", error);
    showToast("Не удалось загрузить роли", "error");
  } finally {
    loading.value = false;
  }
}

function handlePageChange(nextPage) {
  page.value = Number(nextPage || 1);
  loadRoles();
}

function handleLimitChange(nextLimit) {
  limit.value = Number(nextLimit || 20);
  page.value = 1;
  loadRoles();
}

function openRole(roleId) {
  router.push(`/roles/${roleId}`);
}

watch(search, () => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
  searchTimer = setTimeout(() => {
    page.value = 1;
    loadRoles();
  }, 250);
});

onMounted(loadRoles);
</script>

<style scoped>
.roles-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.role-actions {
  display: flex;
  gap: 8px;
}
</style>
