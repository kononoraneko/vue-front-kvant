<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <h1>CodeCourses</h1>
        <p>Войдите или зарегистрируйтесь для доступа к курсам</p>
      </div>

      <div v-if="error" class="alert error">
        {{ error }}
      </div>

      <div class="login-tabs">
        <button
          type="button"
          :class="['tab', mode === 'login' && 'active']"
          @click="mode = 'login'"
        >
          Вход
        </button>
        <button
          type="button"
          :class="['tab', mode === 'register' && 'active']"
          @click="mode = 'register'"
        >
          Регистрация
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="login-form">
        <label>
          Логин
          <input
            v-model="form.login"
            type="text"
            placeholder="user1"
            required
            autocomplete="username"
          >
        </label>
        <label>
          Пароль
          <input
            v-model="form.password"
            type="password"
            placeholder="••••••••"
            required
            autocomplete="current-password"
          >
        </label>
        <label v-if="mode === 'register'">
          Имя
          <input
            v-model="form.name"
            type="text"
            placeholder="Иван Иванов"
            required
            autocomplete="name"
          >
        </label>
        <button type="submit" :disabled="loading" class="btn-primary">
          {{ loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useApi } from '../composables/useApi'

const { login, register, loading } = useAuth()
const { error, setError } = useApi()

const mode = ref('login')
const form = reactive({
  login: '',
  password: '',
  name: ''
})

async function handleSubmit() {
  setError('')
  if (mode.value === 'login') {
    await login(form.login, form.password)
  } else {
    await register(form.login, form.password, form.name)
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px;
}

.login-container {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 24px;
}

.login-header h1 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: #1f2328;
}

.login-header p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.alert {
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
}

.alert.error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.login-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: #f3f4f6;
  padding: 4px;
  border-radius: 8px;
}

.tab {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.tab.active {
  background: white;
  color: #2563eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-form label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2328;
}

.login-form input {
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
}

.login-form input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.btn-primary {
  padding: 12px;
  border: none;
  border-radius: 6px;
  background: #2563eb;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

