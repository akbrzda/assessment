<template>
  <button class="lock-badge" type="button" :disabled="disabled" @click="$emit('click')">
    <span class="lock-dot"></span>
    {{ text }}
  </button>
</template>

<script>
export default {
  name: "LockBadge",
  emits: ["click"],
  props: {
    text: {
      type: String,
      default: "Заблокировано",
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style scoped>
.lock-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(245, 158, 11, 0.38);
  border-radius: 999px;
  padding: 4px 10px;
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;
  font-size: 12px;
  font-weight: 600;
}

.lock-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #d97706;
}
</style>
