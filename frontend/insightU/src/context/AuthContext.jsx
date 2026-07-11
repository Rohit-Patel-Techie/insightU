import React, { createContext, useContext, useEffect, useState } from "react"

import {
  api,
  clearAuthStorage,
  getStoredAccessToken,
  getStoredRefreshToken,
  setOnSessionExpired,
  storeAuthTokens,
  USER_KEY,
} from "@/lib/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const persistUser = (userData) => {
    setUser(userData)
    if (userData) {
      localStorage.setItem(USER_KEY, JSON.stringify(userData))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  }

  const logout = async ({ silent = false } = {}) => {
    const refresh = getStoredRefreshToken()
    if (refresh && !silent) {
      try {
        await api.post("/auth/logout/", { refresh })
      } catch {
        // Even if the blacklist call fails (e.g. token already expired),
        // we still want to clear the local session below.
      }
    }
    clearAuthStorage()
    persistUser(null)
  }

  // If the axios interceptor decides a session is unrecoverable (refresh
  // failed), it calls this — same cleanup as a normal logout, minus the
  // network call, since the tokens are already invalid at that point.
  useEffect(() => {
    setOnSessionExpired(() => {
      clearAuthStorage()
      persistUser(null)
      if (window.location.pathname !== "/login") {
        window.location.href = "/login"
      }
    })
  }, [])

  // On first load, if we have tokens, trust the cached user for a fast paint,
  // then re-verify against /profile/ in the background.
  useEffect(() => {
    const bootstrap = async () => {
      const accessToken = getStoredAccessToken()
      const cachedUser = localStorage.getItem(USER_KEY)

      if (!accessToken) {
        setIsLoading(false)
        return
      }

      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser))
        } catch {
          // ignore malformed cache
        }
      }

      try {
        const { data } = await api.get("/auth/profile/")
        persistUser(data)
      } catch {
        // The request interceptor already tried a silent refresh if this was
        // a 401; if we're still here with an error, the session is dead.
        clearAuthStorage()
        persistUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    bootstrap()
  }, [])

  const login = async ({ username, password }) => {
    const { data } = await api.post("/auth/login/", { username, password })
    storeAuthTokens({ access: data.access, refresh: data.refresh })
    persistUser(data.user)
    return data.user
  }

  const register = async ({ username, email, password, password2 }) => {
    const { data } = await api.post("/auth/register/", {
      username,
      email,
      password,
      password2,
    })
    return data.user
  }

  const requestPasswordReset = async ({ email }) => {
    const { data } = await api.post("/auth/password-reset/", { email })
    return data
  }

  const confirmPasswordReset = async ({
    uid,
    token,
    new_password,
    new_password2,
  }) => {
    const { data } = await api.post("/auth/password-reset-confirm/", {
      uid,
      token,
      new_password,
      new_password2,
    })
    return data
  }

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    requestPasswordReset,
    confirmPasswordReset,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}