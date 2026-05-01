<template>
  <div>
    <div v-if="skeletonVisible" class="space-y-4">
      <Skeleton class="h-12 w-full rounded-2xl" />
      <Skeleton class="h-10 w-80 max-w-full rounded-xl" />
      <SkeletonTable :rows="8" />
    </div>

    <DataTable
      v-else
      :total="totalUsers"
      :page="pagination.page"
      :limit="pagination.perPage"
      :is-empty="visibleUsers.length === 0"
      empty-type="filter"
      empty-title="Пользователи не найдены"
      @update:page="emit('update:page', $event)"
      @update:limit="emit('update:limit', $event)"
    >
      <template #head>
        <TableHead>
          <input type="checkbox" :checked="allUsersSelected" @change="emit('toggle-select-all')" />
        </TableHead>
        <TableHead>Пользователь</TableHead>
        <TableHead>Логин</TableHead>
        <TableHead>Должность</TableHead>
        <TableHead>Роль</TableHead>
        <TableHead>Филиал</TableHead>
        <TableHead>Статус</TableHead>
        <TableHead>Создан</TableHead>
        <TableHead right>Действия</TableHead>
      </template>

      <template #body>
        <TableRow v-for="user in visibleUsers" :key="user.id">
          <TableCell>
            <input type="checkbox" :checked="selectedUserIds.includes(user.id)" @change="emit('toggle-user-selection', user.id)" />
          </TableCell>
          <TableCell>
            <div class="cursor-pointer" @click="emit('open-profile-page', user)">
              <div class="font-semibold text-foreground">{{ user.first_name }} {{ user.last_name }}</div>
              <div class="text-sm text-muted-foreground">{{ user.login || "—" }}</div>
            </div>
          </TableCell>
          <TableCell muted>{{ user.login || "—" }}</TableCell>
          <TableCell muted>{{ user.position_name || "—" }}</TableCell>
          <TableCell>
            <Badge :variant="getRoleBadgeVariant(user.role_name)" size="sm">
              {{ getRoleLabel(user.role_name) }}
            </Badge>
          </TableCell>
          <TableCell muted>{{ user.branch_name || "—" }}</TableCell>
          <TableCell>
            <span :class="['status-pill', `status-pill-${getUserStatus(user).key}`]">
              <span class="status-dot"></span>
              {{ getUserStatus(user).label }}
            </span>
          </TableCell>
          <TableCell muted>{{ formatDate(user.created_at) }}</TableCell>
          <TableCell right>
            <div class="flex items-center justify-end gap-1">
              <Button
                v-if="canEditUser(user)"
                variant="ghost"
                size="sm"
                :icon-only="true"
                icon="pencil"
                title="Редактировать"
                @click="emit('open-edit-modal', user)"
              />
              <Button
                v-if="isSuperAdmin"
                variant="ghost"
                size="sm"
                :icon-only="true"
                icon="trash"
                title="Удалить"
                @click="emit('open-delete-modal', user)"
              />
            </div>
          </TableCell>
        </TableRow>
      </template>

      <template #mobile>
        <div v-for="user in visibleUsers" :key="user.id" class="p-4 space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="font-semibold text-foreground cursor-pointer" @click="emit('open-profile-page', user)">{{ user.first_name }} {{ user.last_name }}</h3>
              <p class="text-sm text-muted-foreground">ID: {{ user.id }}</p>
            </div>
            <Badge :variant="getRoleBadgeVariant(user.role_name)" size="sm">
              {{ getRoleLabel(user.role_name) }}
            </Badge>
          </div>
          <dl class="grid gap-2 text-sm border-t border-border pt-3">
            <div class="flex justify-between">
              <dt class="text-muted-foreground">Логин</dt>
              <dd class="font-medium">{{ user.login || "—" }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted-foreground">Филиал</dt>
              <dd class="font-medium">{{ user.branch_name || "—" }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted-foreground">Должность</dt>
              <dd class="font-medium">{{ user.position_name || "—" }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted-foreground">Создан</dt>
              <dd class="font-medium">{{ formatDate(user.created_at) }}</dd>
            </div>
          </dl>
          <div class="flex gap-2">
            <Button v-if="canEditUser(user)" size="sm" variant="secondary" icon="pencil" class="flex-1" @click="emit('open-edit-modal', user)">
              Редактировать
            </Button>
            <Button v-if="isSuperAdmin" size="sm" variant="danger" icon="trash" @click="emit('open-delete-modal', user)" />
          </div>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup>
import { Badge, Button, DataTable, Skeleton, SkeletonTable, TableCell, TableHead, TableRow } from "@/components/ui";

defineProps({
  skeletonVisible: { type: Boolean, required: true },
  totalUsers: { type: Number, required: true },
  pagination: { type: Object, required: true },
  visibleUsers: { type: Array, required: true },
  selectedUserIds: { type: Array, required: true },
  allUsersSelected: { type: Boolean, required: true },
  canEditUser: { type: Function, required: true },
  getRoleBadgeVariant: { type: Function, required: true },
  getRoleLabel: { type: Function, required: true },
  getUserStatus: { type: Function, required: true },
  formatDate: { type: Function, required: true },
  isSuperAdmin: { type: Boolean, required: true },
});

const emit = defineEmits([
  "update:page",
  "update:limit",
  "toggle-select-all",
  "toggle-user-selection",
  "open-profile-page",
  "open-edit-modal",
  "open-delete-modal",
]);
</script>

<style scoped>
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: hsl(var(--muted));
  color: var(--text-secondary);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  flex-shrink: 0;
}

.status-pill-awaiting {
  background: hsl(var(--color-warning-subtle));
  color: hsl(var(--accent-orange));
}

.status-pill-awaiting .status-dot {
  background: hsl(var(--accent-orange));
}

.status-pill-active {
  background: hsl(var(--accent-green-soft));
  color: hsl(var(--accent-green));
}

.status-pill-active .status-dot {
  background: hsl(var(--accent-green));
}
</style>
