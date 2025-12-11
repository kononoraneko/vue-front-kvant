<template>
  <div class="courses-page">
    <div class="page-header">
      <h2>Мои курсы</h2>
      <div class="header-actions">
        <router-link
          v-if="isTeacher"
          to="/courses/create"
          class="btn-create-course"
        >
          + Создать новый курс
        </router-link>
      </div>
    </div>

    <div v-if="loading && !profile" class="loading">
      Загрузка курсов...
    </div>

    <div v-else-if="error" class="alert error">
      {{ error }}
    </div>

    <div v-else class="courses-content">
      <section class="courses-section">
        <h3>Доступные курсы</h3>
        <div v-if="!studentCourses.length" class="empty">
          У вас пока нет доступных курсов
        </div>
        <div v-else class="courses-grid">
          <CourseCard
            v-for="course in pagedStudentCourses"
            :key="'s-' + course.id"
            :course="course"
            @click="openCourse(course)"
          />
        </div>
        <div
          v-if="studentTotalPages > 1"
          class="pagination"
        >
          <button
            type="button"
            class="page-btn"
            :disabled="studentPage <= 1"
            @click="goStudentPage(-1)"
          >
            ←
          </button>
          <span class="page-info">
            Страница {{ studentPage }} / {{ studentTotalPages }}
          </span>
          <button
            type="button"
            class="page-btn"
            :disabled="studentPage >= studentTotalPages"
            @click="goStudentPage(1)"
          >
            →
          </button>
        </div>
      </section>

      <section class="courses-section" v-if="isTeacher">
        <h3>Созданные мной</h3>
        <div v-if="!createdCourses.length" class="empty">
          Вы еще не создали курсов
        </div>
        <div v-else class="courses-grid">
          <CourseCard
            v-for="course in pagedCreatedCourses"
            :key="'c-' + course.id"
            :course="course"
            :show-edit="true"
            :is-creator="true"
            @click="openCourse(course)"
            @edit="editCourse(course)"
          />
        </div>
        <div
          v-if="createdTotalPages > 1"
          class="pagination"
        >
          <button
            type="button"
            class="page-btn"
            :disabled="createdPage <= 1"
            @click="goCreatedPage(-1)"
          >
            ←
          </button>
          <span class="page-info">
            Страница {{ createdPage }} / {{ createdTotalPages }}
          </span>
          <button
            type="button"
            class="page-btn"
            :disabled="createdPage >= createdTotalPages"
            @click="goCreatedPage(1)"
          >
            →
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onActivated, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useApi } from '../composables/useApi'
import CourseCard from '../components/CourseCard.vue'

const router = useRouter()
const { profile, isTeacher, loadProfile, loading: authLoading } = useAuth()
const { error, loading: apiLoading } = useApi()

const loading = computed(() => authLoading.value || apiLoading.value)
const pageSize = 8
const studentPage = ref(1)
const createdPage = ref(1)

const studentCourses = computed(() => (profile.value?.enrolled_courses) || [])
const createdCourses = computed(() => (profile.value?.created_courses) || [])

const studentTotalPages = computed(() => Math.max(1, Math.ceil(studentCourses.value.length / pageSize)))
const createdTotalPages = computed(() => Math.max(1, Math.ceil(createdCourses.value.length / pageSize)))

const pagedStudentCourses = computed(() => {
  const start = (studentPage.value - 1) * pageSize
  return studentCourses.value.slice(start, start + pageSize)
})

const pagedCreatedCourses = computed(() => {
  const start = (createdPage.value - 1) * pageSize
  return createdCourses.value.slice(start, start + pageSize)
})

async function openCourse(course) {
  if (!course?.id) return
  router.push(`/courses/${course.id}`)
}

function editCourse(course) {
  if (!course?.id) return
  router.push(`/courses/${course.id}/edit`)
}

function goStudentPage(delta) {
  studentPage.value = Math.min(Math.max(1, studentPage.value + delta), studentTotalPages.value)
}

function goCreatedPage(delta) {
  createdPage.value = Math.min(Math.max(1, createdPage.value + delta), createdTotalPages.value)
}

onMounted(async () => {
  await loadProfile()
})

// Обновляем профиль при возврате на страницу (для keep-alive)
onActivated(async () => {
  await loadProfile()
})

watch(studentCourses, () => { studentPage.value = 1 })
watch(createdCourses, () => { createdPage.value = 1 })
</script>

<style scoped>
.courses-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.page-header h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #1f2328;
}

.loading {
  text-align: center;
  padding: 48px;
  color: #6b7280;
}

.alert {
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 24px;
}

.alert.error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.courses-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.courses-section h3 {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 600;
  color: #1f2328;
}

.courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.empty {
  padding: 48px;
  text-align: center;
  color: #9ca3af;
  font-style: italic;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
}

.btn-create-course {
  padding: 12px 24px;
  border-radius: 8px;
  background: #2563eb;
  color: white;
  text-decoration: none;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-create-course:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.pagination {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-btn {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
}

.page-btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: #4b5563;
  font-weight: 600;
}
</style>

