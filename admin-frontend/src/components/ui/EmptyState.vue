<template>
  <div class="empty-state" :class="sizeClass">
    <div class="empty-icon">{{ icon }}</div>
    <h3 class="empty-title">{{ title }}</h3>
    <p class="empty-description">{{ description }}</p>
    <Button v-if="showButton" @click="handleClick" :variant="buttonVariant" class="empty-button">
      {{ buttonText }}
    </Button>
  </div>
</template>

<script setup>
import { computed } from "vue";
import Button from "./Button.vue";

const props = defineProps({
  title: {
    type: String,
    default: "Нет данных",
  },
  description: {
    type: String,
    default: "Здесь пока ничего нет. Попробуйте создать новый элемент.",
  },
  icon: {
    type: String,
    default: "📭",
  },
  showButton: {
    type: Boolean,
    default: false,
  },
  buttonText: {
    type: String,
    default: "Создать",
  },
  buttonVariant: {
    type: String,
    default: "primary",
  },
  size: {
    type: String,
    default: "md", // sm, md, lg
    validator: (value) => ["sm", "md", "lg"].includes(value),
  },
});

const emit = defineEmits(["action"]);

const sizeClass = computed(() => `empty-state-${props.size}`);

const handleClick = () => {
  emit("action");
};
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: var(--bg-secondary);
  border-radius: 12px;
  color: var(--text-secondary);
}

.empty-state-sm {
  padding: 40px 20px;
}

.empty-state-md {
  padding: 60px 20px;
}

.empty-state-lg {
  padding: 80px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
  display: block;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.empty-description {
  font-size: 14px;
  margin: 0 0 24px 0;
  color: var(--text-secondary);
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.5;
}

.empty-button {
  margin-top: 8px;
}

@media (max-width: 768px) {
  .empty-state {
    padding: 40px 16px;
  }

  .empty-icon {
    font-size: 36px;
  }

  .empty-title {
    font-size: 16px;
  }

  .empty-description {
    font-size: 13px;
  }
}
</style>
