<template>
  <div class="task-editor">
    <div class="task-header">
      <input
        v-model="task.key"
        @input="emitUpdate"
        type="text"
        placeholder="task1"
        class="task-key-input"
        required
      >
      <select v-model="task.type" @change="handleTypeChange" class="task-type-select">
        <option value="manual">Развернутый ответ</option>
        <option value="single_choice">Один правильный ответ</option>
        <option value="multiple_choice">Несколько правильных ответов</option>
        <option value="text_answer">Текстовый ответ</option>
      </select>
      <button
        type="button"
        class="btn-danger tiny"
        @click="$emit('remove')"
      >
        ✕
      </button>
    </div>

    <div class="task-content">
      <label>
        Описание задачи (HTML или Markdown)
        <textarea
          v-model="task.html"
          @input="emitUpdate"
          rows="3"
          placeholder="Описание задачи..."
          class="task-description-input"
          required
        />
      </label>

      <!-- Настройки для single_choice -->
      <div v-if="task.type === 'single_choice'" class="task-options">
        <label>
          Варианты ответов (каждый вариант с новой строки)
          <textarea
            v-model="optionsText"
            @input="updateOptions"
            rows="4"
            placeholder="Вариант 1&#10;Вариант 2&#10;Вариант 3"
            class="options-textarea"
          />
        </label>
        <label>
          Номер правильного ответа (начиная с 1)
          <input
            v-model.number="correctAnswerIndex"
            @input="updateCorrectAnswerIndex"
            type="number"
            min="1"
            :max="task.options ? task.options.length : 1"
            class="correct-answer-input"
          >
        </label>
      </div>

      <!-- Настройки для multiple_choice -->
      <div v-if="task.type === 'multiple_choice'" class="task-options">
        <label>
          Варианты ответов (каждый вариант с новой строки)
          <textarea
            v-model="optionsText"
            @input="updateOptions"
            rows="4"
            placeholder="Вариант 1&#10;Вариант 2&#10;Вариант 3"
            class="options-textarea"
          />
        </label>
        <label>
          Номера правильных ответов (через запятую, начиная с 1)
          <input
            v-model="correctAnswersText"
            @input="updateCorrectAnswers"
            type="text"
            placeholder="1, 3, 5"
            class="correct-answers-input"
          >
        </label>
      </div>

      <!-- Настройки для text_answer -->
      <div v-if="task.type === 'text_answer'" class="task-options">
        <label>
          Правильный ответ
          <input
            v-model="task.correct_answer"
            @input="emitUpdate"
            type="text"
            placeholder="Правильный ответ"
            class="correct-answer-input"
          >
        </label>
        <label>
          Placeholder для поля ввода
          <input
            v-model="task.placeholder"
            @input="emitUpdate"
            type="text"
            placeholder="Введите ответ..."
            class="placeholder-input"
          >
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'remove'])

const task = ref({ ...props.modelValue })
const optionsText = ref('')
const correctAnswersText = ref('')
const correctAnswerIndex = ref(1)

// Инициализация из существующих данных
onMounted(() => {
  if (task.value.options && Array.isArray(task.value.options)) {
    optionsText.value = task.value.options.join('\n')
  }
  
  // Для single_choice всегда должен быть correct_answer
  if (task.value.type === 'single_choice') {
    if (task.value.correct_answer !== undefined && task.value.correct_answer !== null) {
      try {
        // correct_answer хранится как индекс (0-based), но пользователь вводит номер (1-based)
        const index = parseInt(task.value.correct_answer)
        if (!isNaN(index) && index >= 0) {
          correctAnswerIndex.value = index + 1  // Преобразуем 0-based в 1-based для отображения
        } else {
          // Если индекс невалидный, устанавливаем по умолчанию
          task.value.correct_answer = 0
          correctAnswerIndex.value = 1
          emit('update:modelValue', { ...task.value })
        }
      } catch {
        task.value.correct_answer = 0
        correctAnswerIndex.value = 1
        emit('update:modelValue', { ...task.value })
      }
    } else {
      // Если correct_answer не установлен, устанавливаем по умолчанию
      task.value.correct_answer = 0
      correctAnswerIndex.value = 1
      emit('update:modelValue', { ...task.value })
    }
  }
  
  if (task.value.type === 'multiple_choice' && task.value.correct_answer) {
    try {
      const answers = JSON.parse(task.value.correct_answer)
      if (Array.isArray(answers)) {
        correctAnswersText.value = answers.map(a => a + 1).join(', ')
      }
    } catch {
      correctAnswersText.value = String(task.value.correct_answer)
    }
  }
})

// Обновляем task при изменении props (только если действительно изменилось)
watch(() => props.modelValue, (newVal) => {
  // Проверяем, что значение действительно изменилось, чтобы избежать рекурсии
  if (JSON.stringify(task.value) !== JSON.stringify(newVal)) {
    task.value = { ...newVal }
    if (task.value.options && Array.isArray(task.value.options)) {
      optionsText.value = task.value.options.join('\n')
    }
  }
}, { deep: true })

// Эмитим изменения обратно только при явных изменениях через методы
// Убираем автоматический watcher, чтобы избежать рекурсии

function updateOptions() {
  const options = optionsText.value
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
  task.value.options = options
  
  // Если это single_choice и correct_answer не установлен или невалиден, устанавливаем по умолчанию
  if (task.value.type === 'single_choice') {
    if (options.length > 0) {
      const currentAnswer = task.value.correct_answer
      if (currentAnswer === undefined || currentAnswer === null || currentAnswer < 0 || currentAnswer >= options.length) {
        task.value.correct_answer = 0
        correctAnswerIndex.value = 1
      }
    }
  }
  
  emit('update:modelValue', { ...task.value })
}

function handleTypeChange() {
  // При изменении типа на single_choice, устанавливаем correct_answer по умолчанию
  if (task.value.type === 'single_choice') {
    if (task.value.correct_answer === undefined || task.value.correct_answer === null) {
      task.value.correct_answer = 0  // По умолчанию первый вариант (0-based)
      correctAnswerIndex.value = 1  // Для отображения (1-based)
    }
    // Если есть options, убеждаемся, что correct_answer валиден
    if (task.value.options && task.value.options.length > 0) {
      const currentAnswer = task.value.correct_answer
      if (currentAnswer === undefined || currentAnswer === null || currentAnswer < 0 || currentAnswer >= task.value.options.length) {
        task.value.correct_answer = 0
        correctAnswerIndex.value = 1
      } else {
        correctAnswerIndex.value = currentAnswer + 1
      }
    }
  }
  emitUpdate()
}

function updateCorrectAnswerIndex() {
  if (correctAnswerIndex.value >= 1 && task.value.options && correctAnswerIndex.value <= task.value.options.length) {
    task.value.correct_answer = correctAnswerIndex.value - 1
    emit('update:modelValue', { ...task.value })
  } else if (task.value.options && task.value.options.length > 0) {
    // Если индекс выходит за границы, устанавливаем первый вариант
    correctAnswerIndex.value = 1
    task.value.correct_answer = 0
    emit('update:modelValue', { ...task.value })
  }
}

function updateCorrectAnswers() {
  const answers = correctAnswersText.value
    .split(',')
    .map(s => parseInt(s.trim()) - 1)
    .filter(n => !isNaN(n) && n >= 0)
  task.value.correct_answer = JSON.stringify(answers)
  emit('update:modelValue', { ...task.value })
}

function emitUpdate() {
  emit('update:modelValue', { ...task.value })
}
</script>

<style scoped>
.task-editor {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  background: #f9fafb;
}

.task-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.task-key-input {
  flex: 0 0 120px;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.task-type-select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

.task-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-content label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2328;
}

.task-description-input,
.options-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
}

.task-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.correct-answer-input,
.correct-answers-input,
.placeholder-input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.btn-danger.tiny {
  padding: 6px 10px;
  font-size: 12px;
}
</style>

