<template>
  <div class="app">
    <Header v-if="showHeader" />
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import Header from './components/Header.vue'
import {computed } from 'vue'
import { useRoute } from 'vue-router';

const route = useRoute()

const showHeader = computed(() => !route.meta.hideHeader)
  
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f9fafb;
  color: #1f2328;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
}
</style>
