<template>
  <Card padding="none">
    <!-- Пустое состояние -->
    <template v-if="isEmpty">
      <slot name="empty">
        <div class="p-8">
          <EmptyState
            :type="emptyType"
            :title="emptyTitle"
            :description="emptyDescription"
            :button-text="emptyButtonText || ''"
            :show-button="!!emptyButtonText"
            @action="$emit('empty-action')"
          />
        </div>
      </slot>
    </template>

    <template v-else>
      <template v-if="loading">
        <div class="p-4 space-y-3">
          <Skeleton class="h-9 w-full rounded-lg" />
          <Skeleton v-for="row in loadingRows" :key="`desktop-${row}`" class="h-11 w-full rounded-lg" />
        </div>
        <div class="md:hidden p-4 space-y-3">
          <div v-for="row in Math.min(loadingRows, 4)" :key="`mobile-${row}`" class="space-y-2 rounded-xl border border-border p-3">
            <Skeleton class="h-4 w-1/2" />
            <Skeleton class="h-3 w-full" />
            <Skeleton class="h-3 w-2/3" />
          </div>
        </div>
      </template>

      <template v-else>
      <!-- Desktop: таблица -->
      <div class="hidden md:block overflow-x-auto">
        <Table :density="density">
          <TableHeader>
            <tr>
              <slot name="head" />
            </tr>
          </TableHeader>
          <TableBody>
            <slot name="body" />
          </TableBody>
        </Table>
      </div>

      <!-- Mobile: карточки -->
      <div class="md:hidden divide-y divide-border">
        <slot name="mobile" />
      </div>

      <!-- Пагинация -->
      <Pagination
        v-if="total > limit"
        :total="total"
        :page="page"
        :limit="limit"
        :limit-options="limitOptions"
        @update:page="$emit('update:page', $event)"
        @update:limit="$emit('update:limit', $event)"
      />
      </template>
    </template>
  </Card>
</template>

<script setup>
import Card from "./Card.vue";
import Table from "./Table.vue";
import TableHeader from "./TableHeader.vue";
import TableBody from "./TableBody.vue";
import EmptyState from "./EmptyState.vue";
import Pagination from "./Pagination.vue";
import Skeleton from "./Skeleton.vue";

defineProps({
  total: { type: Number, default: 0 },
  page: { type: Number, default: 1 },
  limit: { type: Number, default: 20 },
  limitOptions: { type: Array, default: () => [10, 20, 50, 100] },
  density: { type: String, default: "default" },
  loading: { type: Boolean, default: false },
  loadingRows: { type: Number, default: 8 },
  isEmpty: { type: Boolean, default: false },
  emptyType: { type: String, default: "filter" },
  emptyTitle: { type: String, default: "" },
  emptyDescription: { type: String, default: "" },
  emptyButtonText: { type: String, default: "" },
});

defineEmits(["update:page", "update:limit", "empty-action"]);
</script>
