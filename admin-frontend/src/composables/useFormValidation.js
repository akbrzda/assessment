import { ref, computed } from "vue";

export function useFormValidation() {
  const errors = ref({});

  const validators = {
    required: (value, fieldName) => {
      if (!value || (typeof value === "string" && !value.trim())) {
        return `${fieldName} обязательно`;
      }
      return null;
    },

    email: (value, fieldName) => {
      if (!value) return null;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return `${fieldName} должно быть корректным email`;
      }
      return null;
    },

    minLength: (min) => (value, fieldName) => {
      if (!value || value.length < min) {
        return `${fieldName} должно содержать не менее ${min} символов`;
      }
      return null;
    },

    maxLength: (max) => (value, fieldName) => {
      if (value && value.length > max) {
        return `${fieldName} должно содержать не более ${max} символов`;
      }
      return null;
    },

    minValue: (min) => (value, fieldName) => {
      if (value !== "" && value !== null && Number(value) < min) {
        return `${fieldName} должно быть не менее ${min}`;
      }
      return null;
    },

    maxValue: (max) => (value, fieldName) => {
      if (value !== "" && value !== null && Number(value) > max) {
        return `${fieldName} должно быть не более ${max}`;
      }
      return null;
    },

    numeric: (value, fieldName) => {
      if (value && isNaN(Number(value))) {
        return `${fieldName} должно быть числом`;
      }
      return null;
    },

    phone: (value, fieldName) => {
      if (!value) return null;
      const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
      if (!phoneRegex.test(value)) {
        return `${fieldName} должно быть корректным номером телефона`;
      }
      return null;
    },

    url: (value, fieldName) => {
      if (!value) return null;
      try {
        new URL(value);
        return null;
      } catch {
        return `${fieldName} должно быть корректным URL`;
      }
    },
  };

  const validateField = (value, rules, fieldName) => {
    for (const rule of rules) {
      let validator;

      if (typeof rule === "string") {
        validator = validators[rule];
      } else if (typeof rule === "function") {
        validator = rule;
      } else {
        continue;
      }

      if (validator) {
        const error = validator(value, fieldName);
        if (error) {
          return error;
        }
      }
    }
    return null;
  };

  const validate = (formData, schema) => {
    const newErrors = {};
    let isValid = true;

    for (const [fieldName, rules] of Object.entries(schema)) {
      const value = formData[fieldName];
      const error = validateField(value, rules, fieldName);

      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    }

    errors.value = newErrors;
    return isValid;
  };

  const clearErrors = () => {
    errors.value = {};
  };

  const clearFieldError = (fieldName) => {
    delete errors.value[fieldName];
  };

  const hasError = computed(() => Object.keys(errors.value).length > 0);

  return {
    errors,
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    hasError,
    validators,
  };
}
