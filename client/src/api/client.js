import axios from 'axios'

const BASE = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '')

// Socket.io lives on the API origin (not under /api/v1)
export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || (/^https?:\/\//.test(BASE) ? new URL(BASE).origin : undefined)

const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

// A 401 on anything except the login/session probe means the session expired
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || ''
    const isAuthProbe = url.includes('/auth/login') || url.includes('/users/profile')
    if (error.response?.status === 401 && !isAuthProbe) {
      window.dispatchEvent(new Event('vortex:unauthorized'))
    }
    return Promise.reject(error)
  },
)

/** Every endpoint returns { success, message, data } — resolve straight to `data`. */
export const unwrap = (promise) => promise.then((res) => res.data.data ?? {})

export default api
