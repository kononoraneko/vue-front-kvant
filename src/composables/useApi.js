import { ref } from 'vue'

const apiBase = process.env.VUE_APP_API_URL || 'http://localhost:8000'

export function useApi() {
  const error = ref('')
  const loading = ref(false)

  function setError(message) {
    error.value = message || ''
  }

  async function apiJson(path, options = {}, token = null) {
    const url = `${apiBase}${path}`
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const resp = await fetch(url, {
      ...options,
      headers
    })
    if (!resp.ok) {
      let detail = ''
      try {
        const data = await resp.json()
        detail = data.detail || ''
      } catch (_) {
        // ignore
      }
      if (resp.status === 401) {
        throw new Error(detail || 'Неверный логин или пароль')
      }
      throw new Error(detail || resp.statusText)
    }
    return resp.json()
  }

  return {
    apiBase,
    error,
    loading,
    setError,
    apiJson
  }
}

