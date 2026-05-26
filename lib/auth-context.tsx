"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { User, authAPI, usersAPI } from "./api"

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    if (storedToken) {
      setToken(storedToken)
      fetchUser(storedToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  // Heartbeat para actualizar actividad cada 30 segundos
  useEffect(() => {
    if (!token) return

    const sendHeartbeat = async () => {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/heartbeat`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch (error) {
        // Silently fail - no need to log heartbeat errors
      }
    }

    // Send initial heartbeat
    sendHeartbeat()

    // Set up interval for periodic heartbeats
    const interval = setInterval(sendHeartbeat, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [token])

  const fetchUser = async (authToken: string) => {
    try {
      const response = await usersAPI.getProfile(authToken)
      setUser(response.user)
      // Guardar datos del usuario en localStorage para que CompanyContext pueda acceder
      localStorage.setItem("user", JSON.stringify(response.user))
    } catch (error) {
      console.error("Error fetching user:", error)
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      setToken(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password)
    localStorage.setItem("token", response.token)
    // Guardar datos del usuario en localStorage para que CompanyContext pueda acceder
    localStorage.setItem("user", JSON.stringify(response.user))
    setToken(response.token)
    setUser(response.user)
  }

  const logout = async () => {
    // Notify backend about logout
    if (token) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch (error) {
        // Silently fail
      }
    }
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("selectedCompanyId")
    setToken(null)
    setUser(null)
  }

  const refreshUser = async () => {
    if (token) {
      await fetchUser(token)
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
