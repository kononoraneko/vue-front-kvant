<template>
  <header class="header">
    <div class="header-content">
      <div class="header-left">
        <h1 class="logo" @click="$router.push('/courses')">CodeCourses</h1>
        <p class="subtitle">Платформа для изучения программирования</p>
      </div>
      <div class="header-right" v-if="isAuthenticated">
        <nav class="header-nav">
          <router-link to="/courses" class="nav-link">Курсы</router-link>
          <router-link v-if="isTeacher" to="/teacher" class="nav-link">Панель преподавателя</router-link>
          <router-link v-if="isTeacher" to="/courses/create" class="nav-link btn-create">+ Создать курс</router-link>
        </nav>
        <span class="user-name">{{ profile?.name }}</span>
        <span class="user-role">{{ profile?.role || 'Student' }}</span>
        <button type="button" class="btn-ghost" @click="handleLogout">
          Выйти
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useAuth } from '../composables/useAuth'

const { profile, isAuthenticated, isTeacher, logout } = useAuth()

function handleLogout() {
  logout()
}
</script>

<style scoped>
.header {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 16px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.logo {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #2563eb;
  cursor: pointer;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-nav {
  display: flex;
  gap: 8px;
  margin-right: 8px;
}

.nav-link {
  padding: 6px 12px;
  border-radius: 6px;
  text-decoration: none;
  font-size: 14px;
  color: #4b5563;
  transition: all 0.2s;
}

.nav-link:hover {
  background: #f3f4f6;
  color: #1f2328;
}

.nav-link.router-link-active {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 600;
}

.nav-link.btn-create {
  background: #2563eb;
  color: white;
}

.nav-link.btn-create:hover {
  background: #1d4ed8;
}

.nav-link.btn-create.router-link-active {
  background: #1d4ed8;
}

.user-name {
  font-weight: 600;
  color: #1f2328;
}

.user-role {
  padding: 4px 8px;
  border-radius: 999px;
  background: #eff3f6;
  font-size: 12px;
  color: #4b5563;
}

.btn-ghost {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: white;
  color: #4b5563;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-ghost:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}
</style>

