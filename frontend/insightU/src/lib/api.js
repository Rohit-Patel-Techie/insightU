import axios from "axios"

const BASE_URL = import.meta.env.VITE_API_URL

export const ACCESS_TOKEN_KEY = "access_token"
export const REFRESH_TOKEN_KEY = "refresh_token"
export const USER_KEY = "auth_user"

export function getStoredAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function storeAuthTokens({ access, refresh }) {
  if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access)
  // The backend rotates refresh tokens on every refresh call and blacklists
  // the old one — if we don't save the NEW refresh token here, the next
  // refresh attempt will fail even though the session is still valid.
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}

export function clearAuthStorage() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export const api = axios.create({
  baseURL: BASE_URL,
})

// Attach the current access token to every outgoing request.
api.interceptors.request.use((config) => {
  const token = getStoredAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// --- 401 handling with a single shared refresh, so multiple requests
// that fail at the same time don't each try to refresh independently
// (which would fail for all but the first, since refresh tokens rotate).
let isRefreshing = false
let pendingQueue = []

function resolveQueue(error, newAccessToken) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(newAccessToken)
  })
  pendingQueue = []
}

// Called by AuthContext when a refresh fails and the session should end.
let onSessionExpired = () => {
  clearAuthStorage()
  window.location.href = "/login"
}
export function setOnSessionExpired(handler) {
  onSessionExpired = handler
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/login/") ||
      originalRequest?.url?.includes("/auth/register/")

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      if (isRefreshing) {
        // A refresh is already in flight — wait for it instead of firing a second one.
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject })
        }).then((newAccessToken) => {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = getStoredRefreshToken()
      if (!refreshToken) {
        isRefreshing = false
        onSessionExpired()
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/login/refresh/`, {
          refresh: refreshToken,
        })
        storeAuthTokens({ access: data.access, refresh: data.refresh })
        resolveQueue(null, data.access)
        originalRequest.headers.Authorization = `Bearer ${data.access}`
        return api(originalRequest)
      } catch (refreshError) {
        resolveQueue(refreshError, null)
        onSessionExpired()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)