<template>
  <div class="gamification-rules-manager">
    <!-- Заголовок и кнопка добавления -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-foreground">Правила геймификации</h2>
      <ActionButton action="create" label="Добавить правило" @click="openCreateModal" />
    </div>

    <!-- Фильтры -->
    <div class="bg-card p-4 rounded-lg shadow-sm mb-4 flex gap-4">
      <div class="flex-1">
        <input
          v-model="filters.search"
          type="text"
          placeholder="Поиск по названию или коду..."
          class="w-full px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <select
        v-model="filters.ruleType"
        class="px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
      >
        <option value="">Все типы</option>
        <option value="points">Очки</option>
        <option value="badge">Бейджи</option>
      </select>
      <select
        v-model="filters.isActive"
        class="px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
      >
        <option value="">Все статусы</option>
        <option value="true">Активные</option>
        <option value="false">Неактивные</option>
      </select>
    </div>

    <!-- Таблица правил -->
    <div class="bg-card rounded-lg shadow-sm overflow-hidden">
      <div v-if="loading" class="p-8 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p class="mt-2 text-muted-foreground">Загрузка...</p>
      </div>

      <div v-else-if="error" class="p-8 text-center text-destructive">
        <p>{{ error }}</p>
        <Button @click="loadRules" variant="primary" class="mt-4">Повторить</Button>
      </div>

      <table v-else-if="filteredRules.length > 0" class="min-w-full divide-y divide-border">
        <thead class="bg-muted/40">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Код</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Название</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Тип</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Приоритет</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Статус</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Период</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Действия</th>
          </tr>
        </thead>
        <tbody class="bg-card divide-y divide-border">
          <tr v-for="rule in filteredRules" :key="rule.id" class="hover:bg-muted/30">
            <td class="px-6 py-4 whitespace-nowrap">
              <code class="text-sm font-mono text-foreground">{{ rule.code }}</code>
            </td>
            <td class="px-6 py-4">
              <div class="text-sm font-medium text-foreground">{{ rule.name }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="[
                  'px-2 py-1 text-xs font-medium rounded-full',
                  rule.ruleType === 'points' ? 'bg-accent-blue-soft text-accent-blue' : 'bg-accent-purple-soft text-accent-purple',
                ]"
              >
                {{ rule.ruleType === "points" ? "Очки" : "Бейдж" }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-foreground">
              {{ rule.priority }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="[
                  'px-2 py-1 text-xs font-medium rounded-full',
                  rule.isActive ? 'bg-accent-green-soft text-accent-green' : 'bg-muted text-muted-foreground',
                ]"
              >
                {{ rule.isActive ? "Активно" : "Неактивно" }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
              <div v-if="rule.activeFrom || rule.activeTo">
                <div v-if="rule.activeFrom">С: {{ formatDate(rule.activeFrom) }}</div>
                <div v-if="rule.activeTo">До: {{ formatDate(rule.activeTo) }}</div>
              </div>
              <span v-else class="text-muted-foreground/60">Всегда</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <div class="flex items-center justify-end gap-2">
                <Button @click="openEditModal(rule)" variant="ghost" size="sm" icon="pencil" :icon-only="true" aria-label="Редактировать" />
                <Button @click="confirmDelete(rule)" variant="danger" size="sm" icon="trash" :icon-only="true" aria-label="Удалить" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="p-8 text-center text-muted-foreground">
        <p>Правила не найдены</p>
        <ActionButton action="create" label="Создать первое правило" @click="openCreateModal" class="mt-4" />
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
import Button from "@/components/ui/Button.vue";
import ActionButton from "@/components/ui/ActionButton.vue";

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
