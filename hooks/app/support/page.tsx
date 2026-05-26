"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/layout/sidebar"
import { Button } from "@/components/ui/button"
import {
  ShoppingCart,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Menu,
  Eye,
  AlertCircle,
  Plus,
  DollarSign,
  FileText,
} from "lucide-react"

// Constante de costo de administracion por venta instalada
const ADMIN_COST_PER_SALE = 35000
import { supportAPI } from "@/lib/api"

interface SupportStats {
  totalSales: number
  pendingSales: number
  pendingSignature: number
  pendingAppointment: number
  appointedSales: number
  completedSales: number
  cancelledSales: number
  totalSellers: number
  totalSupervisors: number
}

export default function SupportDashboard() {
  const [stats, setStats] = useState<SupportStats | null>(null)
  const [userName, setUserName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userStr = localStorage.getItem("user")
    
    if (!token || !userStr) {
      router.push("/login")
      return
    }

    const user = JSON.parse(userStr)
    if (user.role !== "support") {
      router.push("/login")
      return
    }

    setUserName(user.name)
    fetchStats(token)
  }, [router])

  const fetchStats = async (token: string) => {
    try {
      // Intentar endpoint de support primero, con fallback a admin
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.100.6:3000"
      const response = await fetch(`${API_URL}/api/support/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      } else {
        // Fallback: calcular stats desde las ventas
        const salesRes = await supportAPI.getSales(token)
        const sales = salesRes.sales || []
        const usersRes = await supportAPI.getUsers(token)
        const users = usersRes.users || []
        
        setStats({
          totalSales: sales.length,
          pendingSales: sales.filter(s => s.status === "pending").length,
          pendingSignature: sales.filter(s => s.status === "pending_signature").length,
          pendingAppointment: sales.filter(s => s.status === "pending_appointment").length,
          appointedSales: sales.filter(s => s.status === "appointed").length,
          completedSales: sales.filter(s => s.status === "completed").length,
          cancelledSales: sales.filter(s => s.status === "cancelled").length,
          totalSellers: users.filter(u => u.role === "seller" && u.isActive).length,
          totalSupervisors: users.filter(u => u.role === "supervisor" && u.isActive).length,
        })
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:relative lg:z-0
        transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar 
          role="support" 
          userName={userName} 
          onLinkClick={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-semibold">Panel de Soporte</h1>
        </div>

        <div className="p-4 md:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Panel de Soporte</h1>
            <p className="text-muted-foreground mt-1">Gestion de ventas y estados</p>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Ventas */}
            <Card className="border-border/50 bg-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Total Ventas</p>
                    <p className="text-4xl font-bold text-foreground">{stats?.totalSales || 0}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activadas */}
            <Card className="border-green-500/30 bg-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Activadas</p>
                    <p className="text-4xl font-bold text-green-400">{stats?.completedSales || 0}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Turnadas */}
            <Card className="border-blue-500/30 bg-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Turnadas</p>
                    <p className="text-4xl font-bold text-blue-400">{stats?.appointedSales || 0}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Canceladas */}
            <Card className="border-red-500/30 bg-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Canceladas</p>
                    <p className="text-4xl font-bold text-red-400">{stats?.cancelledSales || 0}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Second Row - Pendientes */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Pendientes */}
            <Card className="border-amber-500/30 bg-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
                    <p className="text-4xl font-bold text-amber-400">{stats?.pendingSales || 0}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pendiente de Turno */}
            <Card className="border-purple-500/30 bg-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Pend. de Turno</p>
                    <p className="text-4xl font-bold text-purple-400">{stats?.pendingAppointment || 0}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vendedores */}
            <Card className="border-border/50 bg-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Vendedores Activos</p>
                    <p className="text-4xl font-bold text-foreground">{stats?.totalSellers || 0}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Supervisores */}
            <Card className="border-border/50 bg-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Supervisores Activos</p>
                    <p className="text-4xl font-bold text-foreground">{stats?.totalSupervisors || 0}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sueldo Total Card */}
          <Card className="border-[#39FF14]/50 bg-gradient-to-br from-[#39FF14]/20 via-card to-card shadow-lg shadow-[#39FF14]/10">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <p className="text-lg font-semibold text-foreground">MI SUELDO TOTAL</p>
                  <p className="text-5xl font-bold text-[#39FF14] drop-shadow-[0_0_10px_rgba(57,255,20,0.5)]">
                    {new Intl.NumberFormat("es-AR", {
                      style: "currency",
                      currency: "ARS",
                      minimumFractionDigits: 0,
                    }).format((stats?.completedSales || 0) * ADMIN_COST_PER_SALE)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {stats?.completedSales || 0} ventas instaladas x ${ADMIN_COST_PER_SALE.toLocaleString("es-AR")} = Sueldo acumulado
                  </p>
                </div>
                <div className="h-16 w-16 rounded-2xl bg-[#39FF14]/20 flex items-center justify-center">
                  <DollarSign className="h-8 w-8 text-[#39FF14]" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rapidas</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2"
                onClick={() => router.push("/support/sales")}
              >
                <Eye className="h-6 w-6" />
                <span>Ver Todas las Ventas</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2"
                onClick={() => router.push("/support/sales?status=pending_appointment")}
              >
                <AlertCircle className="h-6 w-6" />
                <span>Ver Pend. Turno</span>
              </Button>
              <Button
                className="h-20 flex flex-col items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => router.push("/support/new-sale")}
              >
                <Plus className="h-6 w-6" />
                <span>Cargar Nueva Venta</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
