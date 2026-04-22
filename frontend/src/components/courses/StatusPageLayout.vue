<template>
  <div class="status-page card card-large">
    <div class="status-page__icon" :class="`tone-${tone}`">{{ icon }}</div>
    <h1 class="title-large mb-8">{{ title }}</h1>
    <p class="body-medium text-secondary mb-20">{{ description }}</p>

    <button class="btn btn-primary btn-full mb-8" type="button" @click="$emit('primary')">
      {{ primaryLabel }}
    </button>

    <button v-if="secondaryLabel" class="btn btn-secondary btn-full" type="button" @click="$emit('secondary')">
      {{ secondaryLabel }}
    </button>
  </div>
</template>

<script>
export default {
  name: "StatusPageLayout",
  emits: ["primary", "secondary"],
  props: {
    icon: {
      type: String,
      default: "•",
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    primaryLabel: {
      type: String,
      required: true,
    },
    secondaryLabel: {
      type: String,
      default: "",
    },
    tone: {
      type: String,
      default: "info",
    },
  },
};
</script>

<style scoped>
.status-page {
  text-align: center;
  margin-top: 20px;
}

.status-page__icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 12px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-weight: 700;
}

.status-page__icon.tone-info {
  background: rgba(59, 130, 246, 0.14);
  color: #2563eb;
}

.status-page__icon.tone-success {
  background: rgba(34, 197, 94, 0.14);
  color: #15803d;
}

.status-page__icon.tone-warning {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.status-page__icon.tone-danger {
  background: rgba(239, 68, 68, 0.14);
  color: #b91c1c;
}
</style>
