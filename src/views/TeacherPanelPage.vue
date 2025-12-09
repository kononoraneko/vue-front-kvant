<template>
  <div class="teacher-panel-page">
    <div class="page-header">
      <h2>Панель преподавателя</h2>
      <p class="subtitle">Проверка решений учеников</p>
    </div>

    <div class="panel-content">
      <div class="info-box">
        <p>
          Здесь будет отображаться список решений учеников с возможностью проверки и выставления оценок.
          Сейчас реализован только UI (без запросов к API).
        </p>
      </div>

      <table class="submissions-table">
        <thead>
          <tr>
            <th>Ученик</th>
            <th>Курс / лекция / задача</th>
            <th>Ответ</th>
            <th>Статус</th>
            <th>Оценка</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in mockSubmissions" :key="row.id">
            <td>{{ row.student }}</td>
            <td>
              <div class="submission-meta">
                <strong>{{ row.course }}</strong>
                <span>{{ row.lecture }} · {{ row.task }}</span>
              </div>
            </td>
            <td class="submission-answer">
              <code>{{ row.answerSnippet }}</code>
            </td>
            <td>
              <select v-model="row.status" class="status-select">
                <option value="not verified">not verified</option>
                <option value="checked">checked</option>
                <option value="rated">rated</option>
              </select>
            </td>
            <td>
              <input
                v-model.number="row.grade"
                type="number"
                min="0"
                max="100"
                class="grade-input"
              >
            </td>
          </tr>
        </tbody>
      </table>

      <div class="hint">
        <p>
          Позже это можно связать с моделью <code>Grade</code> в базе и сделать настоящие эндпоинты.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'

const mockSubmissions = reactive([
  {
    id: 1,
    student: 'Иван Петров',
    course: 'Основы Python',
    lecture: 'Введение',
    task: 'task1',
    answerSnippet: 'def hello():\n    print("Hello, world!")',
    status: 'not verified',
    grade: null
  },
  {
    id: 2,
    student: 'Анна Сидорова',
    course: 'Основы Python',
    lecture: 'Циклы',
    task: 'task2',
    answerSnippet: 'for i in range(10):\n    print(i)',
    status: 'checked',
    grade: 80
  }
])
</script>

<style scoped>
.teacher-panel-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  margin-bottom: 32px;
}

.page-header h2 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: #1f2328;
}

.subtitle {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-box {
  padding: 16px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  color: #1e40af;
}

.info-box p {
  margin: 0;
  font-size: 14px;
}

.submissions-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.submissions-table th,
.submissions-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.submissions-table th {
  background: #f9fafb;
  font-weight: 600;
  font-size: 13px;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.submissions-table tbody tr:hover {
  background: #f9fafb;
}

.submission-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.submission-meta strong {
  font-size: 14px;
  color: #1f2328;
}

.submission-meta span {
  font-size: 12px;
  color: #6b7280;
}

.submission-answer code {
  display: block;
  white-space: pre;
  font-family: ui-monospace, 'Courier New', monospace;
  font-size: 13px;
  background: #f3f4f6;
  padding: 8px;
  border-radius: 4px;
  max-width: 400px;
  overflow-x: auto;
}

.status-select {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  background: white;
}

.grade-input {
  width: 80px;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.hint {
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.hint p {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.hint code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-family: ui-monospace, 'Courier New', monospace;
}
</style>

