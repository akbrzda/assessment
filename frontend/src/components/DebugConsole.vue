<template>
  <div v-if="isErudaLoaded" class="debug-console-button">
    <button @click="toggleDebugConsole" class="btn-debug" title="Открыть консоль отладки">
      <span class="debug-icon">🔧</span>
    </button>
  </div>
</template>

<script setup>
import { useDebugConsole } from "../composables/useDebugConsole.js";

const { toggle, isErudaLoaded } = useDebugConsole();

function toggleDebugConsole() {
  toggle();
}
</script>

<style scoped>
.debug-console-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
}

.btn-debug {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #8b5cf6;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  font-size: 20px;
}

.btn-debug:hover {
  background-color: #7c3aed;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.btn-debug:active {
  transform: scale(0.95);
}

.debug-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
