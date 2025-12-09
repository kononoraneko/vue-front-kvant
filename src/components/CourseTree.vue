<template>
  <aside class="course-tree">
    <div class="tree-header">
      <h3>{{ courseTitle }}</h3>
      <button
        v-if="isCreator && !isEditing"
        type="button"
        class="btn-edit"
        @click="$emit('start-edit')"
      >
        ✏️ Редактировать
      </button>
    </div>
    <nav class="tree-nav">
      <div
        v-for="lecture in lectures"
        :key="lecture.key"
        class="tree-item"
      >
        <div
          :class="['tree-lecture', activeLectureKey === lecture.key && 'active']"
          @click="$emit('select-lecture', lecture)"
        >
          <span class="lecture-icon">📖</span>
          <span class="lecture-title">{{ lectureTitle(lecture.key) }}</span>
        </div>
        <div v-if="lecture.tasks && lecture.tasks.length" class="tree-tasks">
          <div
            v-for="task in lecture.tasks"
            :key="task.key"
            :class="['tree-task', getTaskStatus(lecture.key, task.key)]"
            @click="$emit('select-task', lecture, task)"
          >
            <span class="task-icon">{{ getTaskIcon(lecture.key, task.key) }}</span>
            <span class="task-key">{{ task.key }}</span>
          </div>
        </div>
      </div>
    </nav>
  </aside>
</template>

<script setup>

const props = defineProps({
  courseTitle: {
    type: String,
    required: true
  },
  lectures: {
    type: Array,
    required: true
  },
  activeLectureKey: {
    type: String,
    default: null
  },
  isCreator: {
    type: Boolean,
    default: false
  },
  isEditing: {
    type: Boolean,
    default: false
  },
  completedTasks: {
    type: Object,
    default: () => ({})
  }
})

defineEmits(['select-lecture', 'select-task', 'start-edit'])

function lectureTitle(key) {
  const num = key.replace(/[^\d]/g, '')
  return num ? `Лекция ${num}` : key
}

function getTaskStatus(lectureKey, taskKey) {
  const taskId = `${lectureKey}.${taskKey}`
  const status = props.completedTasks[taskId]
  if (status === 'completed') return 'completed'
  if (status === 'in-progress') return 'in-progress'
  return 'not-started'
}

function getTaskIcon(lectureKey, taskKey) {
  const status = getTaskStatus(lectureKey, taskKey)
  if (status === 'completed') return '✅'
  if (status === 'in-progress') return '🔄'
  return '⭕'
}
</script>

<style scoped>
.course-tree {
  width: 280px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 16px;
  height: fit-content;
  position: sticky;
  top: 24px;
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.tree-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2328;
}

.btn-edit {
  padding: 6px 12px;
  border: 1px solid #2563eb;
  border-radius: 6px;
  background: white;
  color: #2563eb;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-edit:hover {
  background: #eff6ff;
}

.tree-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tree-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tree-lecture {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
  color: #374151;
}

.tree-lecture:hover {
  background: #f3f4f6;
}

.tree-lecture.active {
  background: #eff6ff;
  color: #2563eb;
}

.lecture-icon {
  font-size: 18px;
}

.lecture-title {
  font-size: 14px;
}

.tree-tasks {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-left: 32px;
  padding-left: 12px;
  border-left: 2px solid #e5e7eb;
}

.tree-task {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  color: #6b7280;
}

.tree-task:hover {
  background: #f9fafb;
}

.tree-task.completed {
  color: #059669;
}

.tree-task.in-progress {
  color: #2563eb;
}

.task-icon {
  font-size: 14px;
}

.task-key {
  font-weight: 500;
}
</style>

