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
          :topics="topics"
          :active-lecture-key="activeLectureKey"
          :is-creator="isCreator"
          :is-editing="isEditing"
          :completed-tasks="completedTasks"
          @select-lecture="selectLecture"
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
                    <div>
                      <div class="topic-badge">{{ currentTopicTitle }}</div>
                      <h3>{{ currentLectureTitle }}</h3>
                    </div>
                    <button
                      v-if="isCreator"
                      type="button"
                      class="btn-edit-small"
                      @click="startEditing"
                      title="Редактировать лекцию"
                    >
                      ✏️
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
                      :submitting="loading"
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useApi } from '../composables/useApi'
import { marked } from 'marked'
import CourseTree from '../components/CourseTree.vue'
import TaskCard from '../components/TaskCard.vue'
import SubmissionsModal from '../components/SubmissionsModal.vue'

const route = useRoute()
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
const editForm = reactive({
  lectureTitle: '',
  content: '',
  mode: 'markdown'
})

// Submissions
const mySubmissions = ref([])
const reviewSubmissions = ref([])
const submissionsLoading = ref(false)
const userNames = ref({}) // Кэш имен пользователей
const showSubmissionsModal = ref(false)

// Сохранение прогресса задач в localStorage
const completedTasks = reactive(JSON.parse(localStorage.getItem('completedTasks') || '{}'))
const taskAnswers = reactive(JSON.parse(localStorage.getItem('taskAnswers') || '{}'))

const isCreator = computed(() => {
  return activeCourse.value?.creator_id === profile.value?.id
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
  lectureHtml.value = ''
  tasks.value = []
  activeTopicKey.value = null
  activeLectureKey.value = null
  isEditing.value = false
  
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
  return marked(text)
}

async function selectLecture(topic, lecture) {
  if (!lecture || !topic) return
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


function loadLectureContent(topic, lecture) {
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
        .catch(() => {
          lectureLoading.value = false
        })
    }
    
    // Задачи уже в правильном формате из topics computed
    if (lecture.tasks && Array.isArray(lecture.tasks) && lecture.tasks.length > 0) {
      tasks.value = lecture.tasks
    } else if (lecture.Tasks) {
      // Старый формат с Tasks (URL на JSON файл)
      fetch(lecture.Tasks)
        .then(resp => resp.json())
        .then(json => {
          tasks.value = Object.entries(json).map(([taskKey, taskValue]) => ({
            key: taskKey,
            type: taskValue?.type || 'manual', // auto или manual
            ...(taskValue || {})
          }))
        })
        .catch(() => {
          tasks.value = []
        })
    } else {
      tasks.value = []
    }
    
    // Ответы загружаются через getAnswerForTask, не нужно заполнять answers
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
  isEditing.value = true
}

function cancelEditing() {
  isEditing.value = false
  editForm.lectureTitle = ''
  editForm.content = ''
}

async function saveLecture() {
  if (!activeLectureKey.value || !activeTopicKey.value || !activeCourse.value) return
  
  loading.value = true
  setError('')
  
  try {
    const [topicKey, lectureKey] = activeLectureKey.value.split('.')
    const topic = topics.value.find(t => t.key === topicKey)
    if (!topic) return
    const lecture = topic.lectures.find(l => l.key === activeLectureKey.value)
    if (!lecture) return
    
    // Обновляем контент курса
    const updatedContent = { ...courseContent.value.content }
    
    // Находим нужную тему и лекцию в структуре
    if (updatedContent[topicKey] && updatedContent[topicKey].lectures) {
      updatedContent[topicKey].lectures[lectureKey] = {
        ...updatedContent[topicKey].lectures[lectureKey],
        title: editForm.lectureTitle,
        content: editForm.content
      }
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
    await selectLecture(topic, lecture)
  } catch (e) {
    setError(e.message)
  } finally {
    loading.value = false
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
    
    // Загружаем свои submissions для всего курса, затем фильтруем по лекции
    const mySubs = await apiJson(
      `/submissions/mine?course_id=${activeCourse.value.id}`,
      {},
      token.value
    )
    // Фильтруем по теме и лекции
    mySubmissions.value = (mySubs || []).filter(
      s => s.topic_key === topicKey && s.lecture_key === lectureKey
    )
    
    // Загружаем submissions для проверки (если преподаватель)
    if (isCreator.value) {
      const reviewSubs = await apiJson(
        `/submissions/review?course_id=${activeCourse.value.id}`,
        {},
        token.value
      )
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
    loading.value = true
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
    loading.value = false
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
  if (newVal === 'true' && courseContent.value && isCreator.value && topics.value.length > 0 && !isEditing.value) {
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

.course-body {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
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

@media (max-width: 1000px) {
  .course-body {
    grid-template-columns: 1fr;
  }
}
</style>
