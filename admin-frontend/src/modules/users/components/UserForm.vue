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

    <Input
      v-if="isEdit"
      v-model="localData.phone"
      label="Номер телефона"
      placeholder="+7 (999) 000-00-00"
      required
      :error="errors.phone"
      @blur="validateFieldAndUpdate('phone')"
      @input="handlePhoneInput"
    />

    <Select
      v-model.number="localData.branchId"
      label="Филиал"
      :options="branchOptions"
      placeholder="Выберите филиал"
      required
      :error="errors.branchId"
      :disabled="isManager && isEdit"
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
      :label="props.adminOnly ? 'Роль в панели управления' : 'Роль'"
      :options="roleOptions"
      placeholder="Выберите роль"
      required
      :error="errors.roleId"
      :disabled="isManager"
      @blur="validateFieldAndUpdate('roleId')"
    />

    <Input
      v-if="!shouldHideCredentialsFields"
      v-model="localData.login"
      :label="isEdit ? 'Логин' : 'Логин (опционально)'"
      placeholder="Логин для входа в админ-панель"
      :hint="isEdit ? 'Оставьте пустым, чтобы не менять логин' : undefined"
      :error="errors.login"
      :disabled="isManager && isEdit && localData.id !== undefined && props.currentUserId !== localData.id"
      @blur="validateFieldAndUpdate('login')"
    />

    <Input
      v-if="!isEdit && !shouldHideCredentialsFields"
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
import { watch, ref, computed, nextTick } from "vue";
import Input from "@/components/ui/Input.vue";
import Select from "@/components/ui/Select.vue";
import { useFormValidation } from "@/composables/useFormValidation";
import { formatBranchLabel } from "@/utils/branch";
import { formatPhoneMask } from "@/utils/phone";

const props = defineProps({
  modelValue: Object,
  references: Object,
  isEdit: Boolean,
  isManager: Boolean,
  currentUserId: Number,
  currentUserRole: {
    type: String,
    default: "",
  },
  adminOnly: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue"]);

const localData = ref({ ...props.modelValue });
const { errors, validateField, clearFieldError } = useFormValidation();
const isSyncing = ref(false);

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
  phone: [
    {
      custom: (value) => {
        if (props.isEdit && (!value || !String(value).trim())) {
          return "Укажите номер телефона";
        }

        if (!value) {
          return null;
        }

        const digits = String(value).replace(/\D/g, "");
        if (digits.length !== 11) {
          return "Введите номер полностью: +7 (999) 000-00-00";
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

const handlePhoneInput = () => {
  const formatted = formatPhoneMask(localData.value.phone);
  if (formatted !== localData.value.phone) {
    localData.value.phone = formatted;
  }
  validateFieldAndUpdate("phone");
};

const branchOptions = computed(() => [
  { value: "", label: "Выберите филиал" },
  ...(props.references?.branches || []).map((branch) => ({
    value: branch.id,
    label: formatBranchLabel(branch),
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
  ...(props.references?.roles || [])
    .filter((role) => !props.adminOnly || role.name !== "employee")
    .map((role) => ({
      value: role.id,
      label: role.name,
    })),
]);

const isSelfEdit = computed(() => props.isEdit && Number(localData.value.id) > 0 && Number(props.currentUserId) === Number(localData.value.id));

const targetRoleName = computed(() => {
  const roleId = Number(localData.value.roleId);
  if (!roleId) {
    return "";
  }
  const role = (props.references?.roles || []).find((item) => Number(item.id) === roleId);
  return String(role?.name || "").toLowerCase();
});

const shouldHideCredentialsFields = computed(() => {
  const actorRole = String(props.currentUserRole || "").toLowerCase();
  const isRestrictedActor = actorRole === "manager" || actorRole === "employee";
  const isRestrictedTarget = targetRoleName.value === "manager" || targetRoleName.value === "employee";
  return isRestrictedActor && isRestrictedTarget && !isSelfEdit.value;
});

watch(
  localData,
  (newValue) => {
    if (isSyncing.value) return;
    emit("update:modelValue", { ...newValue });
  },
  { deep: true },
);

watch(
  () => props.modelValue,
  (newValue) => {
    if (!newValue) {
      localData.value = {};
      return;
    }
    isSyncing.value = true;
    localData.value = { ...newValue };
    nextTick(() => {
      isSyncing.value = false;
    });
  },
  { deep: true, immediate: true },
);
</script>

<style scoped>
.form-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
