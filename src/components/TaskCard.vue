<template>
  <article class="task-card" :data-task-key="task.key">
    <header class="task-header">
      <div class="task-title-row">
        <h4>{{ task.key }}</h4>
        <div class="task-status">
          <span v-if="submission?.status === 'rated'" class="status-badge rated">
            ✅ Оценено: {{ submission.grade }}/5
          </span>
          <span v-else-if="submission?.status === 'checked'" class="status-badge checked">
            ✓ Проверено
          </span>
          <span v-else-if="submission?.status === 'not verified'" class="status-badge pending">
            ⏳ На проверке
          </span>
          <span v-else-if="hasAnswer && !submission" class="status-badge in-progress">
            📝 Готово к отправке
          </span>
        </div>
      </div>
      <button v-if="task.type === 'manual'" type="button" class="btn-ghost" @click="openInCodepen">
        Открыть в CodePen
      </button>
    </header>
    <div class="task-body">
      <div v-html="safeTaskHtml" class="task-html" />
      
      <!-- Оценка и комментарий преподавателя -->
      <div v-if="submission?.status === 'rated'" class="teacher-feedback">
        <div v-if="submission.grade !== null" class="grade-display" :class="getGradeClass(submission.grade)">
          <strong>Ваша оценка:</strong>
          <span class="grade-value">{{ submission.grade }}/5</span>
        </div>
        <div v-if="submission.teacher_comment" class="teacher-comment">
          <strong>Комментарий преподавателя:</strong>
          <p>{{ submission.teacher_comment }}</p>
        </div>
      </div>
      
      <!-- Разные типы задач -->
      <div v-if="task.type === 'single_choice'" class="answer-label">
        <strong>Выберите правильный ответ:</strong>
        <div class="choice-options">
          <label
            v-for="(option, index) in task.options"
            :key="index"
            class="choice-option"
            :class="{ selected: modelValue === String(index) }"
          >
            <input
              type="radio"
              :value="String(index)"
              :checked="modelValue === String(index)"
              @change="handleInput({ target: { value: String(index) } })"
              :disabled="submission?.status === 'rated'"
              class="choice-radio"
            >
            <span class="choice-text">{{ option }}</span>
          </label>
        </div>
      </div>
      
      <div v-else-if="task.type === 'multiple_choice'" class="answer-label">
        <strong>Выберите все правильные ответы:</strong>
        <div class="choice-options">
          <label
            v-for="(option, index) in task.options"
            :key="index"
            class="choice-option"
            :class="{ selected: isOptionSelected(index) }"
          >
            <input
              type="checkbox"
              :checked="isOptionSelected(index)"
              @change="handleMultipleChoice(index, $event.target.checked)"
              :disabled="submission?.status === 'rated'"
              class="choice-checkbox"
            >
            <span class="choice-text">{{ option }}</span>
          </label>
        </div>
      </div>
      
      <div v-else-if="task.type === 'text_answer'" class="answer-label">
        <strong>Введите правильный ответ:</strong>
        <input
          :value="modelValue"
          @input="handleInput"
          :disabled="submission?.status === 'rated'"
          type="text"
          :placeholder="task.placeholder || 'Введите ответ...'"
          class="answer-input"
        >
      </div>
      
      <label v-else class="answer-label">
        Ваш ответ
        <textarea
          :value="modelValue"
          @input="handleInput"
          :disabled="submission?.status === 'rated'"
          rows="6"
          :placeholder="task.type === 'manual' ? 'Напишите развернутый ответ...' : 'Напишите код или ответ...'"
          class="answer-textarea"
        />
      </label>
      
      <div class="task-actions">
        <button
          v-if="hasAnswer && (!submission || submission?.status === 'not verified')"
          type="button"
          class="btn-submit"
          :disabled="submitting || !hasAnswer"
          @click.prevent="handleSubmit"
        >
          {{ submitting ? (submission ? 'Обновление...' : 'Отправка...') : (submission ? '🔄 Обновить ответ' : 'Отправить на проверку') }}
        </button>
        <div v-else-if="submission?.status === 'rated'" class="submission-complete">
          <span class="complete-icon">✅</span>
          <span>Решение проверено и оценено</span>
        </div>
      </div>

      <div
        v-if="submission && task.explanation"
        class="explanation"
      >
        <div class="explanation-title">Пояснение</div>
        <div v-html="task.explanation" class="explanation-text"></div>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  modelValue: {
    type: String,
    default: ''
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  submission: {
    type: Object,
    default: null
  },
  submitting: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const safeTaskHtml = computed(() => {
  const html = props.task && props.task.html ? String(props.task.html) : ''
  if (!html) return ''
  // Экранируем script-теги, чтобы браузер не исполнял их
  const openScript = '<script'
  const closeScript = '<' + String.fromCharCode(47) + 'script'
  return html
    .replace(new RegExp(openScript, 'gi'), '&lt;script')
    .replace(new RegExp(closeScript, 'gi'), '&lt;/' + 'script')
})

const hasAnswer = computed(() => {
  if (props.task.type === 'multiple_choice') {
    // Для множественного выбора проверяем, что выбрано хотя бы одно
    try {
      const selected = JSON.parse(props.modelValue || '[]')
      return Array.isArray(selected) && selected.length > 0
    } catch {
      return false
    }
  }
  return (props.modelValue || '').trim().length > 0
})

function handleInput(event) {
  emit('update:modelValue', event.target.value)
}

function isOptionSelected(index) {
  try {
    const selected = JSON.parse(props.modelValue || '[]')
    return Array.isArray(selected) && selected.includes(index)
  } catch {
    return false
  }
}

function handleMultipleChoice(index, checked) {
  try {
    const selected = JSON.parse(props.modelValue || '[]')
    const arr = Array.isArray(selected) ? [...selected] : []
    if (checked) {
      if (!arr.includes(index)) {
        arr.push(index)
      }
    } else {
      const idx = arr.indexOf(index)
      if (idx > -1) {
        arr.splice(idx, 1)
      }
    }
    emit('update:modelValue', JSON.stringify(arr))
  } catch {
    emit('update:modelValue', checked ? JSON.stringify([index]) : '[]')
  }
}

function handleSubmit() {
  emit('submit')
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

function openInCodepen() {
  window.open('https://codepen.io/pen?editors=0010', '_blank', 'noopener,noreferrer')
}
</script>

<style scoped>
.task-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: white;
  margin-bottom: 16px;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
  gap: 12px;
}

.task-title-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.task-status {
  display: flex;
  gap: 8px;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.completed {
  background: #dcfce7;
  color: #166534;
}

.status-badge.rated {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.checked {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.pending {
  background: #fce7f3;
  color: #9f1239;
}

.status-badge.in-progress {
  background: #dbeafe;
  color: #1e40af;
}

.task-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2328;
}

.btn-ghost {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: white;
  color: #2563eb;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-ghost:hover {
  background: #eff6ff;
  border-color: #2563eb;
}

.task-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-html {
  font-size: 14px;
  line-height: 1.6;
  color: #374151;
}

.teacher-feedback {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.grade-display {
  padding: 12px;
  border-radius: 6px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-left: 4px solid;
}

.grade-display strong {
  font-weight: 600;
}

.grade-value {
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
  padding: 12px;
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
  border-radius: 6px;
  font-size: 14px;
}

.teacher-comment strong {
  display: block;
  margin-bottom: 8px;
  color: #92400e;
}

.teacher-comment p {
  margin: 0;
  color: #78350f;
  line-height: 1.6;
  white-space: pre-wrap;
}

.submission-complete {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #dcfce7;
  border-radius: 6px;
  color: #166534;
  font-weight: 600;
  font-size: 14px;
}

.complete-icon {
  font-size: 20px;
}

.explanation {
  margin-top: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
}

.explanation-title {
  font-weight: 700;
  font-size: 13px;
  color: #1f2937;
  margin-bottom: 6px;
}

.explanation-text {
  font-size: 13px;
  color: #4b5563;
  line-height: 1.6;
}

.answer-label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2328;
}

.answer-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-family: ui-monospace, 'Courier New', monospace;
  resize: vertical;
  box-sizing: border-box;
}

.answer-textarea:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.answer-textarea:disabled {
  background: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
}

.task-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.btn-submit,
.btn-complete {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit {
  background: #ffffff;
  border: 1px solid #b7bbc4;
  color: #22347a;
}

.btn-submit:hover:not(:disabled) {
  background: #f1f1f1;
}

.btn-complete {
  background: #22c55e;
  color: white;
}

.btn-complete:hover {
  background: #16a34a;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.choice-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.choice-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.choice-option:hover {
  border-color: #dfe4ec;
  
  background: #f7f6ff;
}

.choice-option.selected {
  border-color: #4435ac;
  background: #eff6ff;
}

.choice-radio,
.choice-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  margin: 0;
}

.choice-text {
  flex: 1;
  font-size: 14px;
  color: #374151;
}

.answer-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  margin-top: 8px;
}

.answer-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.answer-input:disabled {
  background: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
}
</style>
