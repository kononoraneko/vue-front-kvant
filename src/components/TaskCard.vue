<template>
  <article class="task-card" :data-task-key="task.key">
    <header class="task-header">
      <div class="task-title-row">
        <h4>Задача {{ task.key }}</h4>
        <div class="task-status">
          <span v-if="isCompleted" class="status-badge completed">✅ Выполнено</span>
          <span v-else-if="hasAnswer" class="status-badge in-progress">🔄 В процессе</span>
        </div>
      </div>
      <button type="button" class="btn-ghost" @click="openInCodepen">
        Открыть в CodePen
      </button>
    </header>
    <div class="task-body">
      <div v-html="task.html" class="task-html" />
      <label class="answer-label">
        Ваш ответ
        <textarea
          :value="modelValue"
          @input="handleInput"
          rows="6"
          placeholder="Напишите код или развернутый ответ..."
          class="answer-textarea"
        />
      </label>
      <div class="task-actions">
        <button
          v-if="hasAnswer && !isCompleted"
          type="button"
          class="btn-complete"
          @click="handleComplete"
        >
          ✓ Отметить как выполненное
        </button>
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
  }
})

const emit = defineEmits(['update:modelValue', 'complete'])

const hasAnswer = computed(() => props.modelValue.trim().length > 0)

function handleInput(event) {
  emit('update:modelValue', event.target.value)
}

function handleComplete() {
  emit('complete')
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

.task-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.btn-complete {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #22c55e;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-complete:hover {
  background: #16a34a;
}
</style>

