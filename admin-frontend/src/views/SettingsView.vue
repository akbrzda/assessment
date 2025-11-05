<template>
  <div class="settings-view">
    <div class="page-header">
      <h1 class="page-title">Настройки системы</h1>
      <p class="page-description">Управление параметрами геймификации и бейджами</p>
    </div>

    <!-- Контент -->
    <div class="settings-content">
      <div class="settings-section">
        <div class="section-header">
          <h2 class="section-title">Геймификация</h2>
          <p class="section-description">Управление очками, уровнями и бейджами для мотивации сотрудников</p>
        </div>

        <!-- Настройки очков -->
        <div class="settings-card">
          <h3 class="card-title">Начисление очков</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Очки за прохождение аттестации</label>
              <input v-model.number="gamificationSettings.points_per_assessment" type="number" class="form-input" placeholder="10" />
              <small>Базовое количество очков за любую завершённую аттестацию</small>
            </div>
            <div class="form-group">
              <label>Множитель за высокий результат (90%+)</label>
              <input v-model.number="gamificationSettings.high_score_multiplier" type="number" step="0.1" class="form-input" placeholder="1.5" />
              <small>Коэффициент умножения очков при результате 90% и выше</small>
            </div>
            <div class="form-group">
              <label>Бонус за идеальный результат (100%)</label>
              <input v-model.number="gamificationSettings.perfect_score_bonus" type="number" class="form-input" placeholder="50" />
              <small>Дополнительные очки за безошибочное прохождение</small>
            </div>
            <div class="form-group">
              <label>Очки за активность в месяц</label>
              <input v-model.number="gamificationSettings.monthly_activity_bonus" type="number" class="form-input" placeholder="20" />
              <small>Бонус за регулярное участие в аттестациях</small>
            </div>
          </div>
          <div class="card-actions">
            <button @click="saveGamificationSettings" class="btn-primary" :disabled="savingGamification">
              <svg v-if="!savingGamification" class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span v-if="savingGamification">Сохранение...</span>
              <span v-else>Сохранить настройки очков</span>
            </button>
          </div>
        </div>

        <!-- Управление уровнями -->
        <div class="settings-card">
          <LevelsManager />
        </div>

        <!-- Управление бейджами -->
        <div class="settings-card">
          <BadgesManager />
        </div>

        <!-- Переменные окружения (только чтение) -->
        <div class="settings-card">
          <h3 class="card-title">Переменные окружения (.env)</h3>
          <div class="env-info">
            <p class="env-description">
              Эти переменные настраиваются в файле <code>.env</code> на сервере и не могут быть изменены через админ-панель.
            </p>
            <div class="env-list">
              <div class="env-item">
                <span class="env-key">BOT_TOKEN</span>
                <span class="env-description">Токен основного Telegram бота</span>
              </div>
              <div class="env-item">
                <span class="env-key">LOG_BOT_TOKEN</span>
                <span class="env-description">Токен бота для отправки логов</span>
              </div>
              <div class="env-item">
                <span class="env-key">LOG_CHAT_ID</span>
                <span class="env-description">ID чата/группы для отправки логов</span>
              </div>
              <div class="env-item">
                <span class="env-key">INVITE_EXPIRATION_DAYS</span>
                <span class="env-description">Срок действия приглашений (в днях)</span>
              </div>
              <div class="env-item">
                <span class="env-key">SUPERADMIN_IDS</span>
                <span class="env-description">ID супер-администраторов (через запятую)</span>
              </div>
              <div class="env-item">
                <span class="env-key">ALLOWED_ORIGINS</span>
                <span class="env-description">Разрешённые домены для CORS (через запятую)</span>
              </div>
              <div class="env-item">
                <span class="env-key">JWT_SECRET</span>
                <span class="env-description">Секретный ключ для JWT токенов</span>
              </div>
              <div class="env-item">
                <span class="env-key">JWT_REFRESH_SECRET</span>
                <span class="env-description">Секретный ключ для refresh токенов</span>
              </div>
            </div>
            <div class="env-note">
              <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Для изменения этих переменных необходимо отредактировать файл <code>.env</code> и перезапустить сервер.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import settingsApi from "../api/settings";
import BadgesManager from "../components/BadgesManager.vue";
import LevelsManager from "../components/LevelsManager.vue";
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
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.page-description {
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0;
}

.settings-content {
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
  gap: 2rem;
}

.section-header {
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.section-description {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

/* Карточки */
.settings-card {
  background: var(--surface-card);
  border: 1px solid var(--divider);
  border-radius: 12px;
  padding: 2rem;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1.5rem 0;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--divider);
}

/* Формы */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.875rem;
}

.form-group small {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--divider);
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.875rem;
  transition: all 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-blue);
  background: var(--surface-card);
}

/* Действия */
.card-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--divider);
}

.card-actions .btn-primary {
  min-width: 200px;
}

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  background: var(--accent-blue);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-blue-hover);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon {
  width: 18px;
  height: 18px;
}

/* Переменные окружения */
.env-info {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.env-description {
  color: var(--text-secondary);
  line-height: 1.6;
}

.env-description code {
  background: var(--bg-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  color: var(--accent-blue);
  font-family: "Courier New", monospace;
}

.env-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.env-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 10px;
  border: 1px solid var(--divider);
}

.env-key {
  font-family: "Courier New", monospace;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--accent-blue);
}

.env-item .env-description {
  font-size: 0.8125rem;
  margin: 0;
}

.env-note {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--accent-blue-soft);
  border-radius: 10px;
  color: var(--text-primary);
}

.env-note .icon {
  width: 20px;
  height: 20px;
  color: var(--accent-blue);
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.env-note span {
  font-size: 0.875rem;
  line-height: 1.5;
}

.env-note code {
  background: var(--bg-secondary);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.8125rem;
}

@media (max-width: 768px) {
  .settings-view {
    padding: 1rem;
  }

  .settings-card {
    padding: 1.5rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
