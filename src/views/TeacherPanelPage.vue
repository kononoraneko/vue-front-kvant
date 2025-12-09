<template>
  <div class="teacher-panel-page">
    <div class="page-header">
      <div>
        <h2>Панель преподавателя</h2>
        <p class="subtitle">Проверка решений учеников по всем курсам</p>
      </div>
      <div class="header-actions">
        <div class="header-stats">
          <div class="stat-item">
            <span class="stat-label">Требуют проверки:</span>
            <span class="stat-value pending-count">{{ pendingCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Всего ответов:</span>
            <span class="stat-value">{{ submissions.length }}</span>
          </div>
        </div>
        <button
          type="button"
          class="btn-primary"
          @click="showEnrollmentModal = true"
        >
          👥 Зачислить учеников
        </button>
      </div>
    </div>

    <div v-if="loading && !submissions.length" class="loading">
      Загрузка решений...
    </div>

    <div v-else-if="error" class="alert error">
      {{ error }}
    </div>

    <div v-else class="panel-content">
      <div v-if="submissions.length === 0" class="empty-state">
        <p>Нет отправленных решений для проверки</p>
      </div>

      <div v-else class="submissions-container">
        <!-- Фильтры -->
        <div class="filters">
          <div class="filter-group">
            <label class="filter-label">Быстрые фильтры:</label>
            <div class="filter-buttons">
              <button
                type="button"
                :class="['filter-btn', showOnlyPending && 'active']"
                @click="togglePendingFilter"
              >
                ⚠️ Требуют проверки ({{ pendingCount }})
              </button>
              <button
                type="button"
                :class="['filter-btn', showOnlyUnviewed && 'active']"
                @click="toggleUnviewedFilter"
              >
                👁️ Не просмотренные ({{ unviewedCount }})
              </button>
              <button
                type="button"
                :class="['filter-btn', showAll && 'active']"
                @click="showAllSubmissions"
              >
                📋 Все ответы
              </button>
            </div>
          </div>
          <div class="filter-group">
            <select v-model="selectedCourse" class="filter-select">
              <option :value="null">Все курсы</option>
              <option
                v-for="course in myCourses"
                :key="course.id"
                :value="course.id"
              >
                {{ course.title }}
              </option>
            </select>
            <select v-model="selectedStatus" class="filter-select">
              <option :value="null">Все статусы</option>
              <option value="not verified">На проверке</option>
              <option value="checked">Проверено</option>
              <option value="rated">Оценено</option>
            </select>
            <button
              type="button"
              class="btn-secondary"
              @click="loadSubmissions"
            >
              🔄 Обновить
            </button>
          </div>
        </div>

        <!-- Таблица решений -->
        <div class="submissions-table-wrapper">
          <table class="submissions-table">
            <thead>
              <tr>
                <th>Ученик</th>
                <th>Курс</th>
                <th>Лекция / Задача</th>
                <th>Ответ</th>
                <th>Статус</th>
                <th>Оценка</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="sub in filteredSubmissions"
                :key="sub.id"
                class="submission-row"
              >
                <td class="student-cell">
                  <strong>{{ sub.user_name || `Студент #${sub.user_id}` }}</strong>
                </td>
                <td class="course-cell">
                  {{ getCourseTitle(sub.course_id) }}
                </td>
                <td class="task-cell">
                  <div class="task-meta">
                    <span class="lecture-name">{{ sub.lecture_key }}</span>
                    <span class="task-name">{{ sub.task_key }}</span>
                  </div>
                </td>
                <td class="answer-cell">
                  <div class="answer-preview">
                    <template v-if="isJsonAnswer(sub.answer)">
                      <span
                        v-for="(option, idx) in parseJsonAnswer(sub.answer)"
                        :key="idx"
                        class="answer-option-badge"
                      >
                        {{ idx + 1 }}
                      </span>
                    </template>
                    <template v-else>
                      {{ truncateAnswer(sub.answer, 50) }}
                    </template>
                  </div>
                </td>
                <td class="status-cell">
                  <span class="badge" :class="getStatusClass(sub.status)">
                    {{ getStatusLabel(sub.status) }}
                  </span>
                  <span
                    v-if="sub.status === 'rated' && sub.teacher_comment === 'Автоматическая проверка'"
                    class="auto-badge"
                    title="Автоматически проверено, требует просмотра"
                  >
                    🤖 Авто
                  </span>
                </td>
                <td class="grade-cell">
                  <span
                    v-if="sub.grade !== null"
                    class="grade-badge"
                    :class="getGradeClass(sub.grade)"
                  >
                    {{ sub.grade }}/5
                  </span>
                  <span v-else class="grade-badge grade-neutral">—</span>
                </td>
                <td class="actions-cell">
                  <button
                    v-if="sub.status === 'not verified' || (sub.status === 'rated' && sub.teacher_comment === 'Автоматическая проверка')"
                    type="button"
                    class="btn-primary small"
                    @click="openReviewModal(sub)"
                  >
                    {{ sub.status === 'not verified' ? 'Проверить' : 'Просмотреть' }}
                  </button>
                  <button
                    v-else-if="sub.status === 'rated'"
                    type="button"
                    class="btn-secondary small"
                    @click="openReviewModal(sub)"
                  >
                    Просмотреть
                  </button>
                  <span v-else class="reviewed-badge">✓ Проверено</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Модальное окно для проверки -->
    <SubmissionsModal
      :is-open="reviewModalOpen"
      :submissions="[selectedSubmission].filter(Boolean)"
      :loading="false"
      @close="reviewModalOpen = false"
      @grade="handleGradeSubmission"
    />

    <!-- Модальное окно для зачисления учеников -->
    <div v-if="showEnrollmentModal" class="modal-overlay" @click.self="showEnrollmentModal = false">
      <div class="modal-content enrollment-modal">
        <div class="modal-header">
          <h3>Зачисление учеников на курсы</h3>
          <button type="button" class="modal-close" @click="showEnrollmentModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="enrollment-section">
            <label>
              Выберите курс:
              <select v-model="enrollmentCourseId" class="enrollment-select">
                <option :value="null">Выберите курс...</option>
                <option
                  v-for="course in myCourses"
                  :key="course.id"
                  :value="course.id"
                >
                  {{ course.title }}
                </option>
              </select>
            </label>
          </div>

          <div v-if="enrollmentCourseId" class="enrollment-section">
            <div class="enrollment-tabs">
              <button
                type="button"
                :class="['tab-btn', enrollmentTab === 'available' && 'active']"
                @click="enrollmentTab = 'available'"
              >
                Доступные ученики
              </button>
              <button
                type="button"
                :class="['tab-btn', enrollmentTab === 'enrolled' && 'active']"
                @click="enrollmentTab = 'enrolled'"
              >
                Зачисленные ({{ enrolledStudents.length }})
              </button>
            </div>

            <div v-if="enrollmentTab === 'available'" class="students-list">
              <div class="search-box">
                <input
                  v-model="studentSearch"
                  type="text"
                  placeholder="Поиск по имени..."
                  class="search-input"
                  @input="loadAvailableStudents"
                >
              </div>
              <div v-if="loadingStudents" class="loading-small">Загрузка...</div>
              <div v-else-if="availableStudents.length === 0" class="empty-small">
                Нет доступных учеников
              </div>
              <div v-else class="students-grid">
                <div
                  v-for="student in availableStudents"
                  :key="student.id"
                  class="student-card"
                >
                  <div class="student-info">
                    <strong>{{ student.name }}</strong>
                    <span class="student-id">ID: {{ student.id }}</span>
                  </div>
                  <button
                    type="button"
                    class="btn-primary small"
                    @click="enrollStudent(student.id)"
                  >
                    Зачислить
                  </button>
                </div>
              </div>
            </div>

            <div v-else class="students-list">
              <div v-if="loadingStudents" class="loading-small">Загрузка...</div>
              <div v-else-if="enrolledStudents.length === 0" class="empty-small">
                На этот курс еще никто не зачислен
              </div>
              <div v-else class="students-grid">
                <div
                  v-for="student in enrolledStudents"
                  :key="student.id"
                  class="student-card"
                >
                  <div class="student-info">
                    <strong>{{ student.name }}</strong>
                    <span class="student-id">ID: {{ student.id }}</span>
                  </div>
                  <button
                    type="button"
                    class="btn-danger small"
                    @click="unenrollStudent(student.id)"
                  >
                    Отчислить
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useApi } from '../composables/useApi'
import SubmissionsModal from '../components/SubmissionsModal.vue'

const { token, profile, loadProfile } = useAuth()
const { error, setError, loading, apiJson } = useApi()

const submissions = ref([])
const myCourses = ref([])
const selectedCourse = ref(null)
const selectedStatus = ref(null)
const reviewModalOpen = ref(false)
const selectedSubmission = ref(null)
const showOnlyPending = ref(true) // По умолчанию показываем только требующие проверки
const showOnlyUnviewed = ref(false)
const showEnrollmentModal = ref(false)
const enrollmentCourseId = ref(null)
const enrollmentTab = ref('available')
const availableStudents = ref([])
const enrolledStudents = ref([])
const studentSearch = ref('')
const loadingStudents = ref(false)

const pendingCount = computed(() => {
  return submissions.value.filter(s => s.status === 'not verified').length
})

const unviewedCount = computed(() => {
  // Автопроверенные, которые еще не просмотрены преподавателем
  return submissions.value.filter(s => 
    s.status === 'rated' && 
    s.teacher_comment === 'Автоматическая проверка'
  ).length
})

const filteredSubmissions = computed(() => {
  let filtered = [...submissions.value]
  
  // Применяем быстрые фильтры
  if (showOnlyPending.value) {
    filtered = filtered.filter(s => s.status === 'not verified')
  } else if (showOnlyUnviewed.value) {
    // Автопроверенные, которые еще не просмотрены
    filtered = filtered.filter(s => 
      s.status === 'rated' && 
      s.teacher_comment === 'Автоматическая проверка'
    )
  }
  // Если showAll - показываем все
  
  // Применяем дополнительные фильтры
  if (selectedCourse.value) {
    filtered = filtered.filter(s => s.course_id === selectedCourse.value)
  }
  
  if (selectedStatus.value) {
    filtered = filtered.filter(s => s.status === selectedStatus.value)
  }
  
  return filtered
})

function togglePendingFilter() {
  showOnlyPending.value = true
  showOnlyUnviewed.value = false
  selectedStatus.value = null
}

function toggleUnviewedFilter() {
  showOnlyPending.value = false
  showOnlyUnviewed.value = true
  selectedStatus.value = null
}

function showAllSubmissions() {
  showOnlyPending.value = false
  showOnlyUnviewed.value = false
  selectedStatus.value = null
}

async function loadSubmissions() {
  loading.value = true
  setError('')
  
  try {
    // Загружаем все submissions для проверки
    const reviewSubs = await apiJson('/submissions/review', {}, token.value)
    
    // Исключаем свои ответы
    submissions.value = (reviewSubs || []).filter(
      s => s.user_id !== profile.value?.id
    )
    
    // Загружаем список курсов
    await loadCourses()
  } catch (e) {
    setError(e.message || 'Ошибка загрузки решений')
  } finally {
    loading.value = false
  }
}

async function loadCourses() {
  try {
    if (!profile.value) {
      await loadProfile()
    }
    myCourses.value = profile.value?.created_courses || []
  } catch (e) {
    console.error('Ошибка загрузки курсов:', e)
  }
}

function getCourseTitle(courseId) {
  const course = myCourses.value.find(c => c.id === courseId)
  return course?.title || `Курс #${courseId}`
}

function getStatusClass(status) {
  if (status === 'rated') return 'badge-rated'
  if (status === 'checked') return 'badge-checked'
  if (status === 'not verified') return 'badge-pending'
  return 'badge-neutral'
}

function getStatusLabel(status) {
  if (status === 'rated') return 'Оценено'
  if (status === 'checked') return 'Проверено'
  if (status === 'not verified') return 'На проверке'
  return 'Неизвестно'
}

function getGradeClass(grade) {
  if (grade === null || grade === undefined) return 'grade-neutral'
  if (grade === 5) return 'grade-excellent'
  if (grade === 4) return 'grade-good'
  if (grade === 3) return 'grade-average'
  if (grade === 2) return 'grade-poor'
  if (grade === 1) return 'grade-bad'
  return 'grade-neutral'
}

function isJsonAnswer(answer) {
  try {
    JSON.parse(answer)
    return true
  } catch {
    return false
  }
}

function parseJsonAnswer(answer) {
  try {
    return JSON.parse(answer)
  } catch {
    return []
  }
}

function truncateAnswer(answer, maxLength) {
  if (!answer) return ''
  if (answer.length <= maxLength) return answer
  return answer.substring(0, maxLength) + '...'
}

function openReviewModal(submission) {
  selectedSubmission.value = submission
  reviewModalOpen.value = true
}

async function handleGradeSubmission(submission) {
  try {
    loading.value = true
    
    // Если это автопроверенный ответ и преподаватель не меняет оценку,
    // просто отмечаем как просмотренное (меняем комментарий)
    const isAutoChecked = submission.status === 'rated' && 
                         submission.teacher_comment === 'Автоматическая проверка'
    
    let comment = submission.teacher_comment || null
    if (isAutoChecked && !comment) {
      // Если комментарий удален, оставляем автокомментарий
      comment = 'Автоматическая проверка'
    } else if (isAutoChecked && comment && comment !== 'Автоматическая проверка') {
      // Преподаватель добавил свой комментарий - оставляем его
      // Можно добавить префикс "Просмотрено: " если нужно
    }
    
    await apiJson(
      `/submissions/${submission.id}/grade`,
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'rated',
          grade: submission.grade !== null ? submission.grade : submission.grade,
          teacher_comment: comment
        })
      },
      token.value
    )
    
    // Обновляем список
    await loadSubmissions()
    reviewModalOpen.value = false
    selectedSubmission.value = null
  } catch (e) {
    setError(e.message || 'Ошибка при сохранении оценки')
  } finally {
    loading.value = false
  }
}

async function loadAvailableStudents() {
  if (!enrollmentCourseId.value) return
  
  loadingStudents.value = true
  try {
    const searchParam = studentSearch.value ? `?search=${encodeURIComponent(studentSearch.value)}` : ''
    availableStudents.value = await apiJson(
      `/courses/${enrollmentCourseId.value}/available-students${searchParam}`,
      {},
      token.value
    )
  } catch (e) {
    setError(e.message || 'Ошибка загрузки учеников')
  } finally {
    loadingStudents.value = false
  }
}

async function loadEnrolledStudents() {
  if (!enrollmentCourseId.value) return
  
  loadingStudents.value = true
  try {
    enrolledStudents.value = await apiJson(
      `/courses/${enrollmentCourseId.value}/students`,
      {},
      token.value
    )
  } catch (e) {
    setError(e.message || 'Ошибка загрузки зачисленных учеников')
  } finally {
    loadingStudents.value = false
  }
}

async function enrollStudent(userId) {
  if (!enrollmentCourseId.value) return
  
  try {
    await apiJson(
      `/courses/${enrollmentCourseId.value}/enroll/${userId}`,
      { method: 'POST' },
      token.value
    )
    await loadAvailableStudents()
    await loadEnrolledStudents()
  } catch (e) {
    setError(e.message || 'Ошибка зачисления ученика')
  }
}

async function unenrollStudent(userId) {
  if (!enrollmentCourseId.value) return
  
  try {
    await apiJson(
      `/courses/${enrollmentCourseId.value}/enroll/${userId}`,
      { method: 'DELETE' },
      token.value
    )
    await loadAvailableStudents()
    await loadEnrolledStudents()
  } catch (e) {
    setError(e.message || 'Ошибка отчисления ученика')
  }
}

// Следим за изменением курса для зачисления
watch(enrollmentCourseId, async (newCourseId) => {
  if (newCourseId) {
    enrollmentTab.value = 'available'
    await loadAvailableStudents()
    await loadEnrolledStudents()
  }
})

watch(enrollmentTab, async (newTab) => {
  if (newTab === 'enrolled' && enrollmentCourseId.value) {
    await loadEnrolledStudents()
  }
})

onMounted(async () => {
  await loadProfile()
  await loadSubmissions()
})
</script>

<style scoped>
.teacher-panel-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  margin-bottom: 32px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  flex-wrap: wrap;
}

.header-stats {
  display: flex;
  gap: 24px;
  align-items: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1f2328;
}

.pending-count {
  color: #dc2626;
}

.page-header h2 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: #1f2328;
}

.subtitle {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
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

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.empty-state {
  text-align: center;
  padding: 48px;
  color: #9ca3af;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
}

.submissions-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filters {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.filter-group {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-right: 8px;
}

.filter-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 8px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  border-color: #2563eb;
  background: #eff6ff;
  color: #2563eb;
}

.filter-btn.active {
  border-color: #2563eb;
  background: #2563eb;
  color: white;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  min-width: 200px;
}

.submissions-table-wrapper {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.submissions-table {
  width: 100%;
  border-collapse: collapse;
}

.submissions-table th,
.submissions-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.submissions-table th {
  background: #f9fafb;
  font-weight: 600;
  font-size: 13px;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.submissions-table tbody tr:hover {
  background: #f9fafb;
}

.student-cell strong {
  font-size: 14px;
  color: #1f2328;
}

.course-cell {
  font-size: 14px;
  color: #374151;
}

.task-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.lecture-name {
  color: #1f2328;
  font-weight: 600;
}

.task-name {
  color: #6b7280;
}

.answer-preview {
  font-size: 13px;
  color: #374151;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.answer-option-badge {
  display: inline-block;
  padding: 2px 8px;
  margin: 2px;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.badge {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.badge-rated {
  background: #dbeafe;
  color: #1e40af;
}

.badge-checked {
  background: #fef3c7;
  color: #92400e;
}

.badge-pending {
  background: #fce7f3;
  color: #9f1239;
}

.badge-neutral {
  background: #f3f4f6;
  color: #374151;
}

.grade-badge {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
}

.grade-excellent {
  background: #dcfce7;
  color: #166534;
}

.grade-good {
  background: #dbeafe;
  color: #1e40af;
}

.grade-average {
  background: #fef3c7;
  color: #92400e;
}

.grade-poor {
  background: #fee2e2;
  color: #991b1b;
}

.grade-bad {
  background: #f3f4f6;
  color: #374151;
}

.grade-neutral {
  background: #f3f4f6;
  color: #6b7280;
}

.auto-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.reviewed-badge {
  font-size: 12px;
  color: #16a34a;
  font-weight: 600;
}

.status-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary.small {
  padding: 6px 12px;
  font-size: 13px;
}

.btn-secondary {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #1f2328;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #f3f4f6;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.enrollment-modal {
  max-width: 900px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.modal-close:hover {
  background: #f3f4f6;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.enrollment-section {
  margin-bottom: 24px;
}

.enrollment-select {
  width: 100%;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  margin-top: 8px;
}

.enrollment-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
}

.tab-btn {
  padding: 10px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: -2px;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #1f2328;
}

.tab-btn.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
}

.students-list {
  min-height: 300px;
}

.search-box {
  margin-bottom: 16px;
}

.search-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.students-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
}

.student-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
}

.student-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.student-info strong {
  font-size: 14px;
  color: #1f2328;
}

.student-id {
  font-size: 12px;
  color: #6b7280;
}

.loading-small,
.empty-small {
  text-align: center;
  padding: 40px;
  color: #9ca3af;
}

.btn-danger.small {
  padding: 6px 12px;
  font-size: 13px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-danger.small:hover {
  background: #b91c1c;
}
</style>
