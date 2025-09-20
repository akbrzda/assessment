<template>
<div class="avatar" :style="avatarStyle">
    <img v-if="avatarUrl" :src="avatarUrl" class="avatar__image" alt="avatar" />
    <span v-else class="avatar__initials">{{ initials }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  avatarUrl: {
    type: String,
    default: null
  },
  firstName: {
    type: String,
    default: ''
  },
  lastName: {
    type: String,
    default: ''
  },
  size: {
    type: Number,
    default: 40
  }
});

const initials = computed(() => {
  const first = props.firstName?.charAt(0) || '';
  const last = props.lastName?.charAt(0) || '';
  const value = `${first}${last}`.trim();
  return value.toUpperCase() || 'NA';
});

const avatarStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`
}));
</script>

<style scoped>
.avatar {
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.16), rgba(10, 132, 255, 0.36));
  display: inline-flex;
  justify-content: center;
  align-items: center;
  color: #ffffff;
  font-weight: 600;
  font-size: 16px;
}

.avatar__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar__initials {
  letter-spacing: 0.5px;
}
</style>
