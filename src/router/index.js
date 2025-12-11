import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const routes = [
  {
    path: '/',
    redirect: '/courses'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginPage.vue'),
    meta: { requiresAuth: false, hideHeader: true }
  },
  {
    path: '/courses',
    name: 'Courses',
    component: () => import('../views/CoursesPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/courses/:id',
    name: 'CourseView',
    component: () => import('../views/CourseViewPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/teacher',
    name: 'TeacherPanel',
    component: () => import('../views/TeacherPanelPage.vue'),
    meta: { requiresAuth: true, requiresTeacher: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/ProfilePage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/courses/create',
    name: 'CreateCourse',
    component: () => import('../views/CreateCoursePage.vue'),
    meta: { requiresAuth: true, requiresTeacher: true }
  },
  {
    path: '/courses/:id/edit',
    name: 'EditCourse',
    component: () => import('../views/EditCoursePage.vue'),
    meta: { requiresAuth: true, requiresTeacher: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const { isAuthenticated, isTeacher, loadCurrentUser, profile } = useAuth()
  
  if (to.meta.requiresAuth) {
    if (!isAuthenticated.value) {
      next('/login')
      return
    }
    
    // Загружаем профиль если еще не загружен
    if (!profile.value) {
      await loadCurrentUser()
    }
    
    if (to.meta.requiresTeacher && !isTeacher.value) {
      next('/courses')
      return
    }
  } else if (to.path === '/login' && isAuthenticated.value) {
    next('/courses')
    return
  }
  
  next()
})

export default router

