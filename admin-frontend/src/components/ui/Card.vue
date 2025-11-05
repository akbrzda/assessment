<template>
  <div class="card" :class="{ 'card-hoverable': hoverable }">
    <div v-if="title || $slots.header" class="card-header">
      <slot name="header">
        <h3 class="card-title">{{ title }}</h3>
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
defineProps({
  title: String,
  padding: {
    type: String,
    default: "md",
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.card-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.5;
}

.card-content {
  padding: 1.5rem;
}

.card-padding-none {
  padding: 0;
}

.card-padding-sm {
  padding: 0.75rem;
}

.card-padding-md {
  padding: 1.5rem;
}

.card-padding-lg {
  padding: 2rem;
}

.card-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
}
</style>
