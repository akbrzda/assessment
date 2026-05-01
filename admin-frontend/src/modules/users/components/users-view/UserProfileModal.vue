<template>
  <Modal :show="show" :title="title" size="lg" @close="emit('close')">
    <div v-if="userProfile" class="user-profile">
      <div class="profile-header">
        <div class="profile-avatar">{{ selectedUser?.first_name?.charAt(0) }}{{ selectedUser?.last_name?.charAt(0) }}</div>
        <div class="profile-info">
          <div class="profile-name-row">
            <h3 class="profile-name">{{ userProfile.user.first_name }} {{ userProfile.user.last_name }}</h3>
            <Badge :variant="getRoleBadgeVariant(userProfile.user.role_name)" size="sm">
              {{ getRoleLabel(userProfile.user.role_name) }}
            </Badge>
          </div>
          <div class="profile-meta">
            <span class="profile-badge">Уровень {{ userProfile.user.level }}</span>
            <span class="profile-badge">{{ userProfile.user.points }} очков</span>
          </div>
          <div class="profile-details">
            <span>{{ userProfile.user.branch_name || "—" }}</span>
            <span>•</span>
            <span>{{ userProfile.user.position_name || "—" }}</span>
          </div>
        </div>
      </div>

      <div class="profile-stats">
        <div class="stat-card">
          <div class="stat-icon">
            <Icon name="ClipboardList" />
          </div>
          <div class="stat-value">{{ userProfile.stats.total_assessments || 0 }}</div>
          <div class="stat-label">Аттестаций</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <Icon name="square-check" />
          </div>
          <div class="stat-value">{{ userProfile.stats.completed_attempts || 0 }}</div>
          <div class="stat-label">Завершено</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <Icon name="chart-line" />
          </div>
          <div class="stat-value">{{ formatScore(userProfile.stats.avg_score) }}%</div>
          <div class="stat-label">Средний балл</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <Icon name="trophy" />
          </div>
          <div class="stat-value">{{ userProfile.rank.user_rank || "—" }}</div>
          <div class="stat-label">Место в рейтинге</div>
        </div>
      </div>

      <div v-if="userProfile.nextLevel" class="profile-section">
        <h3>Прогресс до следующего уровня</h3>
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${userProfile.progressToNextLevel}%` }"></div>
          </div>
          <p class="progress-text">
            {{ Math.round(userProfile.progressToNextLevel) }}% • Осталось
            {{ Math.max((userProfile.nextLevel.min_points || 0) - (userProfile.user.points || 0), 0) }} очков
          </p>
        </div>
      </div>

      <div class="profile-section">
        <h3>Достижения {{ userProfile.badges && userProfile.badges.length > 0 ? `(${userProfile.badges.length})` : "" }}</h3>
        <div v-if="userProfile.badges && userProfile.badges.length > 0" class="badges-grid">
          <div v-for="badge in userProfile.badges" :key="badge.id" class="badge-item" :title="badge.description">
            <div class="badge-icon">{{ badge.icon }}</div>
            <div class="badge-name">{{ badge.name }}</div>
            <div class="badge-date">{{ formatDate(badge.earned_at) }}</div>
          </div>
        </div>
        <div v-else class="empty-badges">
          <div class="empty-icon">
            <Icon name="medal" size="96" />
          </div>
          <p>Пока нет заработанных достижений</p>
        </div>
      </div>

      <div class="profile-section">
        <h3>
          Аттестации
          {{ userProfile.assessmentsSummary && userProfile.assessmentsSummary.length > 0 ? `(${userProfile.assessmentsSummary.length})` : "" }}
        </h3>
        <div v-if="userProfile.assessmentsSummary && userProfile.assessmentsSummary.length > 0" class="history-header">
          <span>Аттестация</span>
          <span>Дата</span>
          <span>Лучший %</span>
          <span>Попыток</span>
          <span>Время</span>
          <span>Статус</span>
        </div>
        <div v-if="userProfile.assessmentsSummary && userProfile.assessmentsSummary.length > 0" class="history-list">
          <div v-for="summary in userProfile.assessmentsSummary" :key="summary.id" class="history-item">
            <div class="history-info">
              <div class="history-line">
                <span class="history-title">{{ summary.title }}</span>
                <span>{{ formatDateTime(summary.last_attempt_at) }}</span>
                <span>{{ formatScore(summary.best_score_percent) }}%</span>
                <span>{{ summary.attempts_count }}</span>
                <span>{{ formatTimeSpent(summary.time_spent_seconds) }}</span>
                <span>{{ formatAssessmentResult(summary) }}</span>
              </div>
            </div>
            <div class="history-actions">
              <Button size="sm" variant="ghost" icon="RotateCcw" title="Сбросить прогресс" @click="emit('reset-progress', summary)" />
            </div>
          </div>
        </div>
        <div v-else class="empty-history">
          <div class="empty-icon">
            <Icon name="ClipboardList" size="96" />
          </div>
          <p>Аттестаций нет</p>
        </div>
      </div>
    </div>

    <div class="modal-actions">
      <Button variant="secondary" @click="emit('close')">Закрыть</Button>
    </div>
  </Modal>
</template>

<script setup>
import { Badge, Button, Icon, Modal } from "@/components/ui";

defineProps({
  show: { type: Boolean, required: true },
  title: { type: String, required: true },
  selectedUser: { type: Object, default: null },
  userProfile: { type: Object, default: null },
  getRoleBadgeVariant: { type: Function, required: true },
  getRoleLabel: { type: Function, required: true },
  formatScore: { type: Function, required: true },
  formatDate: { type: Function, required: true },
  formatDateTime: { type: Function, required: true },
  formatTimeSpent: { type: Function, required: true },
  formatAssessmentResult: { type: Function, required: true },
});

const emit = defineEmits(["close", "reset-progress"]);
</script>

<style scoped>
.user-profile {
  max-width: 900px;
  margin: 0 auto;
}

.profile-header {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 32px;
  padding: 24px;
  background: var(--color-background-soft);
  border-radius: 16px;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: bold;
  color: white;
  flex-shrink: 0;
}

.profile-info {
  flex: 1;
}

.profile-name-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.profile-name {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--color-heading);
}

.profile-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.profile-badge {
  padding: 6px 12px;
  background: var(--color-background-mute);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.profile-details {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  padding: 20px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  text-align: center;
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px #00000014;
  border-color: var(--color-primary);
}

.stat-card .stat-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.stat-card .stat-value {
  display: block;
  font-size: 32px;
  font-weight: bold;
  color: var(--color-primary);
  margin-bottom: 4px;
}

.stat-card .stat-label {
  display: block;
  font-size: 14px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.profile-section {
  margin-bottom: 32px;
}

.profile-section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-heading);
}

.progress-container {
  padding: 16px;
  background: var(--color-background-soft);
  border-radius: 12px;
}

.progress-bar {
  height: 14px;
  background: var(--color-background-mute);
  border-radius: 7px;
  overflow: hidden;
  margin-bottom: 12px;
  border: 1px solid var(--color-border);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 7px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.progress-fill::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, #ffffff33, transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.progress-text {
  font-size: 14px;
  color: var(--color-text);
  text-align: center;
  font-weight: 500;
  margin: 0;
}

.badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 16px;
}

.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: var(--color-background-soft);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  text-align: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: default;
}

.badge-item:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 8px 24px #0000001f;
  border-color: var(--color-primary);
}

.badge-icon {
  font-size: 48px;
  margin-bottom: 12px;
  filter: drop-shadow(0 2px 4px #0000001a);
}

.badge-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 6px;
}

.badge-date {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 20px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  transition: all 0.2s;
}

.history-item:hover {
  background: var(--color-background-mute);
  border-color: var(--color-primary);
  transform: translateX(4px);
}

.history-info {
  flex: 1;
}

.history-header {
  display: grid;
  grid-template-columns: 2fr 1fr 0.7fr 1.1fr 0.8fr 0.8fr;
  gap: 12px;
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
  padding: 0 20px;
}

.history-line {
  display: grid;
  grid-template-columns: 2fr 1fr 0.7fr 1.1fr 0.8fr 0.8fr;
  gap: 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
  align-items: center;
}

.history-title {
  font-weight: 600;
  color: var(--color-heading);
  font-size: 14px;
}

.history-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.empty-badges,
.empty-history {
  text-align: center;
  padding: 48px 32px;
  background: var(--color-background-soft);
  border-radius: 12px;
  border: 2px dashed var(--color-border);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-badges p,
.empty-history p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 15px;
}

.modal-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
