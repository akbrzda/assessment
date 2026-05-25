<template>
  <div class="settings-view">
    <PageHeader title="Настройки системы" subtitle="Управление параметрами системы" />

    <!-- Tabs -->
    <Tabs v-model="activeTab" :tabs="tabsConfig" head-only class="mb-4" />

    <div v-if="skeletonVisible" class="space-y-4">
      <SkeletonPageHeader />
      <Skeleton class="h-10 w-72 rounded-xl" />
      <SkeletonForm :fields="5" />
    </div>

    <!-- Content -->
    <div v-else class="settings-content">
      <!-- Вкладка: Feature Flags -->
      <div v-if="activeTab === 'featureFlags'" class="settings-section">
        <h3 class="section-title">Feature Flags модулей</h3>

        <Card title="Управление разделами и API-модулями" icon="ToggleLeft">
          <p class="text-sm text-muted-foreground mb-4">Отключение модуля скрывает его в UI и блокирует соответствующие API-эндпоинты на backend.</p>

          <div v-if="featureFlagsLoading" class="space-y-2">
            <Skeleton class="h-12 w-full rounded-xl" />
            <Skeleton class="h-12 w-full rounded-xl" />
            <Skeleton class="h-12 w-full rounded-xl" />
          </div>

          <div v-else class="feature-flags-list">
            <label v-for="moduleItem in sharedModules" :key="`shared-${moduleItem.code}`" class="feature-flag-row">
              <div class="feature-flag-main">
                <strong>{{ moduleItem.name }}</strong>
                <span class="text-xs text-muted-foreground">Клиент + админ: {{ moduleItem.code }}</span>
              </div>
              <input
                type="checkbox"
                class="native-checkbox"
                :disabled="moduleItem.locked || featureFlagsSaving"
                :checked="moduleItem.enabled"
                @change="toggleFeatureModule(moduleItem.code, $event.target.checked)"
              />
            </label>

            <label v-for="moduleItem in clientOnlyModules" :key="moduleItem.code" class="feature-flag-row">
              <div class="feature-flag-main">
                <strong>{{ moduleItem.name }}</strong>
                <span class="text-xs text-muted-foreground">Только клиент: {{ moduleItem.code }}</span>
              </div>
              <input
                type="checkbox"
                class="native-checkbox"
                :disabled="moduleItem.locked || featureFlagsSaving"
                :checked="moduleItem.enabled"
                @change="toggleFeatureModule(moduleItem.code, $event.target.checked)"
              />
            </label>

            <label v-for="moduleItem in adminOnlyModules" :key="`admin-${moduleItem.code}`" class="feature-flag-row">
              <div class="feature-flag-main">
                <strong>{{ moduleItem.name }}</strong>
                <span class="text-xs text-muted-foreground">Только админка: {{ moduleItem.code }}</span>
              </div>
              <input
                type="checkbox"
                class="native-checkbox"
                :disabled="moduleItem.locked || featureFlagsSaving"
                :checked="moduleItem.enabled"
                @change="toggleFeatureModule(moduleItem.code, $event.target.checked)"
              />
            </label>
          </div>

          <div class="mt-4">
            <Button icon="Save" :loading="featureFlagsSaving" :disabled="featureFlagsLoading || !featureFlagsDirty" @click="saveFeatureFlags">
              Сохранить feature flags
            </Button>
          </div>
        </Card>
      </div>

      <!-- Вкладка: Бот и онбординг -->
      <div v-if="activeTab === 'bot'" class="settings-section">
        <h3 class="section-title">Бот и онбординг</h3>

        <Card title="Тексты Telegram-бота" icon="MessageSquare">
          <p class="text-sm text-muted-foreground mb-4">
            Здесь настраиваются тексты команды <code>/start</code>, подсказки и CTA. Доступен шаблон <code>&#123;&#123;name&#125;&#125;</code> для
            подстановки имени.
          </p>

          <div class="bot-settings-grid">
            <label class="bot-field">
              <span class="bot-field-label">Заголовок онбординга</span>
              <input v-model="botSettings.onboardingTitle" type="text" class="bot-field-input" placeholder="👋 Привет{{name}}!" />
            </label>

            <label class="bot-field">
              <span class="bot-field-label">Текст онбординга</span>
              <textarea
                v-model="botSettings.onboardingBody"
                rows="5"
                class="bot-field-textarea"
                placeholder="Описание шагов для нового пользователя"
              ></textarea>
            </label>

            <label class="bot-field">
              <span class="bot-field-label">Шаг 2 онбординга</span>
              <textarea v-model="botSettings.onboardingStep2" rows="4" class="bot-field-textarea" placeholder="Как работает система"></textarea>
            </label>

            <label class="bot-field">
              <span class="bot-field-label">Шаг 3 онбординга</span>
              <textarea
                v-model="botSettings.onboardingStep3"
                rows="4"
                class="bot-field-textarea"
                placeholder="Финальные рекомендации перед стартом"
              ></textarea>
            </label>

            <label class="bot-field">
              <span class="bot-field-label">CTA кнопки открытия MiniApp</span>
              <input v-model="botSettings.onboardingCtaText" type="text" class="bot-field-input" placeholder="Открыть приложение" />
            </label>

            <label class="bot-field">
              <span class="bot-field-label">Текст главного меню</span>
              <textarea
                v-model="botSettings.mainMenuText"
                rows="3"
                class="bot-field-textarea"
                placeholder="Привет{{name}}! Что хотите сделать?"
              ></textarea>
            </label>

            <label class="bot-field">
              <span class="bot-field-label">Текст помощи (/help)</span>
              <textarea v-model="botSettings.helpText" rows="4" class="bot-field-textarea" placeholder="Список доступных команд"></textarea>
            </label>

            <label class="bot-field">
              <span class="bot-field-label">Сообщение для пользователя без приглашения</span>
              <textarea
                v-model="botSettings.guestNoInviteText"
                rows="4"
                class="bot-field-textarea"
                placeholder="Текст с инструкцией получить приглашение"
              ></textarea>
            </label>
          </div>

          <div class="bot-actions">
            <Button icon="Save" :loading="botSaving" @click="saveBotSettings">Сохранить тексты бота</Button>
          </div>
        </Card>
      </div>

      <!-- Вкладка: Геймификация -->
      <div v-if="activeTab === 'gamification'" class="settings-section">
        <h3 class="section-title">Геймификация</h3>

        <!-- Управление уровнями -->
        <LevelsManager />

        <!-- Управление бейджами -->
        <BadgesManager />

        <!-- Гибкие правила геймификации -->
        <Card title="Гибкие правила геймификации" icon="Settings">
          <div class="rules-toggle-container">
            <label class="rules-toggle-label">
              <input v-model="gamificationEnabled" @change="toggleGamification" type="checkbox" class="rules-toggle-checkbox" />
              <div class="rules-toggle-content">
                <div class="rules-toggle-title">Включить геймификацию</div>
                <div class="rules-toggle-description">Глобально включает/выключает начисление очков и выдачу бейджей</div>
              </div>
            </label>
          </div>

          <!-- Индикатор активного режима -->
          <div :class="['mode-indicator', gamificationEnabled ? (rulesEnabled ? 'mode-rules' : 'mode-classic') : 'mode-classic']">
            <span class="mode-indicator-dot"></span>
            <span class="mode-indicator-label">
              Активный режим:
              <strong>{{
                !gamificationEnabled ? "Геймификация выключена" : rulesEnabled ? "Движок правил" : "Встроенная логика (Классический)"
              }}</strong>
            </span>
          </div>

          <div class="rules-toggle-container" :class="{ 'opacity-60 pointer-events-none': !gamificationEnabled }">
            <label class="rules-toggle-label">
              <input v-model="rulesEnabled" @change="toggleRulesEngine" type="checkbox" class="rules-toggle-checkbox" />
              <div class="rules-toggle-content">
                <div class="rules-toggle-title">Использовать движок правил</div>
                <div class="rules-toggle-description">
                  Включить гибкую систему правил начисления очков (если выключено - используется встроенная логика)
                </div>
              </div>
            </label>
          </div>

          <div v-if="gamificationEnabled && rulesEnabled" class="rules-content">
            <GamificationRulesManager />
            <div class="rules-dry-run">
              <GamificationDryRun />
            </div>
          </div>
        </Card>
      </div>

    </div>
  </div>
</template>
<script setup>
import { computed, ref, onMounted } from "vue";
import settingsApi from "@/api/settings";
import BadgesManager from "@/modules/settings/components/BadgesManager.vue";
import LevelsManager from "@/modules/settings/components/LevelsManager.vue";
import GamificationRulesManager from "@/modules/gamification/components/GamificationRulesManager.vue";
import GamificationDryRun from "@/modules/gamification/components/GamificationDryRun.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Tabs from "@/components/ui/Tabs.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import Skeleton from "@/components/ui/Skeleton.vue";
import SkeletonForm from "@/components/ui/SkeletonForm.vue";
import SkeletonPageHeader from "@/components/ui/SkeletonPageHeader.vue";
import { useToast } from "@/composables/useToast";
import { useSkeletonGate } from "@/composables/useSkeletonGate";
import { useAuthStore } from "@/stores/auth";

const { showToast, showSuccess, showError } = useToast();
const authStore = useAuthStore();

// Табы
const tabsConfig = computed(() => {
  const tabs = [
    { value: "featureFlags", label: "Feature Flags" },
    { value: "bot", label: "Бот и онбординг" },
  ];

  if (authStore.hasModuleAccess("gamification")) {
    tabs.push({ value: "gamification", label: "Геймификация" });
  }

  return tabs;
});

const activeTab = ref("featureFlags");
const settingsLoading = ref(true);
const { skeletonVisible } = useSkeletonGate(settingsLoading, { minDuration: 320, delay: 80 });

const gamificationEnabled = ref(true);
const rulesEnabled = ref(false);

const botSaving = ref(false);
const featureFlagsLoading = ref(false);
const featureFlagsSaving = ref(false);
const featureModules = ref([]);
const savedDisabledModules = ref([]);
const featureGroups = ref({ sharedModuleCodes: [], clientOnlyModuleCodes: [], adminOnlyModuleCodes: [] });
const botSettings = ref({
  onboardingTitle: "👋 Привет{{name}}!",
  onboardingBody:
    "Я бот системы аттестации. Здесь вы будете:\n📚 Проходить обучающие курсы\n✅ Сдавать тесты и аттестации\n🏆 Получать баллы и бейджи\n📄 Получать сертификаты",
  onboardingStep2: "Как это работает:\n1) Откройте назначенный курс\n2) Изучите материалы\n3) Пройдите тест\n4) Получите результат и сертификат",
  onboardingStep3:
    "Совет для быстрого старта:\n• Начните с ближайшего назначенного курса\n• Проходите обучение регулярно\n• Используйте /help для подсказок",
  onboardingCtaText: "Открыть приложение",
  mainMenuText: "Привет{{name}}! 👋\n\nЧто хотите сделать?",
  helpText: "Доступные команды:\n/start — главное меню\n/certificate — последний сертификат\n/certificates — все сертификаты\n/help — подсказка",
  guestNoInviteText:
    "Для доступа к системе нужна персональная ссылка-приглашение. Попросите руководителя или администратора отправить её в Telegram.",
});

const BOT_SETTINGS_META = [
  {
    field: "onboardingTitle",
    key: "BOT_ONBOARDING_TITLE",
    description: "Заголовок приветствия в /start, поддерживается шаблон {{name}}",
  },
  {
    field: "onboardingBody",
    key: "BOT_ONBOARDING_BODY",
    description: "Основной текст онбординга. Переносы строк задаются через Enter",
  },
  {
    field: "onboardingStep2",
    key: "BOT_ONBOARDING_STEP_2",
    description: "Второй шаг онбординга",
  },
  {
    field: "onboardingStep3",
    key: "BOT_ONBOARDING_STEP_3",
    description: "Третий шаг онбординга",
  },
  {
    field: "onboardingCtaText",
    key: "BOT_ONBOARDING_CTA_TEXT",
    description: "Текст кнопки открытия MiniApp",
  },
  {
    field: "mainMenuText",
    key: "BOT_MAIN_MENU_TEXT",
    description: "Текст главного меню после онбординга, поддерживается {{name}}",
  },
  {
    field: "helpText",
    key: "BOT_HELP_TEXT",
    description: "Ответ на /help и кнопку «Помощь»",
  },
  {
    field: "guestNoInviteText",
    key: "BOT_GUEST_NO_INVITE_TEXT",
    description: "Сообщение пользователю без приглашения",
  },
];

const featureFlagsDirty = computed(() => {
  const currentDisabled = featureModules.value
    .filter((item) => !item.enabled)
    .map((item) => item.code)
    .sort();
  const saved = [...savedDisabledModules.value].sort();
  return JSON.stringify(currentDisabled) !== JSON.stringify(saved);
});

const sharedModules = computed(() => {
  const targetCodes = featureGroups.value.sharedModuleCodes || [];
  const targetSet = new Set(targetCodes);
  return featureModules.value.filter((item) => targetSet.has(item.code));
});

const clientOnlyModules = computed(() => {
  const targetCodes = featureGroups.value.clientOnlyModuleCodes || [];
  const targetSet = new Set(targetCodes);
  return featureModules.value.filter((item) => targetSet.has(item.code));
});

const adminOnlyModules = computed(() => {
  const targetCodes = featureGroups.value.adminOnlyModuleCodes || [];
  const targetSet = new Set(targetCodes);
  return featureModules.value.filter((item) => targetSet.has(item.code));
});

const loadFeatureFlags = async () => {
  try {
    featureFlagsLoading.value = true;
    const data = await settingsApi.getFeatureFlags();
    featureModules.value = Array.isArray(data?.modules) ? data.modules : [];
    featureGroups.value = data?.groups || { sharedModuleCodes: [], clientOnlyModuleCodes: [], adminOnlyModuleCodes: [] };
    savedDisabledModules.value = Array.isArray(data?.disabledModules) ? data.disabledModules : [];
    authStore.setDisabledModules(savedDisabledModules.value);
    if (!authStore.hasModuleAccess("gamification") && activeTab.value === "gamification") {
      activeTab.value = "general";
    }
  } catch (error) {
    console.error("Ошибка загрузки feature flags:", error);
    showError("Не удалось загрузить feature flags");
  } finally {
    featureFlagsLoading.value = false;
  }
};

const toggleFeatureModule = (moduleCode, enabled) => {
  featureModules.value = featureModules.value.map((item) => {
    if (item.code !== moduleCode || item.locked) {
      return item;
    }

    return {
      ...item,
      enabled: Boolean(enabled),
    };
  });
};

const saveFeatureFlags = async () => {
  try {
    featureFlagsSaving.value = true;
    const disabledModules = featureModules.value.filter((item) => !item.enabled).map((item) => item.code);
    const data = await settingsApi.updateFeatureFlags(disabledModules);
    featureModules.value = Array.isArray(data?.modules) ? data.modules : featureModules.value;
    featureGroups.value = data?.groups || featureGroups.value;
    savedDisabledModules.value = Array.isArray(data?.disabledModules) ? data.disabledModules : disabledModules;
    authStore.setDisabledModules(savedDisabledModules.value);
    if (!authStore.hasModuleAccess("gamification") && activeTab.value === "gamification") {
      activeTab.value = "general";
    }
    showSuccess("Feature flags сохранены");
  } catch (error) {
    console.error("Ошибка сохранения feature flags:", error);
    showError(error?.response?.data?.error || "Не удалось сохранить feature flags");
  } finally {
    featureFlagsSaving.value = false;
  }
};

// Загрузка настроек
const loadSettings = async () => {
  try {
    settingsLoading.value = true;
    const data = await settingsApi.getSettings();
    const settings = data.settingsList || [];

    // Парсим настройки
    settings.forEach((setting) => {
      const value = parseValue(setting.setting_value);

      // Флаг движка правил
      if (setting.setting_key === "GAMIFICATION_ENABLED") {
        gamificationEnabled.value = value === "true" || value === true;
      }

      // Флаг движка правил
      if (setting.setting_key === "GAMIFICATION_RULES_ENABLED") {
        rulesEnabled.value = value === "true" || value === true;
      }

      const botField = BOT_SETTINGS_META.find((item) => item.key === setting.setting_key);
      if (botField) {
        botSettings.value[botField.field] = setting.setting_value || "";
      }
    });
  } catch (error) {
    console.error("Ошибка загрузки настроек:", error);
    showToast("Не удалось загрузить настройки", "error");
  } finally {
    settingsLoading.value = false;
  }
};

async function upsertSetting(key, value, description) {
  try {
    await settingsApi.updateSetting(key, value);
  } catch (error) {
    const status = Number(error?.response?.status || 0);
    if (status !== 404) {
      throw error;
    }

    await settingsApi.createSetting({ key, value, description });
  }
}

const saveBotSettings = async () => {
  try {
    botSaving.value = true;

    for (const meta of BOT_SETTINGS_META) {
      const value = String(botSettings.value[meta.field] || "").trim();
      await upsertSetting(meta.key, value, meta.description);
    }

    showSuccess("Настройки бота сохранены");
  } catch (error) {
    console.error("Ошибка сохранения настроек бота:", error);
    showError("Не удалось сохранить настройки бота");
  } finally {
    botSaving.value = false;
  }
};

// Парсинг значений
const parseValue = (value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  if (!isNaN(value) && value !== "") return Number(value);
  return value;
};

// Переключение движка правил
const toggleRulesEngine = async () => {
  try {
    await settingsApi.updateSetting("GAMIFICATION_RULES_ENABLED", rulesEnabled.value.toString());
    showSuccess(rulesEnabled.value ? "Движок гибких правил включен" : "Движок гибких правил выключен, используется встроенная логика");
  } catch (error) {
    console.error("Ошибка переключения движка правил:", error);
    showError("Не удалось изменить настройку");
    // Откатываем изменение
    rulesEnabled.value = !rulesEnabled.value;
  }
};

const toggleGamification = async () => {
  try {
    await settingsApi.updateSetting("GAMIFICATION_ENABLED", gamificationEnabled.value.toString());
    showSuccess(gamificationEnabled.value ? "Геймификация включена" : "Геймификация выключена вручную");
  } catch (error) {
    console.error("Ошибка переключения геймификации:", error);
    showError("Не удалось изменить настройку");
    gamificationEnabled.value = !gamificationEnabled.value;
  }
};

onMounted(() => {
  loadSettings();
  loadFeatureFlags();
});
</script>

<style scoped>
.settings-view {
  width: 100%;
}


.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  gap: 16px;
  flex-wrap: wrap;
}

.page-heading {
  font-size: 30px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.page-subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.bot-settings-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.bot-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bot-field-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.bot-field-input,
.bot-field-textarea {
  width: 100%;
  border: 1px solid var(--divider);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--surface-card);
  color: var(--text-primary);
  font: inherit;
}

.bot-field-textarea {
  resize: vertical;
}

.bot-actions {
  margin-top: 16px;
}

.feature-flags-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feature-flag-row {
  border: 1px solid var(--divider);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: var(--surface-card);
}

.feature-flag-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Gamification Rules */
.mode-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 20px;
}

.mode-indicator-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.mode-rules {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.mode-rules .mode-indicator-dot {
  background: #3b82f6;
  box-shadow: 0 0 0 3px #bfdbfe;
}

.mode-classic {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.mode-classic .mode-indicator-dot {
  background: #22c55e;
  box-shadow: 0 0 0 3px #bbf7d0;
}

.rules-toggle-container {
  margin-bottom: 24px;
}

.rules-toggle-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
}

.rules-toggle-checkbox {
  width: 20px;
  height: 20px;
  margin-top: 2px;
  cursor: pointer;
  accent-color: var(--accent-blue);
  flex-shrink: 0;
}

.rules-toggle-content {
  flex: 1;
}

.rules-toggle-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.rules-toggle-description {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.rules-content {
  margin-top: 24px;
}

.rules-dry-run {
  margin-top: 24px;
}


/* Responsive */
@media (max-width: 768px) {
  .page-heading {
    font-size: 24px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .settings-content {
    gap: 24px;
  }

  .settings-section {
    gap: 16px;
  }
}


/* Responsive */
@media (max-width: 768px) {
  .page-heading {
    font-size: 24px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .settings-content {
    gap: 24px;
  }

  .settings-section {
    gap: 16px;
  }
}
</style>
