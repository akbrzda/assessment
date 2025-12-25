<template>
  <div class="page-container theory-page" ref="pageContainer">
    <div class="container">
      <div class="page-header">
        <div>
          <h1 class="title-large">Теория</h1>
          <p class="body-small text-secondary">Обновлено: {{ formatDate(theory?.version?.publishedAt) || "—" }}</p>
        </div>
      </div>

      <!-- Баннер обновления версии -->
      <div v-if="versionOutdated" class="card warning-card mb-16">
        <h3 class="title-small mb-4">⚠️ Теория обновлена</h3>
        <p class="body-small text-secondary mb-12">Материалы были обновлены. Пожалуйста, изучите новую версию теории.</p>
        <button class="btn btn-primary btn-full" @click="reloadTheory">Загрузить новую версию</button>
      </div>

      <div v-if="loading" class="card text-center">
        <div class="spinner mb-12"></div>
        <p class="body-medium text-secondary">Загрузка материалов...</p>
      </div>

      <div v-else-if="error" class="card text-center">
        <p class="body-medium mb-12">{{ error }}</p>
        <button class="btn btn-primary btn-full" @click="loadTheory">Попробовать снова</button>
      </div>

      <div v-else class="theory-content">
        <div v-if="completion" class="card success-card mb-16">
          <h3 class="title-small mb-4">✅ Теория уже пройдена</h3>
          <p class="body-small text-secondary">Вы можете перейти к аттестации.</p>
        </div>

        <!-- Основной контент - как статья -->
        <article class="theory-article card mb-16">
          <template v-for="block in requiredBlocks" :key="block.id">
            <section class="theory-section">
              <h2 class="section-title">{{ block.title }}</h2>

              <div v-if="block.type === 'text'" class="text-content">
                <p class="body-text" v-html="formatText(block.content)"></p>
              </div>

              <div v-else-if="block.type === 'video'" class="video-content">
                <div class="video-wrapper">
                  <iframe v-if="block.videoUrl" :src="block.videoUrl" frameborder="0" allowfullscreen referrerpolicy="no-referrer"></iframe>
                </div>
              </div>

              <div v-else-if="block.type === 'link'" class="link-content">
                <a :href="block.externalUrl" target="_blank" rel="noopener" class="external-link">
                  {{ block.externalUrl }}
                </a>
              </div>
            </section>
          </template>
        </article>

        <!-- Дополнительные материалы -->
        <section v-if="optionalBlocks.length > 0" class="card optional-card mb-16">
          <details :open="optionalExpanded" @toggle="(event) => (optionalExpanded = event.target.open)">
            <summary>
              <div>
                <h2 class="title-small">Дополнительные материалы</h2>
                <p class="body-small text-secondary">Не влияют на допуск, но помогут подготовиться.</p>
              </div>
              <span class="summary-action">{{ optionalExpanded ? "Скрыть" : "Показать" }}</span>
            </summary>
            <div class="optional-content mt-16">
              <template v-for="block in optionalBlocks" :key="block.id">
                <section class="theory-section optional-section">
                  <h3 class="section-title-small">{{ block.title }}</h3>

                  <div v-if="block.type === 'text'" class="text-content">
                    <p class="body-text" v-html="formatText(block.content)"></p>
                  </div>

                  <div v-else-if="block.type === 'video'" class="video-content">
                    <div class="video-wrapper">
                      <iframe v-if="block.videoUrl" :src="block.videoUrl" frameborder="0" allowfullscreen referrerpolicy="no-referrer"></iframe>
                    </div>
                  </div>

                  <div v-else-if="block.type === 'link'" class="link-content">
                    <a :href="block.externalUrl" target="_blank" rel="noopener" class="external-link">
                      {{ block.externalUrl }}
                    </a>
                  </div>
                </section>
              </template>
            </div>
          </details>
        </section>

        <!-- Кнопка в конце -->
        <div class="action-button-container">
          <button class="btn btn-primary btn-full" :disabled="!canSubmit || versionOutdated" @click="handlePrimaryAction">
            {{ primaryButtonLabel }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiClient } from "../services/apiClient";
import { useTelegramStore } from "../stores/telegram";
import { sumReadingSeconds, formatReadingTime } from "../utils/readingTime";

const route = useRoute();
const router = useRouter();
const telegramStore = useTelegramStore();

const loading = ref(true);
const error = ref(null);
const theory = ref(null);
const completion = ref(null);
const submitting = ref(false);
const optionalExpanded = ref(false);
const pageContainer = ref(null);
const hasReadTheory = ref(false);
const versionOutdated = ref(false);
const theoryStartTime = ref(null);

let versionCheckInterval = null;
let readingTimerInterval = null;

const assessmentId = computed(() => Number(route.params.id));
const requiredBlocks = computed(() => theory.value?.requiredBlocks || []);
const optionalBlocks = computed(() => theory.value?.optionalBlocks || []);
const versionId = computed(() => theory.value?.version?.id || null);
const requiredReadingSeconds = computed(() => sumReadingSeconds(requiredBlocks.value));
const readingTimeLabel = computed(() => (requiredReadingSeconds.value ? formatReadingTime(requiredReadingSeconds.value) : null));

const canSubmit = computed(() => {
  if (versionOutdated.value) return false;
  if (completion.value) return true;
  return hasReadTheory.value;
});

const primaryButtonLabel = computed(() => {
  if (versionOutdated.value) {
    return "Обновите страницу";
  }
  if (completion.value) {
    return "Перейти к тесту";
  }
  if (hasReadTheory.value) {
    return "Перейти к тесту";
  }
  return "Перейти к тесту";
});

function formatDate(isoDate) {
  if (!isoDate) return "—";
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "—";
  }
}

function formatText(text) {
  if (!text) return "";
  return text.replace(/\n/g, "<br>");
}

function handlePageScroll() {
  // Скролл больше не используется для отслеживания прочтения
}

async function checkVersionUpdate() {
  if (!versionId.value || !assessmentId.value) return;

  try {
    const response = await apiClient.getAssessmentTheory(assessmentId.value);
    const newVersionId = response?.theory?.version?.id;

    if (newVersionId && newVersionId !== versionId.value) {
      versionOutdated.value = true;
      if (versionCheckInterval) {
        clearInterval(versionCheckInterval);
      }
    }
  } catch (err) {
    console.warn("Не удалось проверить версию теории", err);
  }
}

function startVersionPolling() {
  versionCheckInterval = setInterval(() => {
    checkVersionUpdate();
  }, 10000); // Проверка каждые 10 секунд
}

function startReadingTimer() {
  // Если теория уже пройдена, сразу активируем кнопку
  if (completion.value) {
    hasReadTheory.value = true;
    return;
  }

  const waitSeconds = requiredReadingSeconds.value > 0 ? requiredReadingSeconds.value : 15;
  let secondsElapsed = 0;
  readingTimerInterval = setInterval(() => {
    secondsElapsed++;
    if (secondsElapsed >= waitSeconds && !hasReadTheory.value) {
      hasReadTheory.value = true;
      telegramStore.hapticFeedback("impact", "light");
      clearInterval(readingTimerInterval);
      readingTimerInterval = null;
    }
  }, 1000); // Проверка каждую секунду
}

async function loadTheory() {
  loading.value = true;
  error.value = null;
  try {
    const response = await apiClient.getAssessmentTheory(assessmentId.value);
    theory.value = response?.theory || null;
    completion.value = theory.value?.completion || null;

    // Всегда запускаем таймер чтения (внутри он проверит completion)
    theoryStartTime.value = Date.now();
    startVersionPolling();
    startReadingTimer();
  } catch (err) {
    console.error("Не удалось загрузить теорию", err);
    error.value = err.message || "Не удалось загрузить данные";
  } finally {
    loading.value = false;
  }
}

async function reloadTheory() {
  versionOutdated.value = false;
  hasReadTheory.value = false;
  if (readingTimerInterval) {
    clearInterval(readingTimerInterval);
    readingTimerInterval = null;
  }
  await loadTheory();
}

async function submitCompletion() {
  if (!versionId.value || submitting.value || completion.value) {
    return;
  }

  submitting.value = true;
  try {
    const timeSpentSeconds = theoryStartTime.value ? Math.floor((Date.now() - theoryStartTime.value) / 1000) : 0;

    const payload = {
      versionId: versionId.value,
      timeSpentSeconds,
      clientPayload: {
        hasReadTheory: hasReadTheory.value,
      },
    };

    const response = await apiClient.completeAssessmentTheory(assessmentId.value, payload);
    completion.value = response?.completion || null;
    telegramStore.hapticFeedback("notification", "success");
    router.replace(`/assessment/${assessmentId.value}`);
  } catch (err) {
    console.error("Не удалось завершить теорию", err);
    telegramStore.showAlert(err.message || "Не удалось завершить теорию");
  } finally {
    submitting.value = false;
  }
}

function handlePrimaryAction() {
  if (completion.value) {
    router.push(`/assessment/${assessmentId.value}`);
    return;
  }
  if (!hasReadTheory.value) {
    telegramStore.showAlert("Пожалуйста, ознакомьтесь с материалами");
    return;
  }
  submitCompletion();
}

onMounted(() => {
  loadTheory();
});

onUnmounted(() => {
  if (versionCheckInterval) {
    clearInterval(versionCheckInterval);
  }
  if (readingTimerInterval) {
    clearInterval(readingTimerInterval);
  }
});
</script>

<style scoped>
.theory-page {
  padding-top: 20px;
  padding-bottom: 20px;
  min-height: 100vh;
  overflow-y: auto;
}

.card {
  border-radius: 16px;
  padding: 16px;
  background-color: var(--bg-primary);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 4px solid var(--divider);
  border-top: 4px solid var(--accent-blue);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

.warning-card {
  background-color: rgba(255, 149, 0, 0.08);
  border: 1px solid rgba(255, 149, 0, 0.25);
}

.success-card {
  background-color: rgba(0, 180, 94, 0.08);
  border: 1px solid rgba(0, 180, 94, 0.25);
}

.theory-article {
  padding: 24px;
}

.theory-section {
  margin-bottom: 32px;
}

.theory-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: var(--text-primary);
}

.section-title-small {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: var(--text-primary);
}

.text-content {
  line-height: 1.6;
}

.body-text {
  font-size: 16px;
  color: var(--text-primary);
  margin: 0;
  white-space: pre-wrap;
}

.video-content {
  margin: 16px 0;
}

.video-wrapper {
  position: relative;
  padding-top: 56.25%;
  border-radius: 12px;
  overflow: hidden;
  background-color: #000;
}

.video-wrapper iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.link-content {
  margin: 12px 0;
}

.external-link {
  display: inline-block;
  padding: 12px 16px;
  background-color: var(--accent-blue);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  transition: opacity 0.2s;
}

.external-link:hover {
  opacity: 0.8;
}

.optional-card {
  background-color: var(--bg-secondary);
}

.optional-content {
  padding: 16px;
}

.optional-section {
  margin-bottom: 24px;
}

.optional-section:last-child {
  margin-bottom: 0;
}

.summary-action {
  font-size: 14px;
  color: var(--accent-blue);
}

details summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  list-style: none;
  padding: 8px;
}

details summary::-webkit-details-marker {
  display: none;
}

.btn.ghost {
  background: transparent;
  border: 1px solid var(--divider);
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.action-button-container {
  margin-top: 24px;
  margin-bottom: 24px;
}

.reading-time-note {
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

@media (max-width: 480px) {
  .theory-article {
    padding: 16px;
  }

  .section-title {
    font-size: 18px;
  }

  .body-text {
    font-size: 15px;
  }
}
</style>
