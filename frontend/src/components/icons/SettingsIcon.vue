<template>
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
    <path
      d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z
           M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33
           1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51
           1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82
           1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09c.7 0 1.31-.4 1.51-1
           a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06c.5.5 1.2.65 1.82.33
           .64-.32 1-1 1-1.71V3a2 2 0 1 1 4 0v.09c0 .7.36 1.39 1 1.71.62.32 1.32.17 1.82-.33l.06-.06
           a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82c.2.6.81 1 1.51 1H21a2 2 0 0 1 0 4h-.09
           c-.7 0-1.31.4-1.51 1Z"
    />
  </svg>
</template>

<script>
export default {
  name: "SettingsIcon",
};
</script>

<style scoped>
svg {
  transition: all 0.2s ease;
}

svg:hover {
  transform: rotate(30deg) scale(1.1);
}
</style>
