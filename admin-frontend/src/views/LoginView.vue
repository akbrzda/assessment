<template>
  <div class="login-wrapper">
    <Card class="login-card" padding="lg">
      <header class="login-header">
        <div class="login-icon">
          <Icon name="user-lock" size="54" />
        </div>
        <h1>Админ-панель</h1>
        <p>Войдите, используя учетные данные суперадмина</p>
      </header>

      <form @submit.prevent="handleLogin" class="login-form">
        <Input v-model="login" type="text" label="Логин" placeholder="admin@example" required />

        <Input v-model="password" type="password" label="Пароль" placeholder="Введите пароль" required />

        <Button type="submit" variant="primary" :disabled="loading" :loading="loading" fullWidth>
          {{ loading ? "Вход..." : "Войти" }}
        </Button>

        <div v-if="error" class="form-error">
          {{ error }}
        </div>
      </form>
    </Card>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import Card from "../components/ui/Card.vue";
import Input from "../components/ui/Input.vue";
import Button from "../components/ui/Button.vue";
import Icon from "../components/ui/Icon.vue";

const router = useRouter();
const authStore = useAuthStore();

const login = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

const handleLogin = async () => {
  loading.value = true;
  error.value = "";

  const success = await authStore.login({
    login: login.value,
    password: password.value,
  });

  loading.value = false;

  if (success) {
    router.push("/dashboard");
  } else {
    error.value = "Неверный логин или пароль";
  }
};
</script>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  padding: 32px;
}

:deep(.login-card) {
  width: 360px;
  max-width: 100%;
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.login-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 12px 0 6px;
}

.login-header p {
  color: var(--text-secondary);
  font-size: 14px;
}

.login-icon {
  color: var(--text-primary);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-error {
  color: var(--error, #ff3b30);
  text-align: center;
  font-size: 14px;
  padding: 12px;
  background: #ff3b301a;
  border-radius: 8px;
  margin-top: 8px;
}

@media (max-width: 480px) {
  :deep(.login-card) {
    width: 100%;
  }
}
</style>
