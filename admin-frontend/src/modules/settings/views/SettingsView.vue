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
      <!-- Вкладка: Общие -->
      <div v-if="activeTab === 'general'" class="settings-section">
        <h3 class="section-title">Общие настройки</h3>

        <Card title="Логотип компании" icon="Image">
          <p class="text-sm text-muted-foreground mb-4">
            Логотип отображается в PNG-сертификатах. Рекомендуемый формат: PNG с прозрачным фоном, до 2 МБ.
          </p>

          <div class="flex flex-col gap-4">
            <div v-if="logoPreview" class="logo-preview-wrap">
              <img :src="logoPreview" alt="Логотип компании" class="logo-preview-img" />
            </div>

            <div class="flex items-center gap-3">
              <input ref="logoFileInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="handleLogoUpload" />
              <Button icon="Upload" :loading="logoUploading" @click="logoFileInput?.click()">
                {{ logoPreview ? "Заменить логотип" : "Загрузить логотип" }}
              </Button>
              <span v-if="logoPreview" class="text-sm text-muted-foreground">Текущий путь: {{ logoPreview }}</span>
            </div>
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

      <!-- Вкладка: Переменные окружения -->
      <div v-if="activeTab === 'environment'" class="settings-section">
        <h3 class="section-title">Переменные окружения</h3>

        <Card title="Конфигурация (.env)" icon="Lock">
          <div class="env-description-block">
            <p>Эти переменные задаются в файлах <code>.env</code> и не изменяются из админ-панели.</p>
          </div>

          <div class="env-columns">
            <div class="env-column">
              <h4 class="env-column-title">Backend (общий <code>.env</code>)</h4>
              <div class="env-list">
                <div class="env-item">
                  <div class="env-key">BOT_TOKEN</div>
                  <div class="env-value">Токен основного Telegram-бота</div>
                </div>
                <div class="env-item">
                  <div class="env-key">LOG_BOT_TOKEN</div>
                  <div class="env-value">Токен бота для отправки логов</div>
                </div>
                <div class="env-item">
                  <div class="env-key">LOG_CHAT_ID</div>
                  <div class="env-value">ID чата/группы для логов</div>
                </div>
                <div class="env-item">
                  <div class="env-key">INVITE_EXPIRATION_DAYS</div>
                  <div class="env-value">Срок действия ссылок-приглашений (дни)</div>
                </div>
                <div class="env-item">
                  <div class="env-key">SUPERADMIN_IDS</div>
                  <div class="env-value">Telegram ID суперадминов (через запятую)</div>
                </div>
                <div class="env-item">
                  <div class="env-key">ALLOWED_ORIGINS</div>
                  <div class="env-value">Разрешённые домены для CORS</div>
                </div>
                <div class="env-item">
                  <div class="env-key">JWT_SECRET</div>
                  <div class="env-value">Секретный ключ для access-токенов</div>
                </div>
                <div class="env-item">
                  <div class="env-key">JWT_REFRESH_SECRET</div>
                  <div class="env-value">Секретный ключ для refresh-токенов</div>
                </div>
              </div>
            </div>

            <div class="env-column">
              <h4 class="env-column-title">Frontend (общий <code>.env</code>)</h4>
              <div class="env-list">
                <div class="env-item">
                  <div class="env-key">API_BASE_URL</div>
                  <div class="env-value">Базовый URL API (для клиентских запросов)</div>
                </div>
                <div class="env-item">
                  <div class="env-key">INVITE_EXPIRATION_DAYS</div>
                  <div class="env-value">Срок действия приглашений, отображаемый в интерфейсе</div>
                </div>
                <div class="env-item">
                  <div class="env-key">BOT_USERNAME</div>
                  <div class="env-value">Username Telegram-бота (для ссылок без @)</div>
                </div>
              </div>
            </div>
          </div>

          <div class="env-note">
            <Icon name="Info" class="env-note-icon" />
            <span>После изменения переменных окружения необходимо обновить файл <code>.env</code> и перезагрузить соответствующий сервис.</span>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from "vue";
import settingsApi from "@/api/settings";
import BadgesManager from "@/modules/settings/components/BadgesManager.vue";
import LevelsManager from "@/modules/settings/components/LevelsManager.vue";
import GamificationRulesManager from "@/modules/gamification/components/GamificationRulesManager.vue";
import GamificationDryRun from "@/modules/gamification/components/GamificationDryRun.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Tabs from "@/components/ui/Tabs.vue";
import Icon from "@/components/ui/Icon.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import Skeleton from "@/components/ui/Skeleton.vue";
import SkeletonForm from "@/components/ui/SkeletonForm.vue";
import SkeletonPageHeader from "@/components/ui/SkeletonPageHeader.vue";
import { useToast } from "@/composables/useToast";
import { useSkeletonGate } from "@/composables/useSkeletonGate";

const { showToast, showSuccess, showError } = useToast();

// Табы
const tabsConfig = [
  { value: "general", label: "Общие" },
  { value: "bot", label: "Бот и онбординг" },
  { value: "gamification", label: "Геймификация" },
  { value: "environment", label: "Переменные окружения" },
];

const activeTab = ref("general");
const settingsLoading = ref(true);
const { skeletonVisible } = useSkeletonGate(settingsLoading, { minDuration: 320, delay: 80 });

const gamificationEnabled = ref(true);
const rulesEnabled = ref(false);

// Общие настройки
const logoUrl = ref("");
const logoPreview = ref("");
const logoUploading = ref(false);
const logoFileInput = ref(null);

const botSaving = ref(false);
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

async function handleLogoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  logoUploading.value = true;
  try {
    const result = await settingsApi.uploadLogo(file);
    logoUrl.value = result.url;
    logoPreview.value = result.url;
    showSuccess("Логотип загружен");
  } catch (err) {
    console.error("Ошибка загрузки логотипа:", err);
    showError("Не удалось загрузить логотип");
  } finally {
    logoUploading.value = false;
    if (logoFileInput.value) logoFileInput.value.value = "";
  }
}

// Загрузка настроек
const loadSettings = async () => {
  try {
    settingsLoading.value = true;
    const data = await settingsApi.getSettings();
    const settings = data.settingsList || [];

    // Парсим настройки
    settings.forEach((setting) => {
      const value = parseValue(setting.setting_value);

      if (setting.setting_key === "COMPANY_LOGO_URL") {
        logoUrl.value = setting.setting_value || "";
        logoPreview.value = setting.setting_value || "";
      }

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
});
</script>

<style scoped>
.settings-view {
  width: 100%;
}

.logo-preview-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  width: fit-content;
}

.logo-preview-img {
  max-height: 64px;
  max-width: 200px;
  object-fit: contain;
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

/* Environment Variables */
.env-description-block {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--divider);
}

.env-description-block p {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
}

.env-description-block code {
  background: var(--bg-secondary);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 14px;
  color: var(--accent-blue);
}

.env-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.env-column {
  display: flex;
  flex-direction: column;
}

.env-column-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.env-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.env-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  background: var(--surface-card);
  border-radius: 12px;
  border: 1px solid var(--divider);
}

.env-key {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-blue);
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

  .env-columns {
    grid-template-columns: 1fr;
  }
}

.env-note span {
  font-size: 14px;
  line-height: 1.5;
}

.env-note code {
  background: #ffffff33;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 13px;
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
