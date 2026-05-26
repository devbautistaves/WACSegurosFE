"use client"

import { useEffect, useState } from "react"
import { CompanyProvider } from "@/lib/company-context"
import { AuthProvider, useAuth } from "@/lib/auth-context"

// Wrapper que reinicia CompanyProvider cuando cambia el usuario
function CompanyProviderWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const [key, setKey] = useState(0)
  
  // Forzar re-render del CompanyProvider cuando el usuario cambia
  useEffect(() => {
    if (!isLoading && user) {
      setKey(prev => prev + 1)
    }
  }, [user?._id, isLoading])
  
  return (
    <CompanyProvider key={key}>
      {children}
    </CompanyProvider>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CompanyProviderWrapper>
        {children}
      </CompanyProviderWrapper>
    </AuthProvider>
  )
}
