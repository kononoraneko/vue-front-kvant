<template>
  <div class="edit-course-page">
    <div class="page-header">
      <h2>Редактировать курс</h2>
      <button type="button" class="btn-secondary" @click="$router.push('/courses')">
        ← Назад к курсам
      </button>
    </div>

    <div v-if="loading" class="loading">
      Загрузка курса...
    </div>

    <div v-else-if="error" class="alert error">
      {{ error }}
    </div>

    <form v-else @submit.prevent="handleSubmit" class="course-form">
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
        <h3>Темы курса</h3>
        <div class="topics-editor">
          <div
            v-for="(topic, topicIndex) in form.topics"
            :key="topicIndex"
            class="topic-editor"
          >
            <div class="topic-header">
              <input
                v-model="topic.title"
                type="text"
                :placeholder="`Тема ${topicIndex + 1}`"
                class="topic-title-input"
                required
              >
              <button
                type="button"
                class="btn-danger"
                @click="removeTopic(topicIndex)"
              >
                Удалить тему
              </button>
            </div>

            <div class="topic-lectures">
              <h4>Лекции в теме</h4>
              <div
                v-for="(lecture, lectureIndex) in topic.lectures"
                :key="lectureIndex"
                class="lecture-editor"
              >
                <div class="lecture-header">
                  <input
                    v-model="lecture.title"
                    type="text"
                    :placeholder="`Лекция ${lectureIndex + 1}`"
                    class="lecture-title-input"
                    required
                  >
                  <button
                    type="button"
                    class="btn-danger small"
                    @click="removeLecture(topicIndex, lectureIndex)"
                  >
                    Удалить лекцию
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
                    rows="12"
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
                  <h5>Задачи</h5>
                  <TaskEditor
                    v-for="(task, taskIndex) in lecture.tasks"
                    :key="taskIndex"
                    :model-value="task"
                    @update:model-value="updateTask(topicIndex, lectureIndex, taskIndex, $event)"
                    @remove="removeTask(topicIndex, lectureIndex, taskIndex)"
                  />
                  <button
                    type="button"
                    class="btn-secondary tiny"
                    @click="addTask(topicIndex, lectureIndex)"
                  >
                    + Добавить задачу
                  </button>
                </div>
              </div>
              <button
                type="button"
                class="btn-secondary small"
                @click="addLecture(topicIndex)"
              >
                + Добавить лекцию в тему
              </button>
            </div>
          </div>
          <button
            type="button"
            class="btn-primary"
            @click="addTopic"
          >
            + Добавить тему
          </button>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-secondary" @click="$router.push(`/courses/${courseId}`)">
          Отмена
        </button>
        <button type="submit" :disabled="loading || !canSubmit" class="btn-primary large">
          {{ loading ? 'Сохраняем...' : 'Сохранить изменения' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useApi } from '../composables/useApi'
import { marked } from 'marked'
import TaskEditor from '../components/TaskEditor.vue'

const route = useRoute()
const router = useRouter()
const { token, loadProfile } = useAuth()
const { error, setError, loading, apiJson } = useApi()

const courseId = computed(() => route.params.id)

const form = reactive({
  title: '',
  status: 'draft',
  topics: []
})

const canSubmit = computed(() => {
  return form.title.trim() &&
    form.topics.length > 0 &&
    form.topics.every(topic => 
      topic.title.trim() &&
      topic.lectures.length > 0 &&
      topic.lectures.every(lecture => lecture.title.trim() && lecture.content.trim())
    )
})

function renderMarkdown(text) {
  if (!text) return ''
  return marked(text)
}

function addTopic() {
  form.topics.push({
    title: '',
    lectures: [
      {
        title: '',
        content: '',
        mode: 'markdown',
        tasks: [{ key: 'Задача 1', html: '' }]
      }
    ]
  })
}

function removeTopic(index) {
  if (form.topics.length > 1) {
    form.topics.splice(index, 1)
  }
}

function addLecture(topicIndex) {
  form.topics[topicIndex].lectures.push({
    title: '',
    content: '',
    mode: 'markdown',
    tasks: [{ key: 'task1', html: '' }]
  })
}

function removeLecture(topicIndex, lectureIndex) {
  if (form.topics[topicIndex].lectures.length > 1) {
    form.topics[topicIndex].lectures.splice(lectureIndex, 1)
  }
}

function addTask(topicIndex, lectureIndex) {
  const taskNum = form.topics[topicIndex].lectures[lectureIndex].tasks.length + 1
  form.topics[topicIndex].lectures[lectureIndex].tasks.push({
    key: `Задача ${taskNum}`,
    html: '',
    type: 'manual'
  })
}

function updateTask(topicIndex, lectureIndex, taskIndex, updatedTask) {
  form.topics[topicIndex].lectures[lectureIndex].tasks[taskIndex] = updatedTask
}

function removeTask(topicIndex, lectureIndex, taskIndex) {
  if (form.topics[topicIndex].lectures[lectureIndex].tasks.length > 1) {
    form.topics[topicIndex].lectures[lectureIndex].tasks.splice(taskIndex, 1)
  }
}

async function loadCourse() {
  loading.value = true
  setError('')
  
  try {
    const data = await apiJson(`/courses/${courseId.value}/content`, {}, token.value)
    
    form.title = data.course.title
    form.status = data.course.status
    
    // Преобразуем структуру курса в формат формы
    // Поддерживаем старый формат (без тем) и новый формат (с темами)
    if (data.content) {
      const entries = Object.entries(data.content)
      
      // Проверяем, есть ли темы (новый формат)
      const firstEntry = entries[0]
      if (firstEntry && firstEntry[1] && firstEntry[1].lectures) {
        // Новый формат: Topic -> Lectures -> Tasks
        form.topics = entries.map(([key, value]) => {
          const topic = {
            title: value.title || `Тема ${key.replace(/[^\d]/g, '')}`,
            lectures: []
          }
          
          if (value.lectures) {
            const lectureEntries = Object.entries(value.lectures)
            topic.lectures = lectureEntries.map(([lectureKey, lectureValue]) => ({
              title: lectureValue.title || `Лекция ${lectureKey.replace(/[^\d]/g, '')}`,
              content: lectureValue.content || '',
              mode: 'markdown',
              tasks: lectureValue.tasks ? Object.entries(lectureValue.tasks).map(([taskKey, taskValue]) => ({
                key: taskKey,
                html: taskValue.html || '',
                type: taskValue.type || 'manual',
                options: taskValue.options || null,
                correct_answer: taskValue.correct_answer || null,
                placeholder: taskValue.placeholder || null
              })) : [{ key: 'Задача 1', html: '', type: 'manual' }]
            }))
          }
          
          if (topic.lectures.length === 0) {
            topic.lectures.push({
              title: '',
              content: '',
              mode: 'markdown',
              tasks: [{ key: 'Задача 1', html: '' }]
            })
          }
          
          return topic
        })
      } else {
        // Старый формат: Lectures -> Tasks (без тем)
        // Преобразуем в новый формат с одной темой
        form.topics = [{
          title: 'Основная тема',
          lectures: entries.map(([key, value]) => ({
            title: value.title || `Лекция ${key.replace(/[^\d]/g, '')}`,
            content: value.content || '',
            mode: 'markdown',
            tasks: value.tasks ? Object.entries(value.tasks).map(([taskKey, taskValue]) => ({
              key: taskKey,
              html: taskValue.html || ''
            })) : [{ key: 'task1', html: '' }]
          }))
        }]
      }
    }
    
    if (form.topics.length === 0) {
      form.topics.push({
        title: '',
        lectures: [{
          title: '',
          content: '',
          mode: 'markdown',
          tasks: [{ key: 'Задача 1', html: '' }]
        }]
      })
    }
  } catch (e) {
    setError(e.message)
  } finally {
    loading.value = false
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
    // Формируем структуру курса: Курс -> Темы -> Лекции -> Задачи
    const courseContent = {}
    form.topics.forEach((topic, topicIndex) => {
      const topicKey = `Topic${topicIndex + 1}`
      courseContent[topicKey] = {
        title: topic.title,
        lectures: {}
      }
      
      topic.lectures.forEach((lecture, lectureIndex) => {
        const lectureKey = `Lecture${lectureIndex + 1}`
        courseContent[topicKey].lectures[lectureKey] = {
          title: lecture.title,
          content: lecture.content,
          tasks: {}
        }
        
        lecture.tasks.forEach(task => {
          const taskData = {
            html: task.html,
            type: task.type || 'manual'
          }
          
          // Добавляем специфичные поля для разных типов задач
          if (task.type === 'single_choice' || task.type === 'multiple_choice') {
            if (task.options && Array.isArray(task.options)) {
              taskData.options = task.options
            }
            // Для single_choice correct_answer должен быть индексом (0-based)
            if (task.type === 'single_choice') {
              // Всегда сохраняем correct_answer для single_choice
              if (task.correct_answer !== undefined && task.correct_answer !== null) {
                const answerIndex = parseInt(task.correct_answer)
                if (!isNaN(answerIndex) && answerIndex >= 0 && task.options && answerIndex < task.options.length) {
                  taskData.correct_answer = answerIndex
                } else if (task.options && task.options.length > 0) {
                  // Если индекс невалидный, используем первый вариант (0)
                  taskData.correct_answer = 0
                }
              } else if (task.options && task.options.length > 0) {
                // Если correct_answer не указан, используем первый вариант по умолчанию
                taskData.correct_answer = 0
              }
            } else if (task.type === 'multiple_choice') {
              if (task.correct_answer !== undefined && task.correct_answer !== null) {
                taskData.correct_answer = task.correct_answer
              }
            }
          } else if (task.type === 'text_answer') {
            if (task.correct_answer) {
              taskData.correct_answer = task.correct_answer
            }
            if (task.placeholder) {
              taskData.placeholder = task.placeholder
            }
          }
          
          courseContent[topicKey].lectures[lectureKey].tasks[task.key] = taskData
        })
      })
    })

    const courseData = {
      title: form.title,
      status: form.status,
      content: courseContent
    }

    await apiJson(`/courses/${courseId.value}`, {
      method: 'PUT',
      body: JSON.stringify(courseData)
    }, token.value)

    await loadProfile()
    router.push(`/courses/${courseId.value}`)
  } catch (e) {
    setError(e.message)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCourse()
})
</script>

<style scoped>
.edit-course-page {
  max-width: 1400px;
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

.loading {
  text-align: center;
  padding: 48px;
  color: #6b7280;
}

.alert {
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 24px;
  font-size: 14px;
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

.topics-editor {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.topic-editor {
  border: 2px solid #2563eb;
  border-radius: 12px;
  padding: 20px;
  background: #f0f9ff;
}

.topic-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #bfdbfe;
}

.topic-title-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #93c5fd;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 700;
  background: white;
}

.topic-lectures {
  margin-top: 16px;
}

.topic-lectures h4 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #1e40af;
}

.lecture-editor {
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  background: white;
}

.lecture-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.lecture-title-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 600;
}

.lecture-content {
  margin-bottom: 12px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  background: #f3f4f6;
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
  background: #f9fafb;
  min-height: 200px;
  font-size: 14px;
  line-height: 1.7;
}

.lecture-tasks {
  border-top: 1px solid #e5e7eb;
  padding-top: 12px;
  margin-top: 12px;
}

.lecture-tasks h5 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.task-editor {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-bottom: 8px;
  padding: 8px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.task-key-input {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 12px;
  width: 100px;
  flex-shrink: 0;
}

.task-content-input {
  flex: 1;
  padding: 6px 10px;
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

.btn-danger.tiny,
.btn-secondary.tiny {
  padding: 4px 8px;
  font-size: 11px;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}
</style>
