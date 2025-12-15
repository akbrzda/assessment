<template>
  <div class="gamification-rules-manager">
    <!-- Заголовок и кнопка добавления -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Правила геймификации</h2>
      <button
        @click="openCreateModal"
        class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Добавить правило
      </button>
    </div>

    <!-- Фильтры -->
    <div class="bg-white p-4 rounded-lg shadow-sm mb-4 flex gap-4">
      <div class="flex-1">
        <input
          v-model="filters.search"
          type="text"
          placeholder="Поиск по названию или коду..."
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <select
        v-model="filters.ruleType"
        class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="">Все типы</option>
        <option value="points">Очки</option>
        <option value="badge">Бейджи</option>
      </select>
      <select
        v-model="filters.isActive"
        class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="">Все статусы</option>
        <option value="true">Активные</option>
        <option value="false">Неактивные</option>
      </select>
    </div>

    <!-- Таблица правил -->
    <div class="bg-white rounded-lg shadow-sm overflow-hidden">
      <div v-if="loading" class="p-8 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p class="mt-2 text-gray-600">Загрузка...</p>
      </div>

      <div v-else-if="error" class="p-8 text-center text-red-600">
        <p>{{ error }}</p>
        <button @click="loadRules" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Повторить</button>
      </div>

      <table v-else-if="filteredRules.length > 0" class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Код</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тип</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Приоритет</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Период</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="rule in filteredRules" :key="rule.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
              <code class="text-sm font-mono text-gray-900">{{ rule.code }}</code>
            </td>
            <td class="px-6 py-4">
              <div class="text-sm font-medium text-gray-900">{{ rule.name }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="[
                  'px-2 py-1 text-xs font-medium rounded-full',
                  rule.ruleType === 'points' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800',
                ]"
              >
                {{ rule.ruleType === "points" ? "Очки" : "Бейдж" }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ rule.priority }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="['px-2 py-1 text-xs font-medium rounded-full', rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800']"
              >
                {{ rule.isActive ? "Активно" : "Неактивно" }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <div v-if="rule.activeFrom || rule.activeTo">
                <div v-if="rule.activeFrom">С: {{ formatDate(rule.activeFrom) }}</div>
                <div v-if="rule.activeTo">До: {{ formatDate(rule.activeTo) }}</div>
              </div>
              <span v-else class="text-gray-400">Всегда</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <button @click="openEditModal(rule)" class="text-indigo-600 hover:text-indigo-900 mr-3" title="Редактировать">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button @click="confirmDelete(rule)" class="text-red-600 hover:text-red-900" title="Удалить">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="p-8 text-center text-gray-500">
        <p>Правила не найдены</p>
        <button @click="openCreateModal" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Создать первое правило
        </button>
      </div>
    </div>

    <!-- Модальное окно формы -->
    <GamificationRuleForm v-if="showModal" :rule="editingRule" @close="closeModal" @save="handleSave" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useToast } from "@/composables/useToast";
import gamificationRulesApi from "@/api/gamificationRules";
import GamificationRuleForm from "./GamificationRuleForm.vue";

const { showSuccess, showError } = useToast();

const rules = ref([]);
const loading = ref(false);
const error = ref(null);
const showModal = ref(false);
const editingRule = ref(null);

const filters = ref({
  search: "",
  ruleType: "",
  isActive: "",
});

const filteredRules = computed(() => {
  let result = rules.value;

  if (filters.value.search) {
    const search = filters.value.search.toLowerCase();
    result = result.filter((r) => r.name.toLowerCase().includes(search) || r.code.toLowerCase().includes(search));
  }

  if (filters.value.ruleType) {
    result = result.filter((r) => r.ruleType === filters.value.ruleType);
  }

  if (filters.value.isActive !== "") {
    const active = filters.value.isActive === "true";
    result = result.filter((r) => r.isActive === active);
  }

  return result.sort((a, b) => a.priority - b.priority);
});

async function loadRules() {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await gamificationRulesApi.list();
    rules.value = data.rules || [];
  } catch (err) {
    error.value = err.response?.data?.error || "Не удалось загрузить правила";
    showError(error.value);
  } finally {
    loading.value = false;
  }
}

function openCreateModal() {
  editingRule.value = null;
  showModal.value = true;
}

function openEditModal(rule) {
  editingRule.value = { ...rule };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  editingRule.value = null;
}

async function handleSave() {
  closeModal();
  await loadRules();
  showSuccess(editingRule.value ? "Правило обновлено" : "Правило создано");
}

async function confirmDelete(rule) {
  if (!confirm(`Удалить правило "${rule.name}"?`)) return;

  try {
    await gamificationRulesApi.delete(rule.id);
    await loadRules();
    showSuccess("Правило удалено");
  } catch (err) {
    showError(err.response?.data?.error || "Не удалось удалить правило");
  }
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

onMounted(() => {
  loadRules();
});
</script>

<style scoped>
/* Дополнительные стили при необходимости */
</style>
