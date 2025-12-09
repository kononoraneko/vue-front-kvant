<template>
  <div class="create-course-page">
    <div class="page-header">
      <h2>Создать новый курс</h2>
      <button type="button" class="btn-secondary" @click="$router.push('/courses')">
        ← Назад к курсам
      </button>
    </div>

    <div v-if="error" class="alert error">
      {{ error }}
    </div>

    <form @submit.prevent="handleSubmit" class="course-form">
      <div class="form-section">
        <label>
          Название курса *
          <input
            v-model="form.title"
            type="text"
            placeholder="Основы Python"
            required
          >
        </label>

        <label>
          Статус курса *
          <select v-model="form.status" required>
            <option value="draft">Черновик</option>
            <option value="private">Приватный</option>
            <option value="public">Публичный</option>
          </select>
        </label>
      </div>

      <div class="form-section">
        <h3>Лекции</h3>
        <div class="lectures-editor">
          <div
            v-for="(lecture, index) in form.lectures"
            :key="index"
            class="lecture-editor"
          >
            <div class="lecture-header">
              <input
                v-model="lecture.title"
                type="text"
                :placeholder="`Лекция ${index + 1}`"
                class="lecture-title-input"
                required
              >
              <button
                type="button"
                class="btn-danger"
                @click="removeLecture(index)"
              >
                Удалить
              </button>
            </div>
            <div class="lecture-content">
              <div class="tabs">
                <button
                  type="button"
                  :class="['tab', lecture.mode === 'markdown' && 'active']"
                  @click="lecture.mode = 'markdown'"
                >
                  Markdown
                </button>
                <button
                  type="button"
                  :class="['tab', lecture.mode === 'preview' && 'active']"
                  @click="lecture.mode = 'preview'"
                >
                  Предпросмотр
                </button>
              </div>
              <textarea
                v-if="lecture.mode === 'markdown'"
                v-model="lecture.content"
                rows="15"
                placeholder="Напишите лекцию в формате Markdown..."
                class="markdown-editor"
                required
              />
              <div
                v-else
                class="markdown-preview"
                v-html="renderMarkdown(lecture.content)"
              />
            </div>
            <div class="lecture-tasks">
              <h4>Задачи</h4>
              <div
                v-for="(task, taskIndex) in lecture.tasks"
                :key="taskIndex"
                class="task-editor"
              >
                <input
                  v-model="task.key"
                  type="text"
                  placeholder="task1"
                  class="task-key-input"
                  required
                >
                <textarea
                  v-model="task.html"
                  rows="4"
                  placeholder="Описание задачи (HTML или Markdown)..."
                  class="task-content-input"
                  required
                />
                <button
                  type="button"
                  class="btn-danger small"
                  @click="removeTask(index, taskIndex)"
                >
                  Удалить задачу
                </button>
              </div>
              <button
                type="button"
                class="btn-secondary small"
                @click="addTask(index)"
              >
                + Добавить задачу
              </button>
            </div>
          </div>
          <button
            type="button"
            class="btn-primary"
            @click="addLecture"
          >
            + Добавить лекцию
          </button>
        </div>
      </div>

      <div class="form-actions">
        <button type="submit" :disabled="loading || !canSubmit" class="btn-primary large">
          {{ loading ? 'Создаём курс...' : 'Создать курс' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useApi } from '../composables/useApi'
import { marked } from 'marked'

const router = useRouter()
const { token, loadProfile } = useAuth()
const { error, setError, loading, apiJson } = useApi()

const form = reactive({
  title: '',
  status: 'draft',
  lectures: [
    {
      title: '',
      content: '',
      mode: 'markdown',
      tasks: [
        { key: 'task1', html: '' }
      ]
    }
  ]
})

const canSubmit = computed(() => {
  return form.title.trim() &&
    form.lectures.length > 0 &&
    form.lectures.every(l => l.title.trim() && l.content.trim())
})

function renderMarkdown(text) {
  if (!text) return ''
  return marked(text)
}

function addLecture() {
  form.lectures.push({
    title: '',
    content: '',
    mode: 'markdown',
    tasks: [{ key: 'task1', html: '' }]
  })
}

function removeLecture(index) {
  if (form.lectures.length > 1) {
    form.lectures.splice(index, 1)
  }
}

function addTask(lectureIndex) {
  const taskNum = form.lectures[lectureIndex].tasks.length + 1
  form.lectures[lectureIndex].tasks.push({
    key: `task${taskNum}`,
    html: ''
  })
}

function removeTask(lectureIndex, taskIndex) {
  if (form.lectures[lectureIndex].tasks.length > 1) {
    form.lectures[lectureIndex].tasks.splice(taskIndex, 1)
  }
}

async function handleSubmit() {
  if (!canSubmit.value) {
    setError('Заполните все обязательные поля')
    return
  }

  loading.value = true
  setError('')

  try {
    // Формируем структуру курса в формате JSON (совместимо со старым форматом)
    const courseContent = {}
    form.lectures.forEach((lecture, index) => {
      const lectureKey = `Lection${index + 1}`
      // Сохраняем markdown контент напрямую (будет рендериться на фронте)
      courseContent[lectureKey] = {
        content: lecture.content, // Markdown контент
        tasks: {}
      }
      // Формируем задачи в формате { task1: { html: ... }, task2: { html: ... } }
      lecture.tasks.forEach(task => {
        courseContent[lectureKey].tasks[task.key] = {
          html: task.html
        }
      })
    })

    const courseData = {
      title: form.title,
      status: form.status,
      content: courseContent
    }

    await apiJson('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData)
    }, token.value)

    // Обновляем профиль чтобы новый курс появился в списке
    await loadProfile()
    
    // Перенаправляем на страницу курсов, чтобы увидеть новый курс в списке
    router.push('/courses')
  } catch (e) {
    setError(e.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.create-course-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.page-header h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #1f2328;
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

.course-form {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.form-section {
  margin-bottom: 32px;
}

.form-section h3 {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 600;
  color: #1f2328;
}

.form-section label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2328;
}

.form-section input,
.form-section select {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.lectures-editor {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.lecture-editor {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #f9fafb;
}

.lecture-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.lecture-title-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
}

.lecture-content {
  margin-bottom: 16px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  background: white;
  padding: 4px;
  border-radius: 8px;
}

.tab {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.tab.active {
  background: #2563eb;
  color: white;
}

.markdown-editor {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-family: ui-monospace, 'Courier New', monospace;
  resize: vertical;
}

.markdown-preview {
  padding: 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  min-height: 200px;
  font-size: 14px;
  line-height: 1.7;
}

.lecture-tasks {
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
}

.lecture-tasks h4 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2328;
}

.task-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.task-key-input {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  width: 120px;
}

.task-content-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  resize: vertical;
}

.btn-primary,
.btn-secondary,
.btn-danger {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-secondary {
  background: #f3f4f6;
  color: #1f2328;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-danger {
  background: #fee2e2;
  color: #991b1b;
}

.btn-danger:hover {
  background: #fecaca;
}

.btn-primary.large {
  padding: 12px 24px;
  font-size: 16px;
}

.btn-danger.small,
.btn-secondary.small {
  padding: 6px 12px;
  font-size: 12px;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}
</style>

