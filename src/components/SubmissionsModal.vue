<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Ответы учеников</h3>
        <button type="button" class="btn-close" @click="close">✕</button>
      </div>

      <div class="modal-body">
        <div v-if="loading" class="loading">
          Загрузка ответов...
        </div>

        <div v-else-if="submissions.length === 0" class="empty">
          Нет отправленных ответов
        </div>

        <div v-else class="submissions-list">
          <!-- Группировка по задачам -->
          <div
            v-for="(taskSubmissions, taskKey) in groupedSubmissions"
            :key="taskKey"
            class="task-group"
          >
              <div class="task-group-header">
              <h4 class="task-group-title">Задача: {{ taskKey }}</h4>
              <template v-if="getTaskInfoFromKey(taskKey)">
                <div class="task-question-box">
                  <strong>Вопрос:</strong>
                  <div v-html="getTaskInfoFromKey(taskKey).html || 'Нет описания'"></div>
                  <div v-if="getCorrectAnswerFromKey(taskKey)" class="correct-answer-hint">
                    <strong>Правильный ответ:</strong> {{ getCorrectAnswerFromKey(taskKey) }}
                  </div>
                </div>
              </template>
            </div>
            
            <div
              v-for="sub in taskSubmissions"
              :key="sub.id"
              class="submission-item"
            >
              <div class="submission-header">
                <div class="submission-student">
                  <strong>{{ sub.user_name || `Студент #${sub.user_id}` }}</strong>
                  <span class="submission-date">{{ formatDate(sub) }}</span>
                </div>
                <span class="badge" :class="getStatusClass(sub.status)">
                  {{ getStatusLabel(sub.status) }}
                </span>
              </div>

              <div class="submission-answer">
                <strong>Ответ ученика:</strong>
                <div class="answer-content">
                  {{ formatAnswer(sub) }}
                </div>
              </div>

              <div v-if="sub.status === 'rated' && sub.teacher_comment !== 'Автоматическая проверка'" class="submission-grade" :class="getGradeClass(sub.grade)">
                <div class="grade-header">
                  <strong>Оценка: <span class="grade-value">{{ sub.grade }}/5</span></strong>
                </div>
                <div v-if="sub.teacher_comment" class="teacher-comment">
                  <strong>Комментарий преподавателя:</strong> {{ sub.teacher_comment }}
                </div>
              </div>

              <div v-else class="submission-actions">
                <div class="grade-inputs">
                  <label>
                    Оценка (1-5)
                    <select
                      v-model.number="sub.grade"
                      class="grade-select"
                    >
                      <option :value="null">Не оценено</option>
                      <option :value="1">1</option>
                      <option :value="2">2</option>
                      <option :value="3">3</option>
                      <option :value="4">4</option>
                      <option :value="5">5</option>
                    </select>
                  </label>
                  <label>
                    Комментарий
                    <textarea
                      v-model="sub.teacher_comment"
                      :placeholder="sub.status === 'rated' && sub.teacher_comment === 'Автоматическая проверка' ? 'Добавьте комментарий или оставьте пустым...' : 'Введите комментарий...'"
                      class="comment-textarea"
                      rows="2"
                    />
                  </label>
                </div>
                <div v-if="sub.status === 'rated' && sub.teacher_comment === 'Автоматическая проверка'" class="auto-checked-notice">
                  <div class="auto-indicator-large">
                    🤖 Автоматически проверено (оценка: {{ sub.grade }}/5)
                  </div>
                  <div class="auto-comment-hint">
                    <em>Вы можете просмотреть ответ, изменить оценку или добавить комментарий</em>
                  </div>
                </div>
                <div class="action-buttons">
                  <button
                    v-if="sub.status === 'rated' && sub.teacher_comment === 'Автоматическая проверка'"
                    type="button"
                    class="btn-secondary"
                    :disabled="grading"
                    @click="markAsViewed(sub)"
                  >
                    {{ grading ? 'Сохранение...' : '✓ Отметить как просмотренное' }}
                  </button>
                  <button
                    type="button"
                    class="btn-primary"
                    :disabled="grading"
                    @click="gradeSubmission(sub)"
                  >
                    {{ grading ? 'Сохранение...' : sub.status === 'rated' && sub.teacher_comment === 'Автоматическая проверка' ? 'Сохранить изменения' : sub.status === 'rated' ? 'Сохранить изменения' : 'Сохранить оценку' }}
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
import { computed, ref } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  submissions: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'grade'])

const grading = ref(false)

const groupedSubmissions = computed(() => {
  const grouped = {}
  props.submissions.forEach(sub => {
    // Используем полный ключ задачи для группировки
    const taskKey = `${sub.topic_key}.${sub.lecture_key}.${sub.task_key}`
    if (!grouped[taskKey]) {
      grouped[taskKey] = []
    }
    grouped[taskKey].push(sub)
  })
  return grouped
})

function close() {
  emit('close')
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

function formatDate(submission) {
  if (submission.created_at) {
    return new Date(submission.created_at).toLocaleString('ru-RU')
  }
  return ''
}

function parseJsonAnswer(answer) {
  try {
    return JSON.parse(answer)
  } catch {
    return []
  }
}

// Получаем информацию о задаче по ключу
function getTaskInfoByKey(topicKey, lectureKey, taskKey) {
  if (!props.courseContent) return null
  
  try {
    const topic = props.courseContent[topicKey]
    if (!topic || !topic.lectures) return null
    
    const lecture = topic.lectures[lectureKey]
    if (!lecture || !lecture.tasks) return null
    
    return lecture.tasks[taskKey] || null
  } catch {
    return null
  }
}

function getTaskInfoFromKey(taskKey) {
  // taskKey имеет формат "topicKey.lectureKey.taskKey"
  if (!props.courseContent) return null
  
  try {
    const parts = taskKey.split('.')
    if (parts.length < 3) return null
    
    const topicKey = parts[0]
    const lectureKey = parts[1]
    const taskKeyOnly = parts.slice(2).join('.')
    
    return getTaskInfoByKey(topicKey, lectureKey, taskKeyOnly)
  } catch {
    return null
  }
}

function getCorrectAnswerFromKey(taskKey) {
  const taskInfo = getTaskInfoFromKey(taskKey)
  if (!taskInfo) return null
  
  if (taskInfo.type === 'single_choice') {
    const correctIndex = taskInfo.correct_answer
    if (correctIndex !== undefined && correctIndex !== null && taskInfo.options && taskInfo.options[correctIndex]) {
      return taskInfo.options[correctIndex]
    }
  } else if (taskInfo.type === 'multiple_choice') {
    try {
      const correctIndices = typeof taskInfo.correct_answer === 'string' 
        ? JSON.parse(taskInfo.correct_answer) 
        : taskInfo.correct_answer
      if (Array.isArray(correctIndices) && taskInfo.options) {
        return correctIndices
          .map(i => taskInfo.options[i])
          .filter(Boolean)
          .join(', ')
      }
    } catch {
      return null
    }
  } else if (taskInfo.type === 'text_answer') {
    return taskInfo.correct_answer || null
  }
  
  return null
}

function formatAnswer(submission) {
  const taskInfo = getTaskInfoByKey(submission.topic_key, submission.lecture_key, submission.task_key)
  
  if (!taskInfo) {
    // Если нет информации о задаче, показываем как есть
    try {
      const indices = parseJsonAnswer(submission.answer)
      if (Array.isArray(indices)) {
        return indices.map(i => `Вариант ${i + 1}`).join(', ')
      }
    } catch {
      // Не JSON, показываем как есть
    }
    return submission.answer
  }
  
  if (taskInfo.type === 'single_choice') {
    try {
      const selectedIndex = parseInt(submission.answer)
      if (!isNaN(selectedIndex) && taskInfo.options && taskInfo.options[selectedIndex]) {
        return taskInfo.options[selectedIndex]
      }
    } catch {
      return submission.answer
    }
  } else if (taskInfo.type === 'multiple_choice') {
    try {
      const selectedIndices = parseJsonAnswer(submission.answer)
      if (Array.isArray(selectedIndices) && taskInfo.options) {
        return selectedIndices
          .map(i => taskInfo.options[i])
          .filter(Boolean)
          .join(', ')
      }
    } catch {
      return submission.answer
    }
  }
  
  return submission.answer
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

async function gradeSubmission(submission) {
  grading.value = true
  try {
    emit('grade', submission)
  } finally {
    grading.value = false
  }
}

function markAsViewed(submission) {
  // Отмечаем как просмотренное - меняем комментарий
  // Оценку оставляем как есть
  submission.teacher_comment = 'Просмотрено преподавателем'
  gradeSubmission(submission)
}
</script>

<style scoped>
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
  padding: 24px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2328;
}

.btn-close {
  padding: 8px;
  border: none;
  background: transparent;
  font-size: 20px;
  color: #6b7280;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #f3f4f6;
  color: #1f2328;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.loading,
.empty {
  text-align: center;
  padding: 48px;
  color: #6b7280;
}

.submissions-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.task-group {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #f9fafb;
}

.task-group-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
}

.task-group-title {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
  color: #1f2328;
}

.task-question-box {
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  border-left: 4px solid #2563eb;
  margin-top: 12px;
}

.task-question-box strong {
  display: block;
  margin-bottom: 8px;
  color: #1f2328;
  font-size: 14px;
}

.task-question-box > div {
  margin-bottom: 12px;
  color: #374151;
  line-height: 1.6;
}

.correct-answer-hint {
  margin-top: 12px;
  padding: 8px;
  background: #dcfce7;
  border-radius: 6px;
  border-left: 3px solid #16a34a;
  font-size: 13px;
}

.correct-answer-hint strong {
  color: #166534;
}

.submission-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.submission-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.submission-student {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.submission-student strong {
  font-size: 15px;
  color: #1f2328;
}

.submission-date {
  font-size: 12px;
  color: #6b7280;
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

.submission-answer {
  margin-bottom: 12px;
}

.submission-answer strong {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #1f2328;
}

.answer-content {
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.6;
  color: #374151;
  white-space: pre-wrap;
}

.answer-option {
  padding: 4px 0;
}

.submission-grade {
  padding: 12px;
  border-radius: 6px;
  margin-top: 12px;
  border-left: 4px solid;
}

.submission-grade strong {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

.submission-grade .grade-value {
  font-size: 18px;
  font-weight: 700;
}

.grade-excellent {
  background: #dcfce7;
  border-left-color: #16a34a;
}

.grade-excellent strong,
.grade-excellent .grade-value {
  color: #166534;
}

.grade-good {
  background: #dbeafe;
  border-left-color: #2563eb;
}

.grade-good strong,
.grade-good .grade-value {
  color: #1e40af;
}

.grade-average {
  background: #fef3c7;
  border-left-color: #f59e0b;
}

.grade-average strong,
.grade-average .grade-value {
  color: #92400e;
}

.grade-poor {
  background: #fee2e2;
  border-left-color: #ef4444;
}

.grade-poor strong,
.grade-poor .grade-value {
  color: #991b1b;
}

.grade-bad {
  background: #f3f4f6;
  border-left-color: #6b7280;
}

.grade-bad strong,
.grade-bad .grade-value {
  color: #374151;
}

.grade-neutral {
  background: #f3f4f6;
  border-left-color: #9ca3af;
}

.grade-neutral strong,
.grade-neutral .grade-value {
  color: #6b7280;
}

.teacher-comment {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #bfdbfe;
  font-size: 14px;
  color: #1e40af;
}

.submission-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.grade-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.auto-indicator {
  font-size: 12px;
  padding: 4px 8px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 4px;
  font-weight: 600;
}

.auto-indicator-large {
  padding: 12px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 6px;
  font-weight: 600;
  margin-bottom: 8px;
  border-left: 4px solid #f59e0b;
}

.auto-checked-notice {
  margin-bottom: 16px;
  padding: 12px;
  background: #fffbeb;
  border-radius: 6px;
  border: 1px solid #fef3c7;
}

.auto-comment-hint {
  margin-top: 8px;
  padding: 8px;
  background: #f9fafb;
  border-radius: 4px;
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
}

.btn-secondary {
  padding: 10px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #1f2328;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.grade-inputs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.grade-inputs label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2328;
}

.grade-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

.comment-textarea {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}

.btn-primary {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  background: #2563eb;
  color: white;
  font-size: 14px;
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
</style>

