<template>
  <aside class="edit-panel">
    <div class="panel-block">
      <label class="field">
        <span class="label">Статус</span>
        <select
          class="input"
          :value="courseStatus"
          @change="$emit('update:courseStatus', $event.target.value)"
        >
          <option value="draft">Черновик</option>
          <option value="private">Приватный</option>
          <option value="public">Публичный</option>
        </select>
      </label>
      <div class="row">
        <button
          type="button"
          class="btn ghost"
          :disabled="savingCourseMeta"
          @click="$emit('save-course')"
        >
          {{ savingCourseMeta ? 'Сохранение…' : 'Сохранить' }}
        </button>
        <button
          type="button"
          class="btn danger ghost"
          :disabled="deletingCourse"
          @click="$emit('delete-course')"
        >
          {{ deletingCourse ? 'Удаление…' : 'Удалить' }}
        </button>
      </div>
    </div>

    <div class="panel-block">
      <label class="field">
        <span class="label">Рабочая тема</span>
        <select
          class="input"
          :value="lectureTargetTopic"
          @change="$emit('update:lectureTargetTopic', $event.target.value)"
        >
          <option v-for="t in topics" :key="t.key" :value="t.key">{{ t.title }}</option>
        </select>
      </label>
      <label class="field">
        <span class="label">Название темы</span>
        <input
          class="input"
          type="text"
          :value="topicTitleDraft"
          @input="$emit('update:topicTitleDraft', $event.target.value)"
          placeholder="Введите название темы"
        />
      </label>
      <div class="row wrap">
        <button type="button" class="chip" @click="$emit('add-topic')">+ Тема</button>
        <button
          type="button"
          class="chip"
          :disabled="!topics.length"
          @click="$emit('add-lecture')"
        >
          + Лекция
        </button>
        <button
          type="button"
          class="chip"
          :disabled="!lectureTargetTopic || !topicTitleDraft"
          @click="$emit('rename-topic')"
        >
          Переименовать тему
        </button>
        <button
          type="button"
          class="chip danger"
          :disabled="!activeLectureKey"
          @click="$emit('delete-lecture')"
        >
          Удалить лекцию
        </button>
        <button
          type="button"
          class="chip danger"
          :disabled="!lectureTargetTopic"
          @click="$emit('delete-topic')"
        >
          Удалить тему
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
defineProps({
  courseStatus: String,
  lectureTargetTopic: String,
  topicTitleDraft: String,
  topics: {
    type: Array,
    default: () => []
  },
  activeTopicKey: {
    type: String,
    default: ''
  },
  activeLectureKey: {
    type: String,
    default: ''
  },
  savingCourseMeta: Boolean,
  deletingCourse: Boolean
})

defineEmits([
  'update:courseStatus',
  'update:lectureTargetTopic',
  'update:topicTitleDraft',
  'add-topic',
  'add-lecture',
  'delete-lecture',
  'delete-topic',
  'rename-topic',
  'save-course',
  'delete-course'
])
</script>

<style scoped>
.edit-panel {
  position: sticky;
  top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f9fafb;
}

.panel-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 13px;
  color: #4b5563;
  font-weight: 600;
}

.input {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #fff;
  font-size: 14px;
}

.row {
  display: flex;
  gap: 8px;
}

.row.wrap {
  flex-wrap: wrap;
}

.btn {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn.ghost {
  background: #fff;
}

.btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.btn.danger {
  border-color: #fca5a5;
  color: #b91c1c;
}

.btn.danger:hover:not(:disabled) {
  background: #fee2e2;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.chip {
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.chip:hover:not(:disabled) {
  background: #f3f4f6;
}

.chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chip.danger {
  border-color: #fecaca;
  color: #b91c1c;
}

.chip.danger:hover:not(:disabled) {
  background: #fef2f2;
}
</style>

