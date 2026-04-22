<template>
  <div class="page-container">
    <div class="container">
      <StatusPageLayout
        :icon="statusConfig.icon"
        :tone="statusConfig.tone"
        :title="statusConfig.title"
        :description="statusConfig.description"
        :primary-label="statusConfig.primaryLabel"
        :secondary-label="statusConfig.secondaryLabel"
        @primary="handlePrimary"
        @secondary="handleSecondary"
      />
    </div>
  </div>
</template>

<script>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import StatusPageLayout from "../components/courses/StatusPageLayout.vue";

const STATUS_PAGE_CONFIG = {
  course_completed: {
    icon: "✓",
    tone: "success",
    title: "Курс завершен",
    description: "Вы прошли все обязательные шаги курса. Можно перейти к следующему обучению.",
    primaryLabel: "К списку курсов",
    secondaryLabel: "На главную",
  },
  final_assessment_passed: {
    icon: "★",
    tone: "success",
    title: "Итоговая аттестация пройдена",
    description: "Итоговый тест сдан успешно. Результат сохранен в вашем прогрессе.",
    primaryLabel: "Вернуться к курсу",
    secondaryLabel: "К списку курсов",
  },
  attempts_exhausted: {
    icon: "!",
    tone: "warning",
    title: "Попытки закончились",
    description: "Для этого шага больше нет доступных попыток. Обратитесь к управляющему или администратору.",
    primaryLabel: "Вернуться к курсу",
    secondaryLabel: "К списку курсов",
  },
  course_closed: {
    icon: "×",
    tone: "danger",
    title: "Курс закрыт",
    description: "Этот курс закрыт администратором и недоступен для прохождения.",
    primaryLabel: "К списку курсов",
    secondaryLabel: "На главную",
  },
  sequence_blocked: {
    icon: "↗",
    tone: "info",
    title: "Шаг недоступен",
    description: "Сначала завершите предыдущий обязательный шаг, после этого доступ откроется автоматически.",
    primaryLabel: "Вернуться к курсу",
    secondaryLabel: "К списку курсов",
  },
  course_expired: {
    icon: "⌛",
    tone: "warning",
    title: "Срок курса истек",
    description: "Период прохождения курса завершен. Уточните дальнейшие действия у управляющего.",
    primaryLabel: "К списку курсов",
    secondaryLabel: "На главную",
  },
};

export default {
  name: "CourseStatusPageView",
  components: {
    StatusPageLayout,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();

    const courseId = computed(() => Number(route.params.courseId || 0));
    const statusType = computed(() => String(route.params.statusType || ""));

    const statusConfig = computed(() => {
      return STATUS_PAGE_CONFIG[statusType.value] || STATUS_PAGE_CONFIG.sequence_blocked;
    });

    function goToCourse() {
      if (courseId.value > 0) {
        router.push(`/courses/${courseId.value}`);
        return;
      }
      router.push("/assessments");
    }

    function handlePrimary() {
      if (statusType.value === "course_completed" || statusType.value === "course_closed" || statusType.value === "course_expired") {
        router.push("/assessments");
        return;
      }
      goToCourse();
    }

    function handleSecondary() {
      if (statusType.value === "final_assessment_passed" || statusType.value === "attempts_exhausted" || statusType.value === "sequence_blocked") {
        router.push("/assessments");
        return;
      }
      router.push("/dashboard");
    }

    return {
      statusConfig,
      handlePrimary,
      handleSecondary,
    };
  },
};
</script>
