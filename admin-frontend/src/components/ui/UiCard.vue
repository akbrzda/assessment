<template>
  <div :class="cardClasses">
    <div v-if="$slots.header || title" class="ui-card-header">
      <slot name="header">
        <h3 v-if="title" class="ui-card-title">{{ title }}</h3>
      </slot>
    </div>

    <div class="ui-card-body" :class="{ 'ui-card-body-no-padding': noPadding }">
      <slot></slot>
    </div>

    <div v-if="$slots.footer" class="ui-card-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  title: String,
  noPadding: Boolean,
  hoverable: Boolean,
  bordered: {
    type: Boolean,
    default: true,
  },
  shadow: {
    type: Boolean,
    default: true,
  },
});

const cardClasses = computed(() => {
  const classes = ["ui-card"];

  if (props.hoverable) classes.push("ui-card-hoverable");
  if (props.bordered) classes.push("ui-card-bordered");
  if (props.shadow) classes.push("ui-card-shadow");

  return classes.join(" ");
});
</script>

<style scoped>
.ui-card {
  background-color: var(--surface-card);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.ui-card-bordered {
  border: 1px solid var(--divider);
}

.ui-card-shadow {
  box-shadow: var(--card-shadow);
}

.ui-card-hoverable {
  cursor: pointer;
}

.ui-card-hoverable:hover {
  box-shadow: var(--card-shadow-hover);
}

.ui-card-header {
  padding: 1.25rem;
  border-bottom: 1px solid var(--divider);
}

.ui-card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.ui-card-body {
  padding: 1.25rem;
}

.ui-card-body-no-padding {
  padding: 0;
}

.ui-card-footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--divider);
  background-color: var(--bg-secondary);
}

@media (max-width: 640px) {
  .ui-card-header,
  .ui-card-body {
    padding: 1rem;
  }

  .ui-card-footer {
    padding: 0.75rem 1rem;
  }
}
</style>
