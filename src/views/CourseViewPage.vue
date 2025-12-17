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
        <div class="course-side">
          <CourseTree
            :course-title="activeCourse.title"
            :topics="topics"
            :active-lecture-key="activeLectureKey"
            :is-creator="canEditCourse"
            :is-editing="isEditing"
            :completed-tasks="completedTasks"
            @select-lecture="selectLecture"
            @start-edit="startEditing"
          />
        </div>

        <section class="lesson-panel">
          <div v-if="progress" class="progress-bar">
            <div class="progress-top">
              <div class="progress-title">Прогресс по курсу</div>
              <div class="progress-value">{{ progress.completion_rate }}%</div>
            </div>
            <div class="progress-track">
              <div
                class="progress-fill"
                :style="{ width: `${progress.completion_rate || 0}%` }"
              ></div>
            </div>
            <div class="progress-stats">
              <span>Задачи: {{ progress.answered }} / {{ progress.total_tasks }}</span>
              <span>Оценено: {{ progress.rated }}</span>
              <span>В ожидании: {{ progress.pending_manual }}</span>
              <span v-if="progress.avg_grade !== null">Средняя: {{ progress.avg_grade }}/5</span>
            </div>
          </div>

          <div v-if="!activeLectureKey" class="empty-state">
            <p>Выберите лекцию из списка слева</p>
          </div>

          <template v-else>
            <div v-if="lectureLoading" class="lesson-loading">
              Загружаем лекцию и задачи...
            </div>

            <template v-else>
              <!-- Режим редактирования для создателя -->
              <div v-if="isEditing && canEditCourse" class="edit-mode">
                <div class="edit-header">
                  <h3>Редактирование лекции</h3>
                  <div class="edit-actions">
                    <button type="button" class="btn-secondary" @click="cancelEditing">Отмена</button>
                    <button
                      type="button"
                      class="btn-primary"
                      :disabled="savingLecture"
                      @click="saveLecture"
                    >
                      {{ savingLecture ? 'Сохранение...' : 'Сохранить' }}
                    </button>
                  </div>
                </div>

                <div class="edit-content">
                  <label>
                    Заголовок лекции
                    <input v-model="editForm.lectureTitle" class="edit-input" type="text" placeholder="Название лекции" />
                  </label>

                  <label>
                    Контент (Markdown)
                    <textarea
                      v-model="editForm.content"
                      class="markdown-editor"
                      rows="12"
                      placeholder="# Заголовок\nВаш текст..."
                    />
                  </label>

                  <div class="tasks-editor">
                    <div class="tasks-editor-header">
                      <h4>Задачи</h4>
                      <button type="button" class="btn-secondary" @click="addTask">+ Добавить задачу</button>
                    </div>

                    <div
                      v-for="(task, index) in editTasks"
                      :key="task.key || index"
                      class="task-editor-card"
                    >
                      <div class="task-editor-row">
                        <label>
                          Ключ задачи
                          <input v-model="task.key" class="edit-input" type="text" />
                        </label>
                        <label>
                          Тип
                          <select v-model="task.type" class="edit-input">
                            <option value="manual">Проверка вручную</option>
                            <option value="text_answer">Текстовый ответ</option>
                            <option value="single_choice">Один вариант</option>
                            <option value="multiple_choice">Несколько вариантов</option>
                          </select>
                        </label>
                      </div>

                      <label>
                        Текст задачи (html/markdown)
                        <textarea v-model="task.html" class="markdown-editor" rows="4" />
                      </label>

                      <div v-if="['single_choice','multiple_choice'].includes(task.type)" class="options-block">
                        <label>
                          Варианты (по одному в строке)
                          <textarea v-model="task.optionsText" class="markdown-editor" rows="4" />
                        </label>
                        <label>
                          Правильный ответ
                          <input
                            v-model="task.correct_answer"
                            class="edit-input"
                            :placeholder="task.type === 'single_choice' ? 'Индекс варианта, например 0' : 'Список индексов через запятую, напр. 0,2'"
                            type="text"
                          />
                        </label>
                      </div>

                      <div v-else-if="task.type === 'text_answer'" class="options-block">
                        <label>
                          Правильный ответ
                          <input v-model="task.correct_answer" class="edit-input" type="text" />
                        </label>
                        <label>
                          Placeholder
                          <input v-model="task.placeholder" class="edit-input" type="text" />
                        </label>
                      </div>

                      <label>
                        Описание/подсказка (опционально)
                        <input v-model="task.description" class="edit-input" type="text" />
                      </label>

                      <div class="task-editor-actions">
                        <button type="button" class="btn-danger" @click="removeTask(index)">Удалить задачу</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Обычный режим просмотра -->
              <template v-else>
                <article v-if="lectureHtml" class="lesson-text">
                  <div class="lesson-header">
                    <div>
                      <div class="topic-badge">{{ currentTopicTitle }}</div>
                      <h3>{{ currentLectureTitle }}</h3>
                    </div>
                    <button
                      v-if="canEditCourse"
                      type="button"
                      class="btn-secondary"
                      @click="startEditing"
                    >
                      ✏️ Редактировать
                    </button>
                  </div>
                  <div v-html="renderMarkdown(lectureHtml)" />
                </article>

                <section v-if="tasks.length" class="tasks">
                  <h3>Задачи</h3>
                  <div
                    v-for="task in tasks"
                    :key="task.key"
                    class="task-block"
                  >
                    <TaskCard
                      :task="task"
                      :model-value="getAnswerForTask(task.key) || ''"
                      :is-completed="isTaskGraded(task.key)"
                      :submission="getSubmissionForTask(task.key)"
                      :submitting="submittingTask"
                      @update:model-value="updateAnswer(currentTopicKey, activeLectureKey, task.key, $event)"
                      @submit="submitTask(task)"
                    />
                  </div>
                </section>

                <div v-if="isCreator && reviewSubmissions.length" class="lecture-divider"></div>
                
                <div
                  v-if="isCreator && reviewSubmissions.length"
                  class="reviews-section"
                >
                  <div class="reviews-header">
                    <h3>Проверка решений</h3>
                    <button
                      type="button"
                      class="btn-primary"
                      @click="showSubmissionsModal = true"
                    >
                      📋 Проверить ответы ({{ reviewSubmissions.length }})
                    </button>
                  </div>
                </div>

    <SubmissionsModal
      :is-open="showSubmissionsModal"
      :submissions="reviewSubmissions"
      :loading="submissionsLoading"
      :course-content="courseContent?.content || {}"
      @close="showSubmissionsModal = false"
      @grade="gradeSubmission"
    />

                <div class="lecture-end-sentinel"></div>
                <div v-if="nextLecture" class="next-lecture">
                  <button type="button" class="btn-next-simple" @click="goToNextLecture">
                    → Следующая: {{ nextLecture.title }}
                  </button>
                </div>
              </template>
            </template>
          </template>
        </section>
        <EditActionsPanel
          v-if="canEditCourse"
          class="edit-panel-wrapper"
          :course-status="courseStatus"
          :lecture-target-topic="lectureTargetTopic"
          :topic-title-draft="topicTitleDraft"
          :topics="topics"
          :active-topic-key="activeTopicKey"
          :active-lecture-key="activeLectureKey"
          :saving-course-meta="savingCourseMeta"
          :deleting-course="deletingCourse"
          @update:course-status="val => courseStatus = val"
          @update:lecture-target-topic="val => lectureTargetTopic = val"
          @update:topic-title-draft="val => topicTitleDraft = val"
          @save-course="saveCourseMeta"
          @delete-course="deleteCourse"
          @add-topic="addTopic"
          @add-lecture="addLecture"
          @delete-lecture="deleteLecture"
          @delete-topic="deleteTopic"
          @rename-topic="renameTopic"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useApi } from '../composables/useApi'
import { marked } from 'marked'
import CourseTree from '../components/CourseTree.vue'
import TaskCard from '../components/TaskCard.vue'
import SubmissionsModal from '../components/SubmissionsModal.vue'
import EditActionsPanel from '../components/EditActionsPanel.vue'

const route = useRoute()
const router = useRouter()
const { token, profile, loadProfile } = useAuth()
const { error, setError, loading, apiJson } = useApi()

const courseContent = ref(null)
const activeCourse = ref(null)
const activeTopicKey = ref(null)
const activeLectureKey = ref(null)
const activeTaskKey = ref(null)
const lectureHtml = ref('')
const tasks = ref([])
const lectureLoading = ref(false)
const isEditing = ref(false)
const savingLecture = ref(false)
const savingCourseMeta = ref(false)
const deletingCourse = ref(false)
const editForm = reactive({
  lectureTitle: '',
  content: '',
  mode: 'markdown'
})
const editTasks = ref([])
const editingKeys = reactive({ topicKey: null, lectureKey: null })
const courseStatus = ref('draft')
const lectureTargetTopic = ref('')
const topicTitleDraft = ref('')
const newTopicCounter = ref(1)
const newLectureCounter = ref(1)

// Submissions
const mySubmissions = ref([])
const reviewSubmissions = ref([])
const submissionsLoading = ref(false)
const userNames = ref({}) // Кэш имен пользователей
const showSubmissionsModal = ref(false)
const submittingTask = ref(false)
const progress = ref(null)

const lectureCache = reactive({})

// Сохранение прогресса задач в localStorage
const completedTasks = reactive(JSON.parse(localStorage.getItem('completedTasks') || '{}'))
const taskAnswers = reactive(JSON.parse(localStorage.getItem('taskAnswers') || '{}'))

const isCreator = computed(() => {
  return activeCourse.value?.creator_id === profile.value?.id
})
const canEditCourse = computed(() => {
  if (!profile.value) return false
  return profile.value.role === 'Admin' || isCreator.value
})

// Преобразуем структуру курса в формат для отображения
const topics = computed(() => {
  if (!courseContent.value?.content) return []
  
  const entries = Object.entries(courseContent.value.content)
  
  // Проверяем, есть ли темы (новый формат)
  const firstEntry = entries[0]
  if (firstEntry && firstEntry[1] && firstEntry[1].lectures) {
    // Новый формат: Topic -> Lectures -> Tasks
    return entries.map(([topicKey, topicValue]) => {
      const topic = {
        key: topicKey,
        title: topicValue.title || `Тема ${topicKey.replace(/[^\d]/g, '')}`,
        lectures: []
      }
      
      if (topicValue.lectures) {
        const lectureEntries = Object.entries(topicValue.lectures)
        topic.lectures = lectureEntries.map(([lectureKey, lectureValue]) => {
          const lecture = {
            key: `${topicKey}.${lectureKey}`,
            title: lectureValue.title || `Лекция ${lectureKey.replace(/[^\d]/g, '')}`,
            content: lectureValue.content || '',
            file_to_text: lectureValue.file_to_text || null,
            tasks: []
          }
          
          if (lectureValue.tasks) {
            lecture.tasks = Object.entries(lectureValue.tasks).map(([taskKey, taskValue]) => ({
              key: taskKey,
              type: taskValue?.type || 'manual', // auto или manual
              ...(taskValue || {})
            }))
          }
          
          return lecture
        })
      }
      
      return topic
    })
  } else {
    // Старый формат: Lectures -> Tasks (без тем)
    // Преобразуем в новый формат с одной темой
    return [{
      key: 'default',
      title: 'Основная тема',
      lectures: entries.map(([lectureKey, lectureValue]) => {
        const lecture = {
          key: `default.${lectureKey}`,
          title: lectureValue.title || `Лекция ${lectureKey.replace(/[^\d]/g, '')}`,
          content: lectureValue.content || '',
          file_to_text: lectureValue.file_to_text || null,
          Tasks: lectureValue.Tasks || null,
          tasks: []
        }
        
        if (lectureValue.tasks) {
          lecture.tasks = Object.entries(lectureValue.tasks).map(([taskKey, taskValue]) => ({
            key: taskKey,
            type: taskValue?.type || 'manual', // auto или manual
            ...(taskValue || {})
          }))
        }
        
        return lecture
      })
    }]
  }
})

const currentTopicTitle = computed(() => {
  if (!activeTopicKey.value) return ''
  const topic = topics.value.find(t => t.key === activeTopicKey.value)
  return topic?.title || ''
})

const currentLectureTitle = computed(() => {
  if (!activeLectureKey.value) return ''
  const [topicKey, lectureKey] = activeLectureKey.value.split('.')
  const topic = topics.value.find(t => t.key === topicKey)
  if (!topic) return ''
  const lecture = topic.lectures.find(l => l.key === activeLectureKey.value)
  return lecture?.title || `Лекция ${lectureKey?.replace(/[^\d]/g, '') || ''}`
})

function getTaskId(topicKey, lectureKey, taskKey) {
  return `${topicKey}.${lectureKey}.${taskKey}`
}

function getAnswerForTask(taskKey) {
  if (!activeTopicKey.value || !activeLectureKey.value) return ''
  const taskId = getTaskId(activeTopicKey.value, activeLectureKey.value, taskKey)
  return taskAnswers[taskId] || ''
}

function updateAnswer(topicKey, lectureKey, taskKey, value) {
  const taskId = getTaskId(topicKey, lectureKey, taskKey)
  taskAnswers[taskId] = value
  if (value && (typeof value === 'string' ? value.trim() : value)) {
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

  Object.keys(lectureCache).forEach(key => {
    delete lectureCache[key]
  })

  lectureHtml.value = ''
  tasks.value = []
  activeTopicKey.value = null
  activeLectureKey.value = null
  isEditing.value = false
  courseStatus.value = activeCourse.value?.status || 'draft'
  
  try {
    // Убеждаемся, что профиль загружен
    if (!profile.value) {
      await loadProfile()
    }
    
    const data = await apiJson(`/courses/${courseId}/content`, {}, token.value)
    courseContent.value = data
    activeCourse.value = data.course
    // Загружаем сохраненные ответы для этого курса
    loadSavedAnswers()
    
    // Ждем обновления computed свойств
    await nextTick()
    await loadProgress()
    
    // Если есть параметр edit=true в URL и пользователь создатель, открываем первую лекцию в режиме редактирования
    if (route.query.edit === 'true') {
      // Даем время на обновление всех computed свойств
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Проверяем еще раз после загрузки данных
      const creatorCheck = activeCourse.value?.creator_id === profile.value?.id
      const hasTopics = topics.value.length > 0
      
      if (creatorCheck && hasTopics) {
        const firstTopic = topics.value[0]
        if (firstTopic.lectures.length > 0) {
          const firstLecture = firstTopic.lectures[0]
          await selectLecture(firstTopic, firstLecture)
          // Ждем загрузки контента лекции
          await new Promise(resolve => setTimeout(resolve, 1000))
          startEditing()
        }
      }
    }
  } catch (e) {
    setError(e.message)
  } finally {
    loading.value = false
  }
}

function loadSavedAnswers() {
  // Ответы уже загружены из taskAnswers в loadLectureContent
  // Эта функция больше не нужна, но оставляем для совместимости
}

function renderMarkdown(text) {
  if (!text) return ''
  // Чистим возможные script-теги из markdown, чтобы не исполнялись в браузере
  const sanitized = text.replace(/<script[\s\S]*?<\/script>/gi, '')
  const escapedScript = sanitized.replace(/<script/gi, '&lt;script')
  return marked(escapedScript)
}

async function selectLecture(topic, lecture) {
  if (!lecture || !topic) return

  if (lectureCache[lecture.key]) {
  activeTopicKey.value = topic.key
  activeLectureKey.value = lecture.key

  const cache = lectureCache[lecture.key]
  lectureHtml.value = cache.html
  tasks.value = cache.tasks

  // Прокрутка вверх при повторном выборе той же лекции
  nextTick(() => {
    const panel = document.querySelector('.lesson-panel')
    if (panel) panel.scrollTo({ top: 0, behavior: 'smooth' })
  })

  // Сразу загружаем submissions, но без перерисовки
  loadSubmissions()

  // И прекращаем выполнение
  return
}

  activeTopicKey.value = topic.key
  activeLectureKey.value = lecture.key
  activeTaskKey.value = null
  lectureLoading.value = true
  lectureHtml.value = ''
  tasks.value = []
  isEditing.value = false
  
  return new Promise((resolve) => {
    setTimeout(async () => {
      await loadLectureContent(topic, lecture)
      await loadSubmissions()
      setupAutoNext()
      resolve()
    }, 100)
  })
}


async function loadLectureContent(topic, lecture) {
  lectureLoading.value = true
  lectureHtml.value = null
  tasks.value = null

  try {
    let html = null
    let taskList = null

    // ---- ЗАГРУЖАЕМ HTML ----
    if (lecture.content) {
      html = lecture.content
    } else if (lecture.file_to_text) {
      const text = await fetch(lecture.file_to_text).then(r => r.text())
      html = text
    } else {
      html = ''
    }

    // ---- ЗАГРУЖАЕМ ЗАДАЧИ ----
    if (lecture.tasks && Array.isArray(lecture.tasks)) {
      taskList = lecture.tasks
    } else if (lecture.Tasks) {
      const json = await fetch(lecture.Tasks).then(r => r.json())
      taskList = Object.entries(json).map(([taskKey, taskValue]) => ({
        key: taskKey,
        type: taskValue?.type || 'manual',
        ...(taskValue || {})
      }))
    } else {
      taskList = []
    }

    // Устанавливаем в реактивные переменные
    lectureHtml.value = html
    tasks.value = taskList

    // ---- ЗАПИСЫВАЕМ В КЭШ ТОЛЬКО ОДИН РАЗ ----
    lectureCache[lecture.key] = {
      html,
      tasks: taskList
    }

  } catch (e) {
    setError(e.message)
  } finally {
    lectureLoading.value = false
  }
}


function startEditing() {
  if (!activeLectureKey.value || !activeTopicKey.value) return
  const [topicKey, lectureKey] = activeLectureKey.value.split('.')
  const topic = topics.value.find(t => t.key === topicKey)
  if (!topic) return
  const lecture = topic.lectures.find(l => l.key === activeLectureKey.value)
  if (!lecture) return
  
  editForm.lectureTitle = lecture.title || `Лекция ${lectureKey?.replace(/[^\d]/g, '') || ''}`
  // Используем content из лекции, если есть, иначе текущий lectureHtml
  editForm.content = lecture.content || lectureHtml.value || ''
  editForm.mode = 'markdown'
  editTasks.value = (lecture.tasks || []).map((task, idx) => {
    const clone = { ...task }
    return {
      key: task.key || `task${idx + 1}`,
      html: task.html || '',
      type: task.type || 'manual',
      optionsText: Array.isArray(task.options) ? task.options.join('\n') : '',
      // храним как 1-based для удобства ручного ввода на клиенте,
      // но в сохранении переведем обратно в 0-based
      correct_answer: convertCorrectAnswerToOneBased(clone),
      placeholder: '',
      description: ''
    }
  })
  editingKeys.topicKey = topicKey
  editingKeys.lectureKey = lectureKey
  isEditing.value = true
}

function cancelEditing() {
  isEditing.value = false
  savingLecture.value = false
  editingKeys.topicKey = null
  editingKeys.lectureKey = null
}

function nextTopicKey() {
  const existing = Object.keys(courseContent.value?.content || {})
  let idx = existing.length + newTopicCounter.value
  let key = `Topic${idx}`
  while (existing.includes(key)) {
    idx += 1
    key = `Topic${idx}`
  }
  newTopicCounter.value = idx + 1
  return key
}

function nextLectureKey(topicKey) {
  const topic = courseContent.value?.content?.[topicKey]
  const existing = topic?.lectures ? Object.keys(topic.lectures) : []
  let idx = existing.length + newLectureCounter.value
  let key = `Lecture${idx}`
  while (existing.includes(key)) {
    idx += 1
    key = `Lecture${idx}`
  }
  newLectureCounter.value = idx + 1
  return key
}

async function saveContent(updatedContent, keepSelection = false) {
  if (!canEditCourse.value || !activeCourse.value?.id) return
  setError('')
  await apiJson(
    `/courses/${activeCourse.value.id}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        title: activeCourse.value.title,
        status: courseStatus.value,
        content: updatedContent
      })
    },
    token.value
  )
  courseContent.value = { ...courseContent.value, content: updatedContent }
  if (!keepSelection) {
    activeTopicKey.value = null
    activeLectureKey.value = null
  }
}

async function addTopic() {
  if (!canEditCourse.value || !courseContent.value?.content) return
  const key = nextTopicKey()
  const title = `Новая тема ${key.replace('Topic', '')}`
  const updated = JSON.parse(JSON.stringify(courseContent.value.content))
  updated[key] = { title, lectures: {} }
  await saveContent(updated, true)
  lectureTargetTopic.value = key
  topicTitleDraft.value = title
}

async function addLecture() {
  if (!canEditCourse.value || !courseContent.value?.content) return
  const targetKey = lectureTargetTopic.value || activeTopicKey.value || Object.keys(courseContent.value.content)[0]
  if (!targetKey) return
  const topic = courseContent.value.content[targetKey]
  if (!topic) return
  const lkey = nextLectureKey(targetKey)
  const ltitle = `Новая лекция ${lkey.replace('Lecture', '')}`
  const updated = JSON.parse(JSON.stringify(courseContent.value.content))
  if (!updated[targetKey].lectures) {
    updated[targetKey].lectures = {}
  }
  updated[targetKey].lectures[lkey] = { title: ltitle, content: '', tasks: {} }
  await saveContent(updated, true)
  // выбрать новую лекцию
  lectureTargetTopic.value = targetKey
  const newTopicTitle = courseContent.value.content[targetKey]?.title || ''
  topicTitleDraft.value = newTopicTitle
  activeTopicKey.value = targetKey
  const topicObj = topics.value.find(t => t.key === targetKey)
  if (topicObj) {
    const lectureObj = topicObj.lectures.find(l => l.key === `${targetKey}.${lkey}`)
    if (lectureObj) {
      await selectLecture(topicObj, lectureObj)
      startEditing()
    }
  }
}

async function deleteLecture() {
  if (!canEditCourse.value || !activeLectureKey.value || !activeTopicKey.value) return
  if (!window.confirm('Удалить выбранную лекцию и её задачи?')) return
  const updated = JSON.parse(JSON.stringify(courseContent.value.content))
  const topic = updated[activeTopicKey.value]
  if (!topic?.lectures || !topic.lectures[activeLectureKey.value.split('.')[1]]) return
  delete topic.lectures[activeLectureKey.value.split('.')[1]]
  await saveContent(updated)
  isEditing.value = false
  lectureHtml.value = ''
  tasks.value = []
}

async function deleteTopic() {
  const targetKey = lectureTargetTopic.value || activeTopicKey.value
  if (!canEditCourse.value || !targetKey) return
  if (!window.confirm('Удалить тему и все её лекции?')) return
  const updated = JSON.parse(JSON.stringify(courseContent.value.content))
  delete updated[targetKey]
  await saveContent(updated)
  isEditing.value = false
  lectureHtml.value = ''
  tasks.value = []
  lectureTargetTopic.value = Object.keys(updated)[0] || ''
  topicTitleDraft.value = lectureTargetTopic.value
}

async function renameTopic() {
  if (!canEditCourse.value || !lectureTargetTopic.value || !topicTitleDraft.value || !courseContent.value?.content) return
  const updated = JSON.parse(JSON.stringify(courseContent.value.content))
  if (!updated[lectureTargetTopic.value]) return
  updated[lectureTargetTopic.value].title = topicTitleDraft.value
  await saveContent(updated, true)
}

function addTask() {
  editTasks.value.push({
    key: `task${editTasks.value.length + 1}`,
    html: '',
    type: 'manual',
    optionsText: '',
    correct_answer: '',
    placeholder: '',
    description: ''
  })
}

function removeTask(index) {
  editTasks.value.splice(index, 1)
}

function normalizeTasksForSave() {
  const tasksObj = {}
  editTasks.value.forEach((task, idx) => {
    const taskKey = (task.key || `task${idx + 1}`).trim()
    const base = {
      html: task.html || '',
      type: task.type || 'manual'
    }

    if (task.optionsText && ['single_choice', 'multiple_choice'].includes(base.type)) {
      base.options = task.optionsText.split('\n').map(o => o.trim()).filter(Boolean)
    }

    if (base.type === 'single_choice') {
      // сохраняем обратно в 0-based
      base.correct_answer = Math.max(0, Number(task.correct_answer ?? 1) - 1)
    } else if (base.type === 'multiple_choice') {
      const numbers = String(task.correct_answer || '')
        .split(',')
        .map(v => v.trim())
        .filter(Boolean)
        .map(v => Number(v) - 1) // 1-based -> 0-based
        .filter(v => !Number.isNaN(v) && v >= 0)
      base.correct_answer = numbers
    } else if (base.type === 'text_answer') {
      base.correct_answer = task.correct_answer ?? ''
    }

    tasksObj[taskKey] = base
  })
  return tasksObj
}

function convertCorrectAnswerToOneBased(task) {
  if (!task) return ''
  if (task.type === 'single_choice') {
    const val = task.correct_answer
    if (val === undefined || val === null) return ''
    const num = Number(val)
    return Number.isNaN(num) ? '' : String(num + 1)
  }
  if (task.type === 'multiple_choice') {
    const val = task.correct_answer
    if (!val) return ''
    try {
      const arr = Array.isArray(val) ? val : JSON.parse(val)
      if (!Array.isArray(arr)) return ''
      return arr.map(v => Number(v) + 1).filter(v => !Number.isNaN(v)).join(',')
    } catch {
      return ''
    }
  }
  // текст/ручные — отдаём как есть
  return task.correct_answer ?? ''
}

async function saveLecture() {
  if (!canEditCourse.value || !editingKeys.topicKey || !editingKeys.lectureKey || !activeCourse.value?.id) return
  savingLecture.value = true
  setError('')
  try {
    const updatedContent = JSON.parse(JSON.stringify(courseContent.value.content))
    const topic = updatedContent[editingKeys.topicKey]
    if (!topic || !topic.lectures || !topic.lectures[editingKeys.lectureKey]) {
      throw new Error('Не удалось найти лекцию для сохранения')
    }
    const tasksObj = normalizeTasksForSave()

    topic.lectures[editingKeys.lectureKey] = {
      ...topic.lectures[editingKeys.lectureKey],
      title: editForm.lectureTitle || topic.lectures[editingKeys.lectureKey].title,
      content: editForm.content || '',
      tasks: tasksObj
    }

    await apiJson(
      `/courses/${activeCourse.value.id}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          title: activeCourse.value.title,
          status: courseStatus.value || activeCourse.value.status,
          content: updatedContent
        })
      },
      token.value
    )

    // Обновляем локально
    courseContent.value = {
      ...courseContent.value,
      content: updatedContent
    }
    // Сбрасываем кэш для текущей лекции
    lectureCache[editingKeys.lectureKey] = {
      html: editForm.content,
      tasks: Object.entries(tasksObj).map(([key, val]) => ({ key, ...val }))
    }
    lectureHtml.value = editForm.content
    tasks.value = lectureCache[editingKeys.lectureKey].tasks
    isEditing.value = false
  } catch (e) {
    setError(e.message || 'Не удалось сохранить лекцию')
  } finally {
    savingLecture.value = false
  }
}

async function saveCourseMeta() {
  if (!canEditCourse.value || !activeCourse.value?.id) return
  savingCourseMeta.value = true
  setError('')
  try {
    await apiJson(
      `/courses/${activeCourse.value.id}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          title: activeCourse.value.title,
          status: courseStatus.value,
          content: courseContent.value?.content || {}
        })
      },
      token.value
    )
    activeCourse.value = { ...activeCourse.value, status: courseStatus.value }
  } catch (e) {
    setError(e.message || 'Не удалось сохранить курс')
  } finally {
    savingCourseMeta.value = false
  }
}

async function deleteCourse() {
  if (!canEditCourse.value || !activeCourse.value?.id) return
  if (!window.confirm('Удалить курс без возможности восстановления?')) return
  deletingCourse.value = true
  setError('')
  try {
    await apiJson(
      `/courses/${activeCourse.value.id}`,
      { method: 'DELETE' },
      token.value
    )
    router.push('/courses')
  } catch (e) {
    setError(e.message || 'Не удалось удалить курс')
  } finally {
    deletingCourse.value = false
  }
}





const currentTopicKey = computed(() => activeTopicKey.value || '')

// Находим следующую лекцию
const nextLecture = computed(() => {
  if (!activeLectureKey.value || !topics.value.length) return null
  
  const [topicKey] = activeLectureKey.value.split('.')
  const topic = topics.value.find(t => t.key === topicKey)
  if (!topic) return null
  
  const currentIndex = topic.lectures.findIndex(l => l.key === activeLectureKey.value)
  if (currentIndex < topic.lectures.length - 1) {
    return topic.lectures[currentIndex + 1]
  }
  
  // Ищем в следующей теме
  const topicIndex = topics.value.findIndex(t => t.key === topicKey)
  if (topicIndex < topics.value.length - 1) {
    const nextTopic = topics.value[topicIndex + 1]
    if (nextTopic.lectures.length > 0) {
      return nextTopic.lectures[0]
    }
  }
  
  return null
})

// Функции для работы с submissions
async function loadSubmissions() {
  if (!activeCourse.value?.id || !activeLectureKey.value) return
  
  submissionsLoading.value = true
  try {
    const [topicKey, lectureKey] = activeLectureKey.value.split('.')
    
    // Загружаем свои submissions постранично (берем текущую лекцию)
    const mySubsResp = await apiJson(
      `/submissions/mine?course_id=${activeCourse.value.id}&lecture_key=${lectureKey}&page_size=100`,
      {},
      token.value
    )
    const mySubs = mySubsResp?.items ?? mySubsResp ?? []
    // Фильтруем по теме и лекции
    mySubmissions.value = (mySubs || []).filter(
      s => s.topic_key === topicKey && s.lecture_key === lectureKey
    )
    
    // Загружаем submissions для проверки (если преподаватель)
    if (canEditCourse.value) {
      const reviewResp = await apiJson(
        `/submissions/review?course_id=${activeCourse.value.id}&lecture_key=${lectureKey}&page_size=100`,
        {},
        token.value
      )
      const reviewSubs = reviewResp?.items ?? reviewResp ?? []
      // Фильтруем по теме и лекции и исключаем свои ответы
      reviewSubmissions.value = (reviewSubs || []).filter(
        s => s.topic_key === topicKey && 
             s.lecture_key === lectureKey &&
             s.user_id !== profile.value?.id  // Исключаем свои ответы
      )
      
      // Загружаем имена пользователей
      await loadUserNames(reviewSubmissions.value)
    }
  } catch (e) {
    console.error('Ошибка загрузки submissions:', e)
    // Не показываем ошибку пользователю, просто логируем
  } finally {
    submissionsLoading.value = false
  }
}

async function loadProgress() {
  if (!activeCourse.value?.id) return
  try {
    const resp = await apiJson(
      `/submissions/progress?course_id=${activeCourse.value.id}`,
      {},
      token.value
    )
    progress.value = resp
  } catch (e) {
    // не блокируем отображение
    console.warn('Ошибка загрузки прогресса', e)
  }
}

function getSubmissionForTask(taskKey) {
  if (!activeTopicKey.value || !activeLectureKey.value) return null
  const [topicKey, lectureKey] = activeLectureKey.value.split('.')
  return mySubmissions.value.find(
    s => s.topic_key === topicKey && 
         s.lecture_key === lectureKey && 
         s.task_key === taskKey
  ) || null
}


function isTaskGraded(taskKey) {
  const sub = getSubmissionForTask(taskKey)
  return sub?.status === 'rated'
}

async function loadUserNames(submissions) {
  // Собираем уникальные user_id
  const userIds = [...new Set(submissions.map(s => s.user_id).filter(id => id != null))]
  
  // Сначала проверяем, есть ли имена в самих submissions (если API их возвращает)
  submissions.forEach(sub => {
    if (sub.user_id && sub.user_name && !userNames.value[sub.user_id]) {
      userNames.value[sub.user_id] = sub.user_name
    }
  })
  
  // Загружаем имена для тех пользователей, которых еще нет в кэше
  const missingIds = userIds.filter(id => !userNames.value[id])
  
  if (missingIds.length === 0) return
  
  // Загружаем информацию о пользователях через API профилей
  try {
    for (const userId of missingIds) {
      try {
        const userData = await apiJson(`/profile/user/${userId}`, {}, token.value)
        userNames.value[userId] = userData.name || `Студент #${userId}`
      } catch {
        // Если endpoint не существует или нет доступа, используем заглушку
        userNames.value[userId] = `Студент #${userId}`
      }
    }
  } catch (e) {
    console.error('Ошибка загрузки имен пользователей:', e)
    // Заполняем заглушками
    missingIds.forEach(id => {
      if (!userNames.value[id]) {
        userNames.value[id] = `Студент #${id}`
      }
    })
  }
}


async function submitTask(task) {
  if (!activeCourse.value?.id || !activeTopicKey.value || !activeLectureKey.value) return
  
  const answer = getAnswerForTask(task.key) || ''
  
  // Проверяем, что ответ не пустой (для разных типов задач)
  let answerStr = ''
  if (task.type === 'multiple_choice') {
    // Для множественного выбора ответ - это JSON массив
    try {
      const arr = JSON.parse(answer)
      if (!Array.isArray(arr) || arr.length === 0) return
      answerStr = JSON.stringify(arr)
    } catch {
      return
    }
  } else if (typeof answer === 'string') {
    if (!answer.trim()) return
    answerStr = answer.trim()
  } else {
    answerStr = String(answer)
  }
  
  const [topicKey, lectureKey] = activeLectureKey.value.split('.')
  
  try {
    submittingTask.value = true
    await apiJson(
      '/submissions',
      {
        method: 'POST',
        body: JSON.stringify({
          course_id: activeCourse.value.id,
          topic_key: topicKey,
          lecture_key: lectureKey,
          task_key: task.key,
          answer: answerStr
        })
      },
      token.value
    )
    
    // Обновляем список submissions
    await loadSubmissions()
    
    // Обновляем локальный ответ
    const taskId = getTaskId(topicKey, lectureKey, task.key)
    taskAnswers[taskId] = answer
    saveProgress()
  } catch (e) {
    setError(e.message || 'Ошибка при отправке решения')
  } finally {
    submittingTask.value = false
  }
}

async function gradeSubmission(submission) {
  if (!activeCourse.value?.id) return
  
  // Валидация оценки (1-5)
  if (submission.grade !== null && (submission.grade < 1 || submission.grade > 5)) {
    setError('Оценка должна быть от 1 до 5')
    return
  }
  
  try {
    loading.value = true
    await apiJson(
      `/submissions/${submission.id}/grade`,
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'rated',
          grade: submission.grade,
          teacher_comment: submission.teacher_comment || null
        })
      },
      token.value
    )
    
    // Обновляем список submissions
    await loadSubmissions()
  } catch (e) {
    setError(e.message || 'Ошибка при сохранении оценки')
  } finally {
    loading.value = false
  }
}

function goToNextLecture() {
  if (!nextLecture.value) return
  const topic = topics.value.find(t => 
    t.lectures.some(l => l.key === nextLecture.value.key)
  )
  if (topic) {
    selectLecture(topic, nextLecture.value)
  }
}

// Автоперелистывание при прокрутке до конца лекции
let scrollCheckInterval = null
let intersectionObserver = null

function setupAutoNext() {
  // Очищаем предыдущие обработчики
  if (scrollCheckInterval) {
    clearInterval(scrollCheckInterval)
  }
  if (intersectionObserver) {
    intersectionObserver.disconnect()
  }
  
  // Используем Intersection Observer для отслеживания видимости конца контента
  nextTick(() => {
    const sentinel = document.querySelector('.lecture-end-sentinel')
    if (sentinel && nextLecture.value) {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Конец лекции виден - можно показать кнопку следующей лекции
              const nextBtn = document.querySelector('.next-lecture')
              if (nextBtn) {
                nextBtn.style.opacity = '1'
                nextBtn.style.transform = 'translateY(0)'
              }
            }
          })
        },
        { threshold: 0.1 }
      )
      intersectionObserver.observe(sentinel)
    }
  })
}

watch(() => route.params.id, loadCourse, { immediate: true })
watch(() => route.query.edit, async (newVal) => {
  // Если параметр edit изменился на 'true' и курс уже загружен
  if (newVal === 'true' && courseContent.value && canEditCourse.value && topics.value.length > 0 && !isEditing.value) {
    await nextTick()
    const firstTopic = topics.value[0]
    if (firstTopic.lectures.length > 0) {
      const firstLecture = firstTopic.lectures[0]
      await selectLecture(firstTopic, firstLecture)
      setTimeout(() => {
        startEditing()
      }, 600)
    }
  }
})
// Ответы сохраняются через updateAnswer -> saveProgress
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

.course-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f9fafb;
  position: sticky;
  top: 0;
  z-index: 2;
}

.course-actions-main {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.course-meta {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.inline-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-weight: 600;
  color: #1f2328;
}

.inline-field.compact span {
  font-weight: 500;
  color: #4b5563;
}

.input.select {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #fff;
  font-size: 14px;
  min-width: 150px;
}

.course-actions-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.course-actions .btn-secondary {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  font-weight: 600;
  color: #1f2328;
  text-decoration: none;
  transition: all 0.2s;
}

.course-actions .btn-secondary:hover {
  background: #f3f4f6;
}

.course-actions .ghost {
  background: transparent;
}

.tree-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.tree-actions .btn-secondary,
.tree-actions .btn-danger {
  padding: 8px 12px;
  font-size: 13px;
}

.tree-actions-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.structure-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.structure-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pill-btn {
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #1f2937;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pill-btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.pill-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pill-btn.danger {
  border-color: #fecaca;
  color: #b91c1c;
}

.pill-btn.danger:hover:not(:disabled) {
  background: #fef2f2;
}

.btn-danger {
  padding: 10px 16px;
  border-radius: 6px;
  border: 1px solid #dc2626;
  background: #ef4444;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
  border-color: #dc2626;
}

.btn-danger.ghost {
  background: #fff8f8;
  color: #b91c1c;
  border-color: #fca5a5;
}

.btn-danger.ghost:hover:not(:disabled) {
  background: #fee2e2;
}

.course-body {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr) 280px;
  gap: 20px;
}

.course-side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: sticky;
  top: 24px;
  align-self: start;
}

.lesson-panel {
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  box-shadow: inset 0 1px 0 #f1f5f9;
}

.progress-bar {
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-title {
  font-weight: 700;
  color: #0f172a;
  font-size: 14px;
}

.progress-value {
  font-weight: 700;
  color: #2563eb;
}

.progress-track {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #22c55e);
  border-radius: 999px;
}

.progress-stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 13px;
  color: #475569;
}

.empty-state {
  text-align: center;
  padding: 120px 24px;
  color: #9ca3af;
}

.lesson-loading {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.lesson-text {
  margin-bottom: 28px;
}

.lesson-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.topic-badge {
  display: inline-block;
  padding: 4px 12px;
  background: #eff6ff;
  color: #1e40af;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
}

.lesson-header h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}

.btn-edit-icon {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #6b7280;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1;
}

.btn-edit-icon:hover {
  background: #f9fafb;
  border-color: #9ca3af;
  color: #374151;
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

.tasks-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tasks-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-editor-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #f9fafb;
}

.task-editor-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.task-editor-actions {
  display: flex;
  justify-content: flex-end;
}

.options-block {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
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

.lecture-end-sentinel {
  height: 1px;
  margin-top: 48px;
}

.next-lecture {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  text-align: center;
}

.btn-next-simple {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-next-simple:hover {
  background: #f9fafb;
  border-color: #9ca3af;
  color: #1f2328;
}

.lecture-divider {
  margin: 48px 0;
  height: 3px;
  background: linear-gradient(to right, transparent, #d1d5db, transparent);
  border-radius: 2px;
}

.reviews-section {
  margin-top: 32px;
  padding: 20px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.reviews-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reviews-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2328;
}

.reviews h3 {
  margin: 0 0 24px;
  font-size: 20px;
  font-weight: 600;
  color: #1f2328;
}


.btn-primary.small {
  padding: 8px 16px;
  font-size: 13px;
}

@media (max-width: 1100px) {
  .course-body {
    grid-template-columns: 1fr;
  }

  .edit-panel-wrapper {
    order: 3;
  }

  .course-side {
    order: 1;
  }

  .lesson-panel {
    order: 2;
  }
}
</style>
