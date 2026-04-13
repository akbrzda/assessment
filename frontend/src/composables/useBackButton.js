import { watch, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTelegramStore } from "../stores/telegram";

/**
 * Композабл для управления нативной кнопкой назад Telegram WebApp
 * Использует чёткую иерархию страниц вместо браузерной истории
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

  /**
   * Иерархическая карта навигации
   * Ключ - текущий маршрут, значение - родительский маршрут
   */
  const NAVIGATION_HIERARCHY = {
    // Пользовательские страницы
    profile: "/dashboard",
    leaderboard: "/dashboard",
    assessments: "/dashboard",
    "course-details": "/assessments",
    "assessment-results": "/assessments",

    // Админские страницы
    admin: "/dashboard",
    "admin-dashboard": "/dashboard",
    "admin-statistics": "/admin",
    "admin-users": "/admin",
    "admin-assessments": "/admin",
    "admin-branches": "/admin",
    "admin-invitations": "/admin",
    "assessment-create": "/admin/assessments",
    "assessment-edit": "/admin/assessments",
  };

  /**
   * Определяет нужно ли показывать кнопку назад для текущего маршрута
   */
  function shouldShowBackButton(routeName) {
    return routeName && !MAIN_ROUTES.includes(routeName);
  }

  /**
   * Обработчик нажатия кнопки назад
   * Использует иерархическую навигацию
   */
  function handleBackButton() {
    const routeName = route.name;

    // Проверяем есть ли в иерархии родительский маршрут
    const parentRoute = NAVIGATION_HIERARCHY[routeName];

    if (parentRoute) {
      console.log(`🔙 Navigating from ${routeName} to ${parentRoute}`);
      router.push(parentRoute);
    } else {
      // Если не определено - возвращаемся на dashboard
      console.log(`🔙 No parent route defined for ${routeName}, going to dashboard`);
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
