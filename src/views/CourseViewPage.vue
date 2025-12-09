<template>
  <div class="course-view-page">
    <div v-if="loading" class="loading">
      Загрузка курса...
    </div>

    <div v-else-if="error" class="alert error">
      {{ error }}
    </div>

    <div v-else-if="courseContent" class="course-content">
      <div class="course-body">
        <CourseTree
          :course-title="activeCourse.title"
          :lectures="lectures"
          :active-lecture-key="activeLectureKey"
          :is-creator="isCreator"
          :is-editing="isEditing"
          :completed-tasks="completedTasks"
          @select-lecture="selectLecture"
          @select-task="selectTask"
          @start-edit="startEditing"
        />

        <section class="lesson-panel">
          <div v-if="!activeLectureKey" class="empty-state">
            <p>Выберите лекцию из списка слева</p>
          </div>

          <template v-else>
            <div v-if="lectureLoading" class="lesson-loading">
              Загружаем лекцию и задачи...
            </div>

            <template v-else>
              <!-- Режим редактирования для создателя -->
              <div v-if="isEditing && isCreator" class="edit-mode">
                <div class="edit-header">
                  <h3>Редактирование лекции</h3>
                  <div class="edit-actions">
                    <button type="button" class="btn-secondary" @click="cancelEditing">
                      Отмена
                    </button>
                    <button type="button" class="btn-primary" @click="saveLecture">
                      Сохранить
                    </button>
                  </div>
                </div>
                <div class="edit-content">
                  <label>
                    Название лекции
                    <input
                      v-model="editForm.lectureTitle"
                      type="text"
                      class="edit-input"
                    >
                  </label>
                  <label>
                    Содержимое (Markdown)
                    <div class="tabs">
                      <button
                        type="button"
                        :class="['tab', editForm.mode === 'markdown' && 'active']"
                        @click="editForm.mode = 'markdown'"
                      >
                        Markdown
                      </button>
                      <button
                        type="button"
                        :class="['tab', editForm.mode === 'preview' && 'active']"
                        @click="editForm.mode = 'preview'"
                      >
                        Предпросмотр
                      </button>
                    </div>
                    <textarea
                      v-if="editForm.mode === 'markdown'"
                      v-model="editForm.content"
                      rows="20"
                      class="markdown-editor"
                    />
                    <div
                      v-else
                      class="markdown-preview"
                      v-html="renderMarkdown(editForm.content)"
                    />
                  </label>
                </div>
              </div>

              <!-- Обычный режим просмотра -->
              <template v-else>
                <article v-if="lectureHtml" class="lesson-text">
                  <div class="lesson-header">
                    <h3>{{ currentLectureTitle }}</h3>
                    <button
                      v-if="isCreator"
                      type="button"
                      class="btn-edit"
                      @click="startEditing"
                    >
                      ✏️ Редактировать
                    </button>
                  </div>
                  <div v-html="renderMarkdown(lectureHtml)" />
                </article>

                <section v-if="tasks.length" class="tasks">
                  <h3>Задачи</h3>
                  <TaskCard
                    v-for="task in tasks"
                    :key="task.key"
                    :task="task"
                    :model-value="answers[task.key] || ''"
                    :is-completed="isTaskCompleted(activeLectureKey, task.key)"
                    @update:model-value="updateAnswer(activeLectureKey, task.key, $event)"
                    @complete="markTaskCompleted(activeLectureKey, task.key)"
                  />
                </section>
              </template>
            </template>
          </template>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useApi } from '../composables/useApi'
import { marked } from 'marked'
import CourseTree from '../components/CourseTree.vue'
import TaskCard from '../components/TaskCard.vue'

const route = useRoute()
const { token, profile } = useAuth()
const { error, setError, loading, apiJson } = useApi()

const courseContent = ref(null)
const activeCourse = ref(null)
const activeLectureKey = ref(null)
const activeTaskKey = ref(null)
const lectureHtml = ref('')
const tasks = ref([])
const lectureLoading = ref(false)
const answers = reactive({})
const isEditing = ref(false)
const editForm = reactive({
  lectureTitle: '',
  content: '',
  mode: 'markdown'
})

// Сохранение прогресса задач в localStorage
const completedTasks = reactive(JSON.parse(localStorage.getItem('completedTasks') || '{}'))
const taskAnswers = reactive(JSON.parse(localStorage.getItem('taskAnswers') || '{}'))

const isCreator = computed(() => {
  return activeCourse.value?.creator_id === profile.value?.id
})

const lectures = computed(() => {
  if (!courseContent.value?.content) return []
  const entries = Object.entries(courseContent.value.content)
  return entries.map(([key, value]) => {
    const lecture = {
      key,
      ...(value || {})
    }
    // Преобразуем tasks в массив для удобства
    if (lecture.tasks && typeof lecture.tasks === 'object' && !Array.isArray(lecture.tasks)) {
      lecture.tasks = Object.entries(lecture.tasks).map(([taskKey, taskValue]) => ({
        key: taskKey,
        ...(taskValue || {})
      }))
    }
    return lecture
  })
})

const currentLectureTitle = computed(() => {
  if (!activeLectureKey.value) return ''
  const lecture = lectures.value.find(l => l.key === activeLectureKey.value)
  return lecture?.title || `Лекция ${activeLectureKey.value.replace(/[^\d]/g, '')}`
})

function getTaskId(lectureKey, taskKey) {
  return `${lectureKey}.${taskKey}`
}

function isTaskCompleted(lectureKey, taskKey) {
  return completedTasks[getTaskId(lectureKey, taskKey)] === 'completed'
}

function markTaskCompleted(lectureKey, taskKey) {
  const taskId = getTaskId(lectureKey, taskKey)
  completedTasks[taskId] = 'completed'
  saveProgress()
}

function updateAnswer(lectureKey, taskKey, value) {
  const taskId = getTaskId(lectureKey, taskKey)
  taskAnswers[taskId] = value
  if (value.trim()) {
    if (completedTasks[taskId] !== 'completed') {
      completedTasks[taskId] = 'in-progress'
    }
  } else {
    delete completedTasks[taskId]
  }
  saveProgress()
}

function saveProgress() {
  localStorage.setItem('completedTasks', JSON.stringify(completedTasks))
  localStorage.setItem('taskAnswers', JSON.stringify(taskAnswers))
}

async function loadCourse() {
  const courseId = route.params.id
  if (!courseId) return
  
  loading.value = true
  setError('')
  lectureHtml.value = ''
  tasks.value = []
  activeLectureKey.value = null
  isEditing.value = false
  
  try {
    const data = await apiJson(`/courses/${courseId}/content`, {}, token.value)
    courseContent.value = data
    activeCourse.value = data.course
    // Загружаем сохраненные ответы для этого курса
    loadSavedAnswers()
  } catch (e) {
    setError(e.message)
  } finally {
    loading.value = false
  }
}

function loadSavedAnswers() {
  if (!activeCourse.value) return
  const courseId = activeCourse.value.id
  const saved = JSON.parse(localStorage.getItem(`course_${courseId}_answers`) || '{}')
  Object.assign(answers, saved)
}

function saveAnswers() {
  if (!activeCourse.value) return
  const courseId = activeCourse.value.id
  localStorage.setItem(`course_${courseId}_answers`, JSON.stringify(answers))
}

function renderMarkdown(text) {
  if (!text) return ''
  return marked(text)
}

function selectLecture(lecture) {
  if (!lecture) return
  activeLectureKey.value = lecture.key
  activeTaskKey.value = null
  lectureLoading.value = true
  lectureHtml.value = ''
  tasks.value = []
  isEditing.value = false
  
  setTimeout(() => {
    loadLectureContent(lecture)
  }, 100)
}

function selectTask(lecture, task) {
  selectLecture(lecture)
  activeTaskKey.value = task.key
  // Прокрутка к задаче будет через ref или через setTimeout
  setTimeout(() => {
    const element = document.querySelector(`[data-task-key="${task.key}"]`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 300)
}

function loadLectureContent(lecture) {
  try {
    // Поддерживаем новый формат с content (markdown) и старый формат с file_to_text
    if (lecture.content) {
      lectureHtml.value = lecture.content
    } else if (lecture.file_to_text) {
      fetch(lecture.file_to_text)
        .then(resp => resp.text())
        .then(text => {
          lectureHtml.value = text
        })
    }
    
    // Поддерживаем новый формат с tasks и старый формат с Tasks
    if (lecture.tasks && Array.isArray(lecture.tasks)) {
      tasks.value = lecture.tasks
    } else if (lecture.tasks && typeof lecture.tasks === 'object') {
      tasks.value = Object.entries(lecture.tasks).map(([key, value]) => ({
        key,
        ...(value || {})
      }))
    } else if (lecture.Tasks) {
      fetch(lecture.Tasks)
        .then(resp => resp.json())
        .then(json => {
          tasks.value = Object.entries(json).map(([key, value]) => ({
            key,
            ...(value || {})
          }))
        })
    }
    
    // Загружаем сохраненные ответы для этой лекции
    const lectureKey = lecture.key
    tasks.value.forEach(task => {
      const taskId = getTaskId(lectureKey, task.key)
      if (taskAnswers[taskId]) {
        answers[task.key] = taskAnswers[taskId]
      }
    })
  } catch (e) {
    setError(e.message)
  } finally {
    lectureLoading.value = false
  }
}

function startEditing() {
  if (!activeLectureKey.value) return
  const lecture = lectures.value.find(l => l.key === activeLectureKey.value)
  if (!lecture) return
  
  editForm.lectureTitle = lecture.title || `Лекция ${activeLectureKey.value.replace(/[^\d]/g, '')}`
  editForm.content = lecture.content || lectureHtml.value
  editForm.mode = 'markdown'
  isEditing.value = true
}

function cancelEditing() {
  isEditing.value = false
  editForm.lectureTitle = ''
  editForm.content = ''
}

async function saveLecture() {
  if (!activeLectureKey.value || !activeCourse.value) return
  
  loading.value = true
  setError('')
  
  try {
    const lecture = lectures.value.find(l => l.key === activeLectureKey.value)
    if (!lecture) return
    
    // Обновляем контент курса
    const updatedContent = { ...courseContent.value.content }
    updatedContent[activeLectureKey.value] = {
      ...updatedContent[activeLectureKey.value],
      title: editForm.lectureTitle,
      content: editForm.content
    }
    
    // Отправляем обновление на сервер
    await apiJson(`/courses/${activeCourse.value.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        content: updatedContent
      })
    }, token.value)
    
    // Обновляем локальные данные
    courseContent.value.content = updatedContent
    lectureHtml.value = editForm.content
    isEditing.value = false
    
    // Перезагружаем курс
    await loadCourse()
    selectLecture(lecture)
  } catch (e) {
    setError(e.message)
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, loadCourse, { immediate: true })
watch(answers, saveAnswers, { deep: true })
</script>

<style scoped>
.course-view-page {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
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

.course-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.course-body {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 24px;
}

.lesson-panel {
  background: white;
  border-radius: 8px;
  padding: 24px;
  border: 1px solid #e5e7eb;
}

.empty-state {
  text-align: center;
  padding: 120px 24px;
  color: #9ca3af;
}

.lesson-loading {
  text-align: center;
  padding: 48px;
  color: #6b7280;
}

.lesson-text {
  margin-bottom: 32px;
}

.lesson-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.lesson-header h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1f2328;
}

.btn-edit {
  padding: 8px 16px;
  border: 1px solid #2563eb;
  border-radius: 6px;
  background: white;
  color: #2563eb;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-edit:hover {
  background: #eff6ff;
}

.lesson-text div {
  font-size: 15px;
  line-height: 1.7;
  color: #374151;
}

.tasks {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid #e5e7eb;
}

.tasks h3 {
  margin: 0 0 24px;
  font-size: 20px;
  font-weight: 600;
  color: #1f2328;
}

.edit-mode {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.edit-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2328;
}

.edit-actions {
  display: flex;
  gap: 12px;
}

.edit-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.edit-content label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2328;
}

.edit-input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
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
  min-height: 300px;
  font-size: 14px;
  line-height: 1.7;
}

.btn-primary,
.btn-secondary {
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

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 1000px) {
  .course-body {
    grid-template-columns: 1fr;
  }
}
</style>
