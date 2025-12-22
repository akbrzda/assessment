<template>
  <Modal :show="isOpen" title="Назначить управляющего" size="md" @close="handleClose">
    <Preloader v-if="loading" />
    <div v-else class="assign-manager-content">
      <!-- Выбор управляющего -->
      <Select v-model.number="selectedManager" label="Управляющий" :options="managerOptions" placeholder="Выберите управляющего" required />

      <!-- Выбор филиалов -->
      <div class="checkbox-group">
        <label class="group-title">Филиалы</label>
        <div class="checkbox-container">
          <label v-for="option in branchOptions" :key="option.value" class="checkbox-item">
            <input
              type="checkbox"
              :value="option.value"
              :checked="selectedBranches.includes(option.value)"
              @change="handleBranchToggle(option.value, $event.target.checked)"
            />
            <span>{{ option.label }}</span>
          </label>
        </div>
      </div>
      <div v-if="selectedBranches.length > 0" class="selected-count">Выбрано: {{ selectedBranches.length }}</div>

      <!-- Кнопка выбрать все / снять все -->
      <Button variant="secondary" @click="toggleAll" fullWidth>
        {{ selectedBranches.length === branches.length ? "Снять все" : "Выбрать все" }}
      </Button>
    </div>

    <template #footer>
      <Button @click="handleClose" variant="secondary">Отмена</Button>
      <Button @click="handleSubmit" :disabled="!selectedManager || selectedBranches.length === 0" variant="primary">Назначить</Button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, watch, onMounted, computed } from "vue";
import { getBranches, getManagers, assignManagerToBranches } from "../api/branches";
import Modal from "./ui/Modal.vue";
import Preloader from "./ui/Preloader.vue";
import Select from "./ui/Select.vue";
import Button from "./ui/Button.vue";
import { useToast } from "../composables/useToast";
import { formatBranchLabel } from "../utils/branch";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue", "close", "assigned"]);

const isOpen = ref(props.modelValue);
const loading = ref(false);
const managers = ref([]);
const branches = ref([]);
const selectedManager = ref(null);
const selectedBranches = ref([]);
const { showToast } = useToast();

const managerOptions = computed(() => [
  { value: null, label: "Выберите управляющего" },
  ...managers.value.map((manager) => ({
    value: manager.id,
    label: `${manager.first_name} ${manager.last_name} (${manager.role === "superadmin" ? "Суперадмин" : "Управляющий"})${
      manager.branches_count > 0 ? ` - ${manager.branches_count} филиалов` : ""
    }`,
  })),
]);

const branchOptions = computed(() =>
  branches.value.map((branch) => ({
    value: branch.id,
    label: formatBranchLabel(branch),
  }))
);

watch(
  () => props.modelValue,
  (newVal) => {
    isOpen.value = newVal;
    if (newVal) {
      loadData();
    }
  }
);

watch(isOpen, (newVal) => {
  emit("update:modelValue", newVal);
});

const loadData = async () => {
  loading.value = true;
  try {
    const [managersData, branchesData] = await Promise.all([getManagers(), getBranches()]);
    managers.value = managersData.managers;
    branches.value = branchesData.branches;
  } catch (error) {
    console.error("Load data error:", error);
    showToast("Ошибка загрузки данных", "error");
  } finally {
    loading.value = false;
  }
};

const toggleAll = () => {
  if (selectedBranches.value.length === branches.value.length) {
    selectedBranches.value = [];
  } else {
    selectedBranches.value = branches.value.map((b) => b.id);
  }
};

const handleBranchToggle = (branchId, checked) => {
  const id = Number(branchId);

  if (checked) {
    if (!selectedBranches.value.includes(id)) {
      selectedBranches.value = [...selectedBranches.value, id];
    }
  } else {
    selectedBranches.value = selectedBranches.value.filter((value) => value !== id);
  }
};

const handleSubmit = async () => {
  if (!selectedManager.value || selectedBranches.value.length === 0) {
    showToast("Выберите управляющего и хотя бы один филиал", "warning");
    return;
  }

  loading.value = true;
  try {
    await assignManagerToBranches(selectedManager.value, selectedBranches.value);
    showToast("Управляющий успешно назначен", "success");
    emit("assigned");
    handleClose();
  } catch (error) {
    console.error("Assign manager error:", error);
    const errorMessage = error.response?.data?.error || "Ошибка назначения управляющего";
    showToast(errorMessage, "error");
  } finally {
    loading.value = false;
  }
};

const handleClose = () => {
  isOpen.value = false;
  selectedManager.value = null;
  selectedBranches.value = [];
  emit("update:modelValue", false);
  emit("close");
};

onMounted(() => {
  if (props.modelValue) {
    loadData();
  }
});
</script>

<style scoped>
.assign-manager-content {
  max-height: 60vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.selected-count {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: -8px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.checkbox-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-primary);
}

.checkbox-item input {
  width: 16px;
  height: 16px;
  accent-color: var(--accent-blue);
}
</style>
