<template>
  <div class="results-container">
    <Preloader v-if="loading" />
    <div v-else class="results-content">
      <!-- Общая статистика -->
      <div class="stats-grid">
        <div class="stat-card stat-attempts">
          <div class="stat-label">Всего попыток</div>
          <div class="stat-value">{{ results.length }}</div>
        </div>
        <div class="stat-card stat-completed">
          <div class="stat-label">Завершено</div>
          <div class="stat-value">{{ completedCount }}</div>
        </div>
        <div class="stat-card stat-average">
          <div class="stat-label">Средний балл</div>
          <div class="stat-value">{{ avgScore }}%</div>
        </div>
        <div class="stat-card stat-passed">
          <div class="stat-label">Прошли</div>
          <div class="stat-value">{{ passedCount }}</div>
        </div>
      </div>

      <!-- Таблица результатов -->
      <div class="table-wrapper">
        <table class="results-table">
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Филиал</th>
              <th>Должность</th>
              <th>Статус</th>
              <th>Балл</th>
              <th>Правильных</th>
              <th>Время</th>
              <th>Дата</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="result in results" :key="result.id" class="result-row">
              <td class="user-cell">{{ result.first_name }} {{ result.last_name }}</td>
              <td>{{ result.branch_name || "—" }}</td>
              <td>{{ result.position_name || "—" }}</td>
              <td>
                <span class="status-badge" :class="`status-${result.status}`">
                  {{ getStatusLabel(result.status) }}
                </span>
              </td>
              <td class="score-cell" :class="{ 'score-pass': result.score >= 70, 'score-fail': result.score < 70 }">
                {{ result.score ? result.score.toFixed(1) + "%" : "—" }}
              </td>
              <td>{{ result.correct_answers }} / {{ result.total_questions }}</td>
              <td>{{ formatDuration(result.duration_seconds) }}</td>
              <td class="date-cell">{{ formatDate(result.started_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="results.length === 0" class="empty-state">Нет результатов</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { getAssessmentResults } from "../api/assessments";
import Preloader from "./ui/Preloader.vue";

const props = defineProps({
  assessmentId: {
    type: Number,
    required: true,
  },
});

const loading = ref(false);
const results = ref([]);

const completedCount = computed(() => {
  return results.value.filter((r) => r.status === "completed").length;
});

const avgScore = computed(() => {
  const completed = results.value.filter((r) => r.status === "completed" && r.score !== null);
  if (completed.length === 0) return 0;
  const sum = completed.reduce((acc, r) => acc + r.score, 0);
  return (sum / completed.length).toFixed(1);
});

const passedCount = computed(() => {
  return results.value.filter((r) => r.status === "completed" && r.score >= 70).length;
});

const loadResults = async () => {
  loading.value = true;
  try {
    const data = await getAssessmentResults(props.assessmentId);
    results.value = data.results;
  } catch (error) {
    console.error("Load results error:", error);
    alert("Ошибка загрузки результатов");
  } finally {
    loading.value = false;
  }
};

const getStatusLabel = (status) => {
  const labels = {
    in_progress: "В процессе",
    completed: "Завершено",
  };
  return labels[status] || status;
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (seconds) => {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}м ${secs}с`;
};

onMounted(() => {
  loadResults();
});
</script>

<style scoped>
.results-container {
  width: 100%;
}

.results-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.stat-card {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--divider);
}

.stat-attempts {
  background-color: var(--accent-blue-soft);
  border-color: var(--accent-blue);
}

.stat-completed {
  background-color: var(--accent-green-soft);
  border-color: var(--accent-green);
}

.stat-average {
  background-color: var(--accent-purple-soft);
  border-color: var(--accent-purple);
}

.stat-passed {
  background-color: var(--accent-orange-soft);
  border-color: var(--accent-orange);
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid var(--divider);
  background-color: var(--surface-card);
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.results-table thead {
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--divider);
}

.results-table th {
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.5px;
}

.results-table tbody tr {
  border-bottom: 1px solid var(--divider);
  transition: background-color 0.15s ease;
}

.results-table td {
  padding: 16px;
  color: var(--text-primary);
}

.user-cell {
  font-weight: 600;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-in_progress {
  background-color: #f59e0b26;
  color: var(--accent-orange);
}

.status-completed {
  background-color: var(--accent-green-soft);
  color: var(--accent-green);
}

.score-cell {
  font-weight: 600;
}

.score-pass {
  color: var(--accent-green);
}

.score-fail {
  color: #d4183d;
}

.date-cell {
  white-space: nowrap;
  font-size: 13px;
}

.empty-state {
  text-align: center;
  padding: 32px 16px;
  color: var(--text-secondary);
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .results-table {
    font-size: 13px;
  }

  .results-table th,
  .results-table td {
    padding: 12px;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .results-table {
    font-size: 12px;
  }

  .results-table th,
  .results-table td {
    padding: 8px;
  }
}
</style>
