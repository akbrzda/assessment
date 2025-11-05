<template>
  <div class="form-container">
    <Input
      v-model="localData.firstName"
      label="Имя"
      placeholder="Введите имя"
      required
      :error="errors.firstName"
      @blur="validateFieldAndUpdate('firstName')"
    />

    <Input
      v-model="localData.lastName"
      label="Фамилия"
      placeholder="Введите фамилию"
      required
      :error="errors.lastName"
      @blur="validateFieldAndUpdate('lastName')"
    />

    <Select
      v-model.number="localData.branchId"
      label="Филиал"
      :options="branchOptions"
      placeholder="Выберите филиал"
      required
      :error="errors.branchId"
      @blur="validateFieldAndUpdate('branchId')"
    />

    <Select
      v-model.number="localData.positionId"
      label="Должность"
      :options="positionOptions"
      placeholder="Выберите должность"
      required
      :error="errors.positionId"
      @blur="validateFieldAndUpdate('positionId')"
    />

    <Select
      v-model.number="localData.roleId"
      label="Роль"
      :options="roleOptions"
      placeholder="Выберите роль"
      required
      :error="errors.roleId"
      @blur="validateFieldAndUpdate('roleId')"
    />

    <Input
      v-model="localData.login"
      :label="isEdit ? 'Логин' : 'Логин (опционально)'"
      placeholder="Логин для входа в админ-панель"
      :hint="isEdit ? 'Оставьте пустым, чтобы не менять логин' : undefined"
      :error="errors.login"
      @blur="validateFieldAndUpdate('login')"
    />

    <Input
      v-if="!isEdit"
      v-model="localData.password"
      type="password"
      label="Пароль (опционально)"
      placeholder="Пароль для входа"
      hint="Если не указан, пользователь сможет войти только через Telegram"
      :error="errors.password"
      @blur="validateFieldAndUpdate('password')"
    />
  </div>
</template>

<script setup>
import { watch, ref, computed } from "vue";
import Input from "./ui/Input.vue";
import Select from "./ui/Select.vue";
import { useFormValidation } from "../composables/useFormValidation";

const props = defineProps({
  modelValue: Object,
  references: Object,
  isEdit: Boolean,
});

const emit = defineEmits(["update:modelValue"]);

const localData = ref({ ...props.modelValue });
const { errors, validateField, clearFieldError } = useFormValidation();

const validationSchema = {
  firstName: ["required", { min: 2 }, { max: 50 }],
  lastName: ["required", { min: 2 }, { max: 50 }],
  branchId: ["required"],
  positionId: ["required"],
  roleId: ["required"],
  login: [
    {
      custom: (value) => {
        if (value && value.length < 3) {
          return "Логин должен содержать не менее 3 символов";
        }
        if (value && !/^[a-zA-Z0-9_-]+$/.test(value)) {
          return "Логин может содержать только буквы, цифры, подчеркивание и дефис";
        }
        return null;
      },
    },
  ],
  password: [
    {
      custom: (value) => {
        if (value && value.length < 6) {
          return "Пароль должен содержать не менее 6 символов";
        }
        return null;
      },
    },
  ],
};

const validateFieldAndUpdate = (fieldName) => {
  const value = localData.value[fieldName];
  const rules = validationSchema[fieldName] || [];

  let hasError = false;
  for (const rule of rules) {
    let error = null;

    if (typeof rule === "string") {
      if (rule === "required") {
        error = validateField(value, ["required"], fieldName);
      }
    } else if (rule.custom) {
      error = rule.custom(value);
    } else if (rule.min) {
      error = validateField(value, ["minLength", rule.min], fieldName);
    } else if (rule.max) {
      error = validateField(value, ["maxLength", rule.max], fieldName);
    }

    if (error) {
      errors.value[fieldName] = error;
      hasError = true;
      break;
    }
  }

  if (!hasError) {
    clearFieldError(fieldName);
  }
};

const branchOptions = computed(() => [
  { value: "", label: "Выберите филиал" },
  ...(props.references?.branches || []).map((branch) => ({
    value: branch.id,
    label: branch.name,
  })),
]);

const positionOptions = computed(() => [
  { value: "", label: "Выберите должность" },
  ...(props.references?.positions || []).map((position) => ({
    value: position.id,
    label: position.name,
  })),
]);

const roleOptions = computed(() => [
  { value: "", label: "Выберите роль" },
  ...(props.references?.roles || []).map((role) => ({
    value: role.id,
    label: role.name,
  })),
]);

watch(
  localData,
  (newValue) => {
    emit("update:modelValue", newValue);
  },
  { deep: true }
);

watch(
  () => props.modelValue,
  (newValue) => {
    localData.value = { ...newValue };
  },
  { deep: true }
);
</script>

<style scoped>
.form-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
