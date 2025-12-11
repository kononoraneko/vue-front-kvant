<template>
  <div class="profile-page">
    <div class="page-header">
      <div>
        <h2>Профиль</h2>
        <p class="subtitle">Управление данными и ролью</p>
      </div>
    </div>

    <div class="grid">
      <section class="card">
        <div class="card-header">
          <h3>Мои данные</h3>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="label">ID</span>
            <span class="value">{{ profile?.id }}</span>
          </div>
          <div class="info-row">
            <span class="label">Роль</span>
            <span class="badge" :class="profile?.role === 'Teacher' ? 'badge-teacher' : 'badge-student'">
              {{ profile?.role || 'Student' }}
            </span>
          </div>
          <div class="form-row">
            <label for="name">Имя</label>
            <input
              id="name"
              v-model="newName"
              type="text"
              class="input"
              placeholder="Ваше имя"
            >
          </div>
          <div class="actions">
            <button
              type="button"
              class="btn-primary"
              :disabled="savingName || !newName.trim()"
              @click="saveName"
            >
              {{ savingName ? 'Сохранение...' : 'Сохранить имя' }}
            </button>
            <span v-if="nameSaved" class="success-text">Сохранено</span>
          </div>
        </div>
      </section>

      <section v-if="isAdmin" class="card">
        <div class="card-header">
          <h3>Назначить преподавателя</h3>
          <p class="hint">Доступно только для администраторов</p>
        </div>
        <div class="card-body">
          <div class="filters">
            <input
              v-model="search"
              type="text"
              class="input"
              placeholder="Поиск по имени или логину"
              @keyup.enter="loadUsers(1)"
            >
            <select v-model="roleFilter" class="input select" @change="loadUsers(1)">
              <option value="">Все роли</option>
              <option value="Student">Только студенты</option>
              <option value="Teacher">Только преподаватели</option>
            </select>
            <button
              type="button"
              class="btn-secondary"
              :disabled="loadingUsers"
              @click="loadUsers(1)"
            >
              {{ loadingUsers ? 'Загрузка...' : 'Найти' }}
            </button>
          </div>

          <div v-if="users.length === 0" class="empty">
            Ничего не найдено
          </div>
          <table v-else class="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Имя</th>
                <th>Роль</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.id">
                <td>{{ u.id }}</td>
                <td>{{ u.name }}</td>
                <td>
                  <span class="badge" :class="u.role === 'Teacher' ? 'badge-teacher' : 'badge-student'">
                    {{ u.role || 'Student' }}
                  </span>
                </td>
                <td class="actions-cell">
                  <button
                    v-if="u.role !== 'Teacher'"
                    type="button"
                    class="btn-primary small"
                    :disabled="u.id === profile?.id || makingTeacher === u.id"
                    @click="assignTeacher(u.id)"
                  >
                    <span v-if="makingTeacher === u.id">...</span>
                    <span v-else>Назначить</span>
                  </button>
                  <button
                    v-else
                    type="button"
                    class="btn-danger small"
                    :disabled="u.id === profile?.id || makingTeacher === u.id"
                    @click="revokeTeacher(u.id)"
                  >
                    <span v-if="makingTeacher === u.id">...</span>
                    <span v-else>Разжаловать</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="totalUsers > pageSize" class="pagination">
            <button
              type="button"
              class="page-btn"
              :disabled="page <= 1 || loadingUsers"
              @click="goPage(-1)"
            >
              ←
            </button>
            <span class="page-info">
              Страница {{ page }} / {{ totalPages }}
            </span>
            <button
              type="button"
              class="page-btn"
              :disabled="page >= totalPages || loadingUsers"
              @click="goPage(1)"
            >
              →
            </button>
          </div>
        </div>
      </section>
    </div>

    <div v-if="errorMessage" class="alert error">{{ errorMessage }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useApi } from '../composables/useApi'

const { profile, isAdmin, token, loadProfile } = useAuth()
const { apiJson, error, setError } = useApi()

const newName = ref('')
const savingName = ref(false)
const nameSaved = ref(false)

const search = ref('')
const roleFilter = ref('Student')
const users = ref([])
const totalUsers = ref(0)
const page = ref(1)
const pageSize = 10
const loadingUsers = ref(false)
const makingTeacher = ref(null)
const confirmMessage = (text) => window.confirm(text)

const errorMessage = computed(() => error.value)
const totalPages = computed(() => Math.max(1, Math.ceil(totalUsers.value / pageSize)))

onMounted(async () => {
  await ensureProfile()
  newName.value = profile.value?.name || ''
  if (isAdmin.value) {
    await loadUsers(1)
  }
})

async function ensureProfile() {
  if (!profile.value) {
    await loadProfile()
  }
}

async function saveName() {
  if (!newName.value.trim()) return
  savingName.value = true
  nameSaved.value = false
  setError('')
  try {
    await apiJson(
      '/profile/name',
      {
        method: 'PUT',
        body: JSON.stringify({ name: newName.value.trim() })
      },
      token.value
    )
    await loadProfile()
    nameSaved.value = true
  } catch (e) {
    setError(e.message || 'Не удалось сохранить имя')
  } finally {
    savingName.value = false
  }
}

async function loadUsers(targetPage = 1) {
  if (!isAdmin.value) return
  loadingUsers.value = true
  setError('')
  try {
    const params = new URLSearchParams()
    params.append('page', String(targetPage))
    params.append('page_size', String(pageSize))
    if (search.value) params.append('search', search.value)
    if (roleFilter.value) params.append('role', roleFilter.value)

    const resp = await apiJson(`/profile/users?${params.toString()}`, {}, token.value)
    users.value = resp.items || []
    totalUsers.value = resp.total ?? users.value.length
    page.value = resp.page ?? targetPage
  } catch (e) {
    setError(e.message || 'Ошибка загрузки пользователей')
  } finally {
    loadingUsers.value = false
  }
}

async function assignTeacher(userId) {
  if (!confirmMessage('Назначить этого пользователя преподавателем?')) return
  makingTeacher.value = userId
  setError('')
  try {
    await apiJson(`/profile/users/${userId}/make-teacher`, { method: 'POST' }, token.value)
    await loadUsers(page.value)
  } catch (e) {
    setError(e.message || 'Не удалось назначить преподавателя')
  } finally {
    makingTeacher.value = null
  }
}

async function revokeTeacher(userId) {
  if (!confirmMessage('Снять роль преподавателя с этого пользователя?')) return
  makingTeacher.value = userId
  setError('')
  try {
    await apiJson(`/profile/users/${userId}/revoke-teacher`, { method: 'POST' }, token.value)
    await loadUsers(page.value)
  } catch (e) {
    setError(e.message || 'Не удалось изменить роль')
  } finally {
    makingTeacher.value = null
  }
}

async function goPage(delta) {
  const next = Math.min(Math.max(1, page.value + delta), totalPages.value)
  if (next !== page.value) {
    await loadUsers(next)
  }
}
</script>

<style scoped>
.profile-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.subtitle {
  margin: 4px 0 0;
  color: #6b7280;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
}

.hint {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.card-body {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row, .form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  color: #6b7280;
  font-size: 13px;
}

.value {
  font-weight: 600;
  color: #111827;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.badge-teacher {
  background: #e0f2fe;
  color: #1d4ed8;
}

.badge-student {
  background: #f3f4f6;
  color: #374151;
}

.input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
}

.select {
  min-width: 160px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-primary {
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary.small {
  padding: 6px 10px;
  font-size: 13px;
}

.btn-secondary {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover:not(:disabled) {
  background: #f3f4f6;
}

.btn-danger {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #ef4444;
  background: #ef4444;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
  border-color: #dc2626;
}

.filters {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th,
.users-table td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid #e5e7eb;
}

.actions-cell {
  text-align: right;
}

.empty {
  padding: 16px;
  text-align: center;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
}

.pagination {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-btn {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: #fff;
  cursor: pointer;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: #4b5563;
  font-weight: 600;
}

.alert.error {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.success-text {
  color: #16a34a;
  font-weight: 600;
}
</style>

