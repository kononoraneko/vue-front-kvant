import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from './useApi'

export function useAuth() {
  const router = useRouter()
  const { apiJson } = useApi()
  
  const token = ref(localStorage.getItem('token') || '')
  const profile = ref(null)
  const loading = ref(false)
  const error = ref('')

  const isAuthenticated = computed(() => !!token.value)
  const isTeacher = computed(() => ['Teacher', 'Admin'].includes(profile.value?.role))
  const isAdmin = computed(() => profile.value?.role === 'Admin')

  function setError(message) {
    error.value = message || ''
  }

  function saveToken(newToken) {
    token.value = newToken
    if (newToken) {
      localStorage.setItem('token', newToken)
    } else {
      localStorage.removeItem('token')
    }
  }

  async function login(login, password) {
    loading.value = true
    setError('')
    try {
      const data = await apiJson('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ login, password })
      }, null)
      saveToken(data.access_token)
      
      if (data.user){
        profile.value = data.user
      } else {
        await loadProfile()
      }
      
      router.push('/courses')
      return true
    } catch (e) {
      setError(e.message)
      return false
    } finally {
      loading.value = false
    }
  }

  async function register(login, password, name) {
    loading.value = true
    setError('')
    try {
      const data = await apiJson('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ login, password, name })
      }, null)
      saveToken(data.access_token)
      profile.value = data.user
      await loadProfile()
      router.push('/courses')
      return true
    } catch (e) {
      setError(e.message)
      return false
    } finally {
      loading.value = false
    }
  }

  async function loadProfile() {
    if (!token.value) return
    try {
      profile.value = await apiJson('/profile', {}, token.value)
      return profile.value
    } catch (e) {
      if (e.message.includes('Сессия истекла')) {
        logout()
      } else {
        setError(e.message)
      }
      return null
    }
  }

  async function loadCurrentUser() {
    if (!token.value) return
    try {
      profile.value = await apiJson('/auth/me', {}, token.value)
    } catch (e) {
      if (e.message.includes('Сессия истекла')) {
        logout()
      }
    }
  }

  function logout() {
    saveToken('')
    profile.value = null
    router.push('/login')
  }

  return {
    token,
    profile,
    loading,
    error,
    isAuthenticated,
    isTeacher,
    isAdmin,
    login,
    register,
    logout,
    loadProfile,
    loadCurrentUser,
    setError
  }
}

