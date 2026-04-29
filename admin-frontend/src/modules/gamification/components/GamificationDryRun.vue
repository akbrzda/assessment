<template>
  <div class="gamification-dry-run bg-card p-6 rounded-lg shadow-sm">
    <h3 class="text-lg font-semibold text-foreground mb-4">Тестирование правил</h3>

    <form @submit.prevent="runTest" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-foreground mb-1">Событие</label>
        <select
          v-model="testData.event"
          class="w-full px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
        >
          <option value="attempt">Завершение попытки</option>
          <option value="answer">Ответ на вопрос</option>
        </select>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-foreground mb-1">Результат теста (%)</label>
          <input
            v-model.number="testData.scorePercent"
            type="number"
            min="0"
            max="100"
            required
            class="w-full px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-foreground mb-1">Текущая серия</label>
          <input
            v-model.number="testData.currentStreak"
            type="number"
            min="0"
            class="w-full px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-foreground mb-1">Затраченное время (сек)</label>
          <input
            v-model.number="testData.timeSpentSeconds"
            type="number"
            min="0"
            class="w-full px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-foreground mb-1">Лимит времени (мин)</label>
          <input
            v-model.number="testData.timeLimitMinutes"
            type="number"
            min="0"
            class="w-full px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
          />
        </div>
      </div>

      <div class="flex gap-4">
        <label class="flex items-center">
          <input v-model="testData.passed" type="checkbox" class="rounded border-input text-primary" />
          <span class="ml-2 text-sm text-foreground">Тест пройден</span>
        </label>
        <label class="flex items-center">
          <input v-model="testData.perfect" type="checkbox" class="rounded border-input text-primary" />
          <span class="ml-2 text-sm text-foreground">Идеальный результат</span>
        </label>
      </div>

      <div v-if="testData.event === 'answer'" class="flex gap-4">
        <label class="flex items-center">
          <input v-model="testData.answerCorrect" type="checkbox" class="rounded border-input text-primary" />
          <span class="ml-2 text-sm text-foreground">Ответ верный</span>
        </label>
      </div>

      <button
        type="submit"
        :disabled="testing"
        class="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {{ testing ? "Тестирование..." : "Запустить тест" }}
      </button>
    </form>

    <!-- Результаты -->
    <div v-if="result" class="mt-6 p-4 bg-muted/40 rounded-lg">
      <h4 class="font-semibold text-foreground mb-3">Результат:</h4>

      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-muted-foreground">Всего очков:</span>
          <span class="text-2xl font-bold text-primary">{{ result.totalPoints }}</span>
        </div>
        <div class="text-xs text-muted-foreground">Использовано правил: {{ result.usedRules ? "Да" : "Нет (легаси логика)" }}</div>
      </div>

      <div v-if="result.events && result.events.length > 0" class="mb-4">
        <h5 class="text-sm font-medium text-foreground mb-2">События:</h5>
        <div class="space-y-1">
          <div v-for="(event, idx) in result.events" :key="idx" class="flex justify-between text-sm bg-card p-2 rounded border border-border">
            <span class="text-foreground">{{ event.description || event.type }}</span>
            <span class="font-medium text-accent-green">+{{ event.points }}</span>
          </div>
        </div>
      </div>

      <div v-if="result.badges && result.badges.length > 0" class="mt-4">
        <h5 class="text-sm font-medium text-foreground mb-2">Полученные бейджи:</h5>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="badge in result.badges"
            :key="badge"
            class="px-3 py-1 bg-accent-purple-soft text-accent-purple text-xs font-medium rounded-full"
          >
            {{ badge }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="error" class="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import gamificationRulesApi from "@/api/gamificationRules";

const testing = ref(false);
const result = ref(null);
const error = ref(null);

const testData = ref({
  event: "attempt",
  scorePercent: 85,
  passed: true,
  perfect: false,
  timeSpentSeconds: 120,
  timeLimitMinutes: 5,
  currentStreak: 3,
  answerCorrect: true,
});

async function runTest() {
  testing.value = true;
  result.value = null;
  error.value = null;

  try {
    const { data } = await gamificationRulesApi.dryRun(testData.value);
    result.value = data;
  } catch (err) {
    error.value = err.response?.data?.error || "Не удалось выполнить тест";
  } finally {
    testing.value = false;
  }
}
</script>
