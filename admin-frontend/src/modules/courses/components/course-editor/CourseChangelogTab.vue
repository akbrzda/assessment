<template>
  <div class="changelog-wrap">
    <p class="body-small text-secondary changelog-desc">Журнал административных действий с курсом, его разделами и темами.</p>

    <div class="changelog-body">
      <div v-if="loading" class="changelog-state">
        <div class="spinner"></div>
        <p class="body-small text-secondary">Загрузка...</p>
      </div>

      <div v-else-if="error" class="changelog-state">
        <p class="body-medium">{{ error }}</p>
        <Button size="sm" variant="secondary" @click="load">Повторить</Button>
      </div>

      <div v-else-if="!items.length" class="changelog-state">
        <p class="body-medium text-secondary">Изменений пока нет.</p>
      </div>

      <table v-else class="changelog-table">
        <thead>
          <tr>
            <th>Дата</th>
            <th>Действие</th>
            <th>Объект</th>
            <th>Автор</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td class="changelog-date">{{ formatDate(item.createdAt) }}</td>
            <td class="changelog-action">{{ formatAction(item.action) }}</td>
            <td class="changelog-entity">{{ formatEntity(item.entityType, item.metadata) }}</td>
            <td class="changelog-actor">{{ item.actorName || "—" }}</td>
            <td>
              <span class="changelog-status" :class="item.status === 'success' ? 'changelog-status--ok' : 'changelog-status--err'">
                {{ item.status === "success" ? "OK" : item.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="total > limit" class="changelog-pagination">
        <Button size="sm" variant="secondary" :disabled="page <= 1" @click="changePage(page - 1)">Назад</Button>
        <span class="body-small text-secondary">Стр. {{ page }} из {{ totalPages }}</span>
        <Button size="sm" variant="secondary" :disabled="page >= totalPages" @click="changePage(page + 1)">Вперёд</Button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { Button } from "@/components/ui";
import { getCourseChangelog } from "@/api/courses";

const props = defineProps({
  courseId: { type: Number, required: true },
});

const loading = ref(false);
const error = ref("");
const items = ref([]);
const total = ref(0);
const page = ref(1);
const limit = 50;

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)));

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const data = await getCourseChangelog(props.courseId, { page: page.value, limit });
    items.value = data.items || [];
    total.value = data.total || 0;
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || "Не удалось загрузить журнал";
  } finally {
    loading.value = false;
  }
}

async function changePage(newPage) {
  page.value = newPage;
  await load();
}

function formatDate(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Переводим машинные названия действий в человекочитаемый вид
const ACTION_LABELS = {
  "course.created": "Курс создан",
  "course.updated": "Курс изменён",
  "course.published": "Курс опубликован",
  "course.archived": "Курс архивирован",
  "course.deleted": "Курс удалён",
  "course.section.created": "Раздел добавлен",
  "course.section.updated": "Раздел изменён",
  "course.section.deleted": "Раздел удалён",
  "course.section.reordered": "Разделы переупорядочены",
  "course.topic.created": "Тема добавлена",
  "course.topic.updated": "Тема изменена",
  "course.topic.deleted": "Тема удалена",
  "course.topic.reordered": "Темы переупорядочены",
};

function formatAction(action) {
  return ACTION_LABELS[action] || action;
}

function formatEntity(entityType, metadata) {
  const title = metadata?.title;
  if (entityType === "course") return "Курс";
  if (entityType === "course_section") return title ? `Раздел: ${title}` : "Раздел";
  if (entityType === "course_topic") return title ? `Тема: ${title}` : "Тема";
  return entityType || "—";
}

onMounted(load);
</script>

<style scoped>
.changelog-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.changelog-desc {
  margin: 0;
}

.changelog-body {
  padding: 16px 20px 20px;
}

.changelog-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 0;
  text-align: center;
}

.changelog-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.changelog-table th {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 2px solid var(--border-color, #e5e7eb);
  color: var(--text-secondary, #6b7280);
  font-weight: 600;
  white-space: nowrap;
}

.changelog-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  vertical-align: middle;
}

.changelog-date {
  white-space: nowrap;
  color: var(--text-secondary, #6b7280);
}

.changelog-action {
  font-weight: 500;
}

.changelog-entity {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.changelog-actor {
  color: var(--text-secondary, #6b7280);
}

.changelog-status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.changelog-status--ok {
  background: #d1fae5;
  color: #065f46;
}

.changelog-status--err {
  background: #fee2e2;
  color: #b91c1c;
}

.changelog-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}
</style>
