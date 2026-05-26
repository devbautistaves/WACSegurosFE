"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

export interface Company {
  id: string
  name: string
  displayName: string
  logo?: string
  primaryColor: string
  secondaryColor: string
  isActive: boolean
  saleStatuses: SaleStatus[]
  settings: CompanySettings
}

export interface SaleStatus {
  id: string
  label: string
  color: string
  order: number
}

export interface CompanySettings {
  hasCobranzas: boolean
  hasClients: boolean
  hasTransactions: boolean
  hasLiquidations: boolean
  hasMaterials: boolean
  hasLeads: boolean
  emailReminders: boolean
  reminderDays: number[]
}

// WAC Seguros — única empresa disponible
export const COMPANIES: Company[] = [
  {
    id: "seguros",
    name: "WAC Seguros",
    displayName: "WAC Seguros",
    primaryColor: "#0f2149",
    secondaryColor: "#1d4ed8",
    isActive: true,
    saleStatuses: [
      { id: "vigente", label: "Vigente", color: "#10b981", order: 1 },
      { id: "pendiente_pago", label: "Pendiente de Pago", color: "#f59e0b", order: 2 },
      { id: "en_mora", label: "En Mora", color: "#ef4444", order: 3 },
      { id: "renovacion", label: "En Renovacion", color: "#3b82f6", order: 4 },
      { id: "anulada", label: "Anulada", color: "#6b7280", order: 5 },
    ],
    settings: {
      hasCobranzas: true,
      hasClients: true,
      hasTransactions: false,
      hasLiquidations: false,
      hasMaterials: false,
      hasLeads: false,
      emailReminders: true,
      reminderDays: [5, 10, 15],
    },
  },
]

const WAC_COMPANY = COMPANIES[0]

interface CompanyContextType {
  currentCompany: Company
  companies: Company[]
  switchCompany: (companyId: string) => void
  isLoading: boolean
  getStatusLabel: (statusId: string) => string
  getStatusColor: (statusId: string) => string
  canSwitchCompany: boolean
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Always lock to WAC Seguros
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedCompanyId", "seguros")
    }
    setIsLoading(false)
  }, [])

  const getStatusLabel = (statusId: string): string => {
    const status = WAC_COMPANY.saleStatuses.find((s) => s.id === statusId)
    return status?.label || statusId
  }

  const getStatusColor = (statusId: string): string => {
    const status = WAC_COMPANY.saleStatuses.find((s) => s.id === statusId)
    return status?.color || "#6b7280"
  }

  return (
    <CompanyContext.Provider
      value={{
        currentCompany: WAC_COMPANY,
        companies: COMPANIES,
        switchCompany: () => {},   // no switching — single company
        isLoading,
        getStatusLabel,
        getStatusColor,
        canSwitchCompany: false,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider")
  }
  return context
}
