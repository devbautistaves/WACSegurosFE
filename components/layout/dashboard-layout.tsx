"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { Spinner } from "@/components/ui/spinner"
import { User, usersAPI } from "@/lib/api"
import { getMaintenanceStatus } from "@/hooks/use-maintenance"

interface DashboardLayoutProps {
  children: React.ReactNode
  requiredRole?: string | string[]
}

export function DashboardLayout({ children, requiredRole }: DashboardLayoutProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const requiredRoleRef = useRef(requiredRole)
  
  // Keep ref updated
  useEffect(() => {
    requiredRoleRef.current = requiredRole
  }, [requiredRole])

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (!token || !userData) {
      router.push("/login")
      return
    }

    // Check maintenance mode for non-admin users
    const checkMaintenanceMode = () => {
      const isMaintenanceMode = getMaintenanceStatus()
      const role = requiredRoleRef.current
      const isAdminPage = role === "admin" || role === "admin_seguros" ||
        (Array.isArray(role) && (role.includes("admin") || role.includes("admin_seguros")))
      if (isMaintenanceMode && !isAdminPage) {
        router.replace("/maintenance")
        return true
      }
      return false
    }

    if (checkMaintenanceMode()) return

    // Validate session
    const validateSession = async () => {
      try {
        const response = await usersAPI.getProfile(token)
        
        if (!response.user) {
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          router.push("/login")
          return
        }

        // Update user data if changed
        localStorage.setItem("user", JSON.stringify(response.user))
        
        const currentRequiredRole = requiredRoleRef.current
        if (currentRequiredRole) {
          const allowedRoles = Array.isArray(currentRequiredRole)
            ? currentRequiredRole
            : [currentRequiredRole]
          if (!allowedRoles.includes(response.user.role)) {
            const redirectPath =
              response.user.role === "admin" || response.user.role === "admin_seguros"
                ? "/admin"
                : response.user.role === "supervisor"
                  ? "/supervisor"
                  : response.user.role === "support"
                    ? "/support"
                    : "/seller"
            router.push(redirectPath)
            return
          }
        }

        setUser(response.user)
      } catch {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.push("/login")
      } finally {
        setIsLoading(false)
      }
    }

    validateSession()

    // Listener for logout in other tabs and maintenance mode changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token" && !e.newValue) {
        router.push("/login")
      }
      if (e.key === "maintenance_mode_enabled") {
        checkMaintenanceMode()
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-[#1a3a5c]" />
          <p className="text-slate-500">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-100 flex overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop: fixed, Mobile: slide in */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 flex-shrink-0 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar role={user.role} userName={user.name} onLinkClick={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
        <Header
          userName={user.name}
          role={user.role}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-auto overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
