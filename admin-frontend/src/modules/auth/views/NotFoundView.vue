<template>
  <div class="min-h-[calc(100vh-200px)] flex items-center justify-center bg-background px-4">
    <div class="text-center">
      <div class="mb-8">
        <h1 class="text-9xl font-bold text-muted">404</h1>
      </div>

      <div class="mb-8">
        <h2 class="text-3xl font-semibold text-foreground mb-4">
          {{ title }}
        </h2>
        <p class="text-lg text-muted-foreground mb-2">
          {{ message }}
        </p>
        <p class="text-sm text-muted-foreground/70">Если вы считаете, что это ошибка, обратитесь к администратору</p>
      </div>

      <div class="flex gap-4 justify-center">
        <ActionButton action="back" @click="goBack" />
        <ActionButton action="confirm" label="На главную" @click="goHome" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter, useRoute } from "vue-router";
import { computed } from "vue";
import ActionButton from "@/components/ui/ActionButton.vue";

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
