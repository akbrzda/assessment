<template>
  <div class="settings-view">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h2 class="page-heading">Настройки системы</h2>
        <p class="page-subtitle">Управление параметрами системы</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-container">
      <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id" :class="['tab-button', { active: activeTab === tab.id }]">
        {{ tab.label }}
      </button>
    </div>

    <!-- Content -->
    <div class="settings-content">
      <!-- Вкладка: Общие настройки -->
      <div v-if="activeTab === 'general'" class="settings-section">
        <h3 class="section-title">Общие настройки</h3>

        <!-- Начисление очков (легаси) -->
        <Card title="Начисление очков" icon="Settings">
          <div class="form-grid">
            <Input
              v-model.number="gamificationSettings.points_per_assessment"
              type="number"
              label="Очки за прохождение аттестации"
              placeholder="10"
            />
            <Input
              v-model.number="gamificationSettings.high_score_multiplier"
              type="number"
              label="Множитель за высокий результат (90%+)"
              placeholder="1.5"
            />
            <Input
              v-model.number="gamificationSettings.perfect_score_bonus"
              type="number"
              label="Бонус за идеальный результат (100%)"
              placeholder="50"
            />
            <Input v-model.number="gamificationSettings.monthly_activity_bonus" type="number" label="Очки за активность в месяц" placeholder="20" />
          </div>
          <template #footer>
            <Button @click="saveGamificationSettings" variant="primary" :loading="savingGamification" size="md">Сохранить настройки очков</Button>
          </template>
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
              <input v-model="rulesEnabled" @change="toggleRulesEngine" type="checkbox" class="rules-toggle-checkbox" />
              <div class="rules-toggle-content">
                <div class="rules-toggle-title">Использовать движок правил</div>
                <div class="rules-toggle-description">
                  Включить гибкую систему правил начисления очков (если выключено - используется встроенная логика)
                </div>
              </div>
            </label>
          </div>

          <div v-if="rulesEnabled" class="rules-content">
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
import settingsApi from "../api/settings";
import BadgesManager from "../components/BadgesManager.vue";
import LevelsManager from "../components/LevelsManager.vue";
import GamificationRulesManager from "../components/GamificationRulesManager.vue";
import GamificationDryRun from "../components/GamificationDryRun.vue";
import Card from "../components/ui/Card.vue";
import Input from "../components/ui/Input.vue";
import Button from "../components/ui/Button.vue";
import Icon from "../components/ui/Icon.vue";
import { useToast } from "../composables/useToast";

const { showToast, showSuccess, showError } = useToast();

// Табы
const tabs = [
  { id: "general", label: "Общие" },
  { id: "gamification", label: "Геймификация" },
  { id: "environment", label: "Переменные окружения" },
];

const activeTab = ref("general");

// Состояния настроек
const gamificationSettings = ref({
  points_per_assessment: 10,
  high_score_multiplier: 1.5,
  perfect_score_bonus: 50,
  monthly_activity_bonus: 20,
});

const rulesEnabled = ref(false);

// Состояния сохранения
const savingGamification = ref(false);

// Загрузка настроек
const loadSettings = async () => {
  try {
    const data = await settingsApi.getSettings();
    const settings = data.settingsList || [];

    // Парсим настройки
    settings.forEach((setting) => {
      const value = parseValue(setting.setting_value);

      // Распределяем по категориям
      if (setting.setting_key.startsWith("gamification_")) {
        const key = setting.setting_key.replace("gamification_", "");
        gamificationSettings.value[key] = value;
      }

      // Флаг движка правил
      if (setting.setting_key === "GAMIFICATION_RULES_ENABLED") {
        rulesEnabled.value = value === "true" || value === true;
      }
    });
  } catch (error) {
    console.error("Ошибка загрузки настроек:", error);
    showToast("Не удалось загрузить настройки", "error");
  }
};

// Парсинг значений
const parseValue = (value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  if (!isNaN(value) && value !== "") return Number(value);
  return value;
};

// Сохранение настроек геймификации
const saveGamificationSettings = async () => {
  savingGamification.value = true;
  try {
    for (const [key, value] of Object.entries(gamificationSettings.value)) {
      await settingsApi.updateSetting(`gamification_${key}`, value);
    }
    showToast("Настройки геймификации сохранены", "success");
  } catch (error) {
    console.error("Ошибка сохранения настроек геймификации:", error);
    showToast("Не удалось сохранить настройки", "error");
  } finally {
    savingGamification.value = false;
  }
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

onMounted(() => {
  loadSettings();
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

/* Tabs */
.tabs-container {
  display: flex;
  gap: 8px;
  margin-bottom: 32px;
  border-bottom: 2px solid var(--divider);
  overflow-x: auto;
}

.tab-button {
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-button:hover {
  color: var(--text-primary);
}

.tab-button.active {
  color: var(--accent-blue);
  border-bottom-color: var(--accent-blue);
}

/* Forms */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Gamification Rules */
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
  font-family: "Courier New", monospace;
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
  font-family: "Courier New", monospace;
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

  .tabs-container {
    gap: 4px;
  }

  .tab-button {
    padding: 10px 16px;
    font-size: 14px;
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
  font-family: "Courier New", monospace;
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
