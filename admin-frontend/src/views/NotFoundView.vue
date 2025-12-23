<template>
  <div class="min-h-[calc(100vh-200px)] flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <div class="text-center">
      <div class="mb-8">
        <h1 class="text-9xl font-bold text-gray-200 dark:text-gray-700">404</h1>
      </div>

      <div class="mb-8">
        <h2 class="text-3xl font-semibold text-gray-900 dark:text-white mb-4">
          {{ title }}
        </h2>
        <p class="text-lg text-gray-600 dark:text-gray-400 mb-2">
          {{ message }}
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-500">Если вы считаете, что это ошибка, обратитесь к администратору</p>
      </div>

      <div class="flex gap-4 justify-center">
        <button
          @click="goBack"
          class="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors duration-200"
        >
          Назад
        </button>
        <button @click="goHome" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200">
          На главную
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter, useRoute } from "vue-router";
import { computed } from "vue";

const router = useRouter();
const route = useRoute();

// Определяем тип ошибки на основе параметра маршрута
const errorType = computed(() => route.query.type || "not-found");

const title = computed(() => {
  switch (errorType.value) {
    case "forbidden":
      return "Доступ запрещён";
    case "not-found":
    default:
      return "Страница не найдена";
  }
});

const message = computed(() => {
  switch (errorType.value) {
    case "forbidden":
      return "У вас нет прав для доступа к этой странице";
    case "not-found":
    default:
      return "Запрашиваемая страница не существует или была удалена";
  }
});

const goBack = () => {
  router.go(-1);
};

const goHome = () => {
  router.push("/dashboard");
};
</script>
