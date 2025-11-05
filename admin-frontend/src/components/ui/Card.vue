<template>
  <div class="card" :class="{ 'card-hoverable': hoverable }">
    <div v-if="title || $slots.header" class="card-header">
      <slot name="header">
        <div class="card-header-content">
          <Icon v-if="icon" :name="icon" class="card-header-icon" />
          <h3 class="card-title">{{ title }}</h3>
        </div>
      </slot>
    </div>
    <div class="card-content" :class="`card-padding-${padding}`">
      <slot></slot>
    </div>
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup>
import Icon from "./Icon.vue";

defineProps({
  title: String,
  icon: String,
  padding: {
    type: String,
    default: "sm",
    validator: (value) => ["none", "sm", "md", "lg"].includes(value),
  },
  hoverable: Boolean,
  noPadding: Boolean,
});
</script>

<style scoped>
.card {
  background-color: var(--bg-primary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  transition: all 0.2s ease;
}

.card-hoverable {
  cursor: pointer;
}

.card-hoverable:hover {
  border-color: var(--accent-blue);
}

.card-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
}

.card-header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-header-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--text-primary);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.5;
}

.card-content {
  padding: 24px;
}

.card-padding-none {
  padding: 0;
}

.card-padding-sm {
  padding: 12px;
}

.card-padding-md {
  padding: 24px;
}

.card-padding-lg {
  padding: 32px;
}

.card-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
}
</style>
