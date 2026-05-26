"use client"

import { useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"

const ROLE_ROUTES: Record<string, string> = {
  admin: "/admin/notifications",
  admin_seguros: "/admin/notifications",
  admin_tpy: "/admin/notifications",
  supervisor: "/supervisor/notifications",
  support: "/admin/notifications",
  seller: "/seller/notifications",
}

function ViewRedirect() {
  const params = useSearchParams()
  const router = useRouter()
  const id = params.get("id")
  const company = params.get("company")

  useEffect(() => {
    let role = "seller"
    try {
      const userData = localStorage.getItem("user")
      if (userData) role = JSON.parse(userData).role || "seller"
    } catch {}

    // Si viene con company en la URL, actualizar el contexto de empresa antes de redirigir
    if (company) {
      try {
        localStorage.setItem("selectedCompanyId", company)
      } catch {}
    }

    const base = ROLE_ROUTES[role] || "/seller/notifications"
    router.replace(id ? `${base}?open=${id}` : base)
  }, [id, company, router])

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <Spinner className="h-8 w-8 text-primary" />
    </div>
  )
}

export default function NotificationsViewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-background">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    }>
      <ViewRedirect />
    </Suspense>
  )
}
