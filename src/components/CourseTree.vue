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
        v-for="topic in topics"
        :key="topic.key"
        class="tree-topic"
      >
        <div
          :class="['topic-header', expandedTopics[topic.key] && 'expanded']"
          @click="toggleTopic(topic.key)"
        >
          <span class="topic-icon">{{ expandedTopics[topic.key] ? '📂' : '📁' }}</span>
          <span class="topic-title">{{ topic.title }}</span>
        </div>
        <div v-if="expandedTopics[topic.key]" class="topic-content">
          <div
            v-for="lecture in topic.lectures"
            :key="lecture.key"
            :class="['tree-lecture', activeLectureKey === lecture.key && 'active']"
            @click="$emit('select-lecture', topic, lecture)"
          >
            <span class="lecture-icon">📖</span>
            <span class="lecture-title">{{ lecture.title }}</span>
          </div>
        </div>
      </div>
    </nav>
  </aside>
</template>

<script setup>
import { reactive, onMounted } from 'vue'

const props = defineProps({
  courseTitle: {
    type: String,
    required: true
  },
  topics: {
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

defineEmits(['select-lecture', 'start-edit'])

// Убираем задачи из дерева - показываем только лекции

const expandedTopics = reactive({})

function toggleTopic(topicKey) {
  expandedTopics[topicKey] = !expandedTopics[topicKey]
}

// Раскрываем все темы по умолчанию
onMounted(() => {
  props.topics.forEach(topic => {
    expandedTopics[topic.key] = true
  })
})
</script>

<style scoped>
.course-tree {
  width: 320px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 16px;
  height: fit-content;
  position: sticky;
  top: 24px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
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
  gap: 4px;
}

.tree-topic {
  display: flex;
  flex-direction: column;
  margin-bottom: 8px;
}

.topic-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 700;
  color: #1e40af;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.topic-header:hover {
  background: #dbeafe;
}

.topic-header.expanded {
  background: #dbeafe;
}

.topic-icon {
  font-size: 18px;
}

.topic-title {
  font-size: 15px;
}

.topic-content {
  margin-top: 4px;
  padding-left: 8px;
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
  margin-left: 8px;
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
</style>
