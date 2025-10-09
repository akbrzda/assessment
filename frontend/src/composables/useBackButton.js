import { watch, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTelegramStore } from "../stores/telegram";

/**
 * Композабл для управления нативной кнопкой назад Telegram WebApp
 * Автоматически показывает/скрывает кнопку в зависимости от маршрута
 */
export function useBackButton() {
  const route = useRoute();
  const router = useRouter();
  const telegramStore = useTelegramStore();

  // Список маршрутов, где кнопка назад НЕ должна показываться (главные страницы)
  const MAIN_ROUTES = [
    "dashboard",
    "registration",
    "assessment-process", // Во время аттестации кнопка назад управляется вручную
  ];

  // Список маршрутов с кастомной логикой навигации назад
  const CUSTOM_BACK_ROUTES = {
    "assessment-results": () => router.push("/assessments"),
    profile: () => router.push("/dashboard"),
    leaderboard: () => router.push("/dashboard"),
    assessments: () => router.push("/dashboard"),
    "admin-users": () => router.push("/admin"),
    "admin-assessments": () => router.push("/admin"),
    "admin-questions": () => router.push("/admin"),
    "admin-branches": () => router.push("/admin"),
    "admin-invitations": () => router.push("/admin"),
    statistics: () => router.push("/admin"),
  };

  /**
   * Определяет нужно ли показывать кнопку назад для текущего маршрута
   */
  function shouldShowBackButton(routeName) {
    return routeName && !MAIN_ROUTES.includes(routeName);
  }

  /**
   * Обработчик нажатия кнопки назад
   */
  function handleBackButton() {
    const routeName = route.name;

    // Если есть кастомная логика для маршрута
    if (CUSTOM_BACK_ROUTES[routeName]) {
      console.log(`🔙 Custom back navigation for route: ${routeName}`);
      CUSTOM_BACK_ROUTES[routeName]();
      return;
    }

    // Иначе стандартная навигация назад
    console.log(`🔙 Standard back navigation from route: ${routeName}`);
    if (window.history.length > 1) {
      router.go(-1);
    } else {
      // Если нет истории, идем на главную
      router.push("/dashboard");
    }
  }

  /**
   * Обновляет состояние кнопки назад
   */
  function updateBackButton() {
    if (shouldShowBackButton(route.name)) {
      telegramStore.showBackButton(handleBackButton);
      console.log(`⬅️ Back button shown for route: ${route.name}`);
    } else {
      telegramStore.hideBackButton();
      console.log(`❌ Back button hidden for route: ${route.name}`);
    }
  }

  // Следим за изменениями маршрута
  const stopWatcher = watch(
    () => route.name,
    () => {
      updateBackButton();
    },
    { immediate: true }
  );

  onMounted(() => {
    updateBackButton();
  });

  onUnmounted(() => {
    // Скрываем кнопку при размонтировании компонента
    telegramStore.hideBackButton();
    stopWatcher();
  });

  return {
    shouldShowBackButton,
    updateBackButton,
    handleBackButton,
    // Для отладки
    isBackButtonVisible: () => telegramStore.tg?.BackButton?.isVisible || false,
    getCurrentRoute: () => route.name,
  };
}
