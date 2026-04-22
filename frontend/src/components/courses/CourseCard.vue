<template>
  <article class="card assessment-card course-card" @click="$emit('open', course.id)">
    <div class="assessment-header">
      <div>
        <h3 class="title-small mb-8">{{ course.title }}</h3>
        <p class="course-description">{{ course.description || "Описание курса пока не добавлено" }}</p>
      </div>
      <StatusBadge :status="course.progress.status" />
    </div>

    <div class="assessment-info mb-12">
      <div class="info-item">
        <span class="label">Срок действия:</span>
        <span class="value">{{ validityLabel }}</span>
      </div>
      <div class="info-item">
        <span class="label">Тем курса:</span>
        <span class="value">{{ course.sectionsCount }}</span>
      </div>
      <div class="info-item">
        <span class="label">Тестов:</span>
        <span class="value">{{ course.testsCount }}</span>
      </div>
      <div class="info-item">
        <span class="label">Подтем:</span>
        <span class="value">{{ course.topicsCount }}</span>
      </div>
      <div class="info-item">
        <span class="label">Прогресс:</span>
        <span class="value">{{ normalizedProgress }}%</span>
      </div>
    </div>

    <ProgressBar class="mb-12" :value="normalizedProgress" />

    <div class="assessment-actions">
      <button class="btn btn-primary btn-full" @click.stop="$emit('open', course.id)">
        {{ actionText }}
      </button>
    </div>
  </article>
</template>

<script>
import { computed } from "vue";
import ProgressBar from "./ProgressBar.vue";
import StatusBadge from "./StatusBadge.vue";

export default {
  name: "CourseCard",
  components: {
    ProgressBar,
    StatusBadge,
  },
  emits: ["open"],
  props: {
    course: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const normalizedProgress = computed(() => {
      const value = Number(props.course?.progress?.progressPercent || 0);
      if (!Number.isFinite(value)) {
        return 0;
      }
      return Math.min(Math.max(Math.round(value), 0), 100);
    });

    const validityLabel = computed(() => {
      const course = props.course;
      if (!course) {
        return "—";
      }
      if (course.progress?.deadlineAt) {
        const deadline = new Date(course.progress.deadlineAt);
        if (!Number.isNaN(deadline.getTime())) {
          return `до ${deadline.toLocaleDateString("ru-RU")}`;
        }
      }
      if (course.availabilityMode === "fixed_dates" && course.availabilityFrom && course.availabilityTo) {
        return `${new Date(course.availabilityFrom).toLocaleDateString("ru-RU")} - ${new Date(course.availabilityTo).toLocaleDateString("ru-RU")}`;
      }
      if (course.availabilityMode === "relative_days" && Number(course.availabilityDays || 0) > 0) {
        return `${course.availabilityDays} дн. от назначения`;
      }
      return "Бессрочно";
    });

    const actionText = computed(() => {
      const status = props.course?.progress?.status;
      if (status === "completed") return "Открыть курс";
      if (status === "closed") return "Просмотр закрытого курса";
      if (status === "in_progress") return "Продолжить";
      return "Начать курс";
    });

    return {
      normalizedProgress,
      validityLabel,
      actionText,
    };
  },
};
</script>

<style scoped>
.course-description {
  margin: 0;
  color: var(--text-secondary, #64748b);
}
</style>
