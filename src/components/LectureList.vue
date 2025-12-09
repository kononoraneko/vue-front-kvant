<template>
  <aside class="lecture-list">
    <h3>Лекции</h3>
    <ul>
      <li
        v-for="lecture in lectures"
        :key="lecture.key"
        :class="['lecture-item', lecture.key === activeKey && 'active']"
        @click="$emit('select', lecture)"
      >
        {{ lectureTitle(lecture.key) }}
      </li>
    </ul>
  </aside>
</template>

<script setup>
defineProps({
  lectures: {
    type: Array,
    required: true
  },
  activeKey: {
    type: String,
    default: null
  }
})

defineEmits(['select'])

function lectureTitle(key) {
  const num = key.replace(/[^\d]/g, '')
  return num ? `Лекция ${num}` : key
}
</script>

<style scoped>
.lecture-list {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e5e7eb;
}

.lecture-list h3 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2328;
}

.lecture-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lecture-item {
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #4b5563;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.lecture-item:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.lecture-item.active {
  background: #eff6ff;
  border-color: #2563eb;
  color: #2563eb;
  font-weight: 600;
}
</style>

