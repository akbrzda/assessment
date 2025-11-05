<template>
  <div class="settings-view">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h2 class="page-heading">Настройки системы</h2>
        <p class="page-subtitle">Управление параметрами геймификации и бейджами</p>
      </div>
    </div>

    <!-- Content -->
    <div class="settings-content">
      <!-- Геймификация -->
      <div class="settings-section">
        <h3 class="section-title">Геймификация</h3>

        <!-- Начисление очков -->
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

        <!-- Управление уровнями -->
        <LevelsManager />

        <!-- Управление бейджами -->
        <BadgesManager />
      </div>

      <!-- Переменные окружения -->
      <div class="settings-section">
        <h3 class="section-title">Переменные окружения</h3>

        <Card title="Конфигурация (.env)" icon="Lock">
          <div class="env-description-block">
            <p>Эти переменные задаются в файлах <code>.env</code> и не изменяются из админ-панели.</p>
          </div>

          <div class="env-columns">
            <div class="env-column">
              <h4 class="env-column-title">Backend (<code>backend/.env</code>)</h4>
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
              <h4 class="env-column-title">Frontend (<code>admin-frontend/.env</code>)</h4>
              <div class="env-list">
                <div class="env-item">
                  <div class="env-key">VITE_API_BASE_URL</div>
                  <div class="env-value">Базовый URL API (используется axios)</div>
                </div>
                <div class="env-item">
                  <div class="env-key">VITE_INVITE_EXPIRATION_DAYS</div>
                  <div class="env-value">Срок действия приглашений, отображаемый в интерфейсе</div>
                </div>
                <div class="env-item">
                  <div class="env-key">VITE_BOT_USERNAME</div>
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
import Card from "../components/ui/Card.vue";
import Input from "../components/ui/Input.vue";
import Button from "../components/ui/Button.vue";
import Icon from "../components/ui/Icon.vue";
import { useToast } from "../composables/useToast";

const { showToast } = useToast();

// Состояния настроек
const gamificationSettings = ref({
  points_per_assessment: 10,
  high_score_multiplier: 1.5,
  perfect_score_bonus: 50,
  monthly_activity_bonus: 20,
});

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

/* Forms */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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

.env-value {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.env-note {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--accent-blue-soft);
  border-radius: 12px;
  color: var(--text-primary);
}

.env-note-icon {
  width: 20px;
  height: 20px;
  color: var(--accent-blue);
  flex-shrink: 0;
  margin-top: 2px;
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
