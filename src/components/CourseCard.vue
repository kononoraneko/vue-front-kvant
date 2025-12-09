<template>
  <article
    :class="['course-card', selected && 'selected']"
    @click="$emit('click')"
  >
    <h3>{{ course.title }}</h3>
    <div class="course-meta">
      <span class="tag" :class="statusClass">{{ course.status }}</span>
      <span v-if="course.creator_id" class="creator">ID создателя: {{ course.creator_id }}</span>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  course: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  }
})

const statusClass = computed(() => {
  const status = props.course.status
  if (status === 'public') return 'status-public'
  if (status === 'private') return 'status-private'
  if (status === 'draft') return 'status-draft'
  return ''
})
</script>

<style scoped>
.course-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  background: white;
  transition: all 0.2s;
}

.course-card:hover {
  border-color: #2563eb;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
}

.course-card.selected {
  border-color: #2563eb;
  background: #eff6ff;
}

.course-card h3 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2328;
}

.course-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.status-public {
  background: #dcfce7;
  color: #166534;
}

.status-private {
  background: #fef3c7;
  color: #92400e;
}

.status-draft {
  background: #f3f4f6;
  color: #4b5563;
}

.creator {
  font-size: 12px;
  color: #6b7280;
}
</style>

