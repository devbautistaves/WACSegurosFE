"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

const MAINTENANCE_KEY = "maintenance_mode_enabled"

export function useMaintenanceMode() {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check maintenance mode status
    const checkMaintenance = () => {
      const enabled = localStorage.getItem(MAINTENANCE_KEY) === "true"
      setIsMaintenanceMode(enabled)
      
      // If maintenance is enabled, check if user should be redirected
      if (enabled) {
        const userStr = localStorage.getItem("user")
        let isAdmin = false
        
        if (userStr) {
          try {
            const user = JSON.parse(userStr)
            isAdmin = user.role === "admin"
          } catch {
            isAdmin = false
          }
        }
        
        // If not admin and not on maintenance/login page, redirect
        const allowedPaths = ["/maintenance", "/login", "/"]
        const isAllowedPath = allowedPaths.some(p => pathname === p) || pathname?.startsWith("/admin")
        
        if (!isAdmin && !isAllowedPath) {
          router.replace("/maintenance")
        }
      }
    }
    
    checkMaintenance()
    
    // Listen for storage changes (in case maintenance is toggled in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === MAINTENANCE_KEY) {
        checkMaintenance()
      }
    }
    
    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [router, pathname])

  const toggleMaintenanceMode = (enabled: boolean) => {
    localStorage.setItem(MAINTENANCE_KEY, String(enabled))
    setIsMaintenanceMode(enabled)
    
    // Dispatch storage event for other components
    window.dispatchEvent(new StorageEvent("storage", {
      key: MAINTENANCE_KEY,
      newValue: String(enabled)
    }))
  }

  return {
    isMaintenanceMode,
    toggleMaintenanceMode
  }
}

export function getMaintenanceStatus(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(MAINTENANCE_KEY) === "true"
}
