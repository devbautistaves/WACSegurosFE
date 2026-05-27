"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { dashboardAPI, salesAPI, usersAPI, adCostsAPI, AdminStats, Sale, User, SupervisorAdCost } from "@/lib/api"
import {
  ShoppingCart,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  ArrowUpRight,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Wrench,
  Filter,
  Banknote,
  Building2,
  UserCheck,
  UserCog,
  Wifi,
  WifiOff,
  Circle,
  AlertTriangle,
  Shield,
  Target,
  CreditCard,
  FileText,
  Monitor,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { useCompany } from "@/lib/company-context"
import { MonthNavigator } from "@/components/ui/month-navigator"
import { BackgroundEffect } from "@/components/ui/background-effect"
import {
  clientsAPI, transactionsAPI, collectionsAPI, Client, CollectionItem,
  tpyClientsAPI, tpyTransactionsAPI, tpyCollectionsAPI, tpyStatsAPI, TPY_Stats,
  tpySoftwareAPI,
  segurosAPI, SegurosStats,
} from "@/lib/api"

const STATUS_COLORS: Record<string, string> = {
  pending: "#eab308",
  pending_signature: "#f97316",
  pending_appointment: "#a855f7",
  observed: "#d97706",
  appointed: "#3b82f6",
  completed: "#22c55e",
  cancelled: "#ef4444",
}

interface OnlineUser extends User {
  lastActivity?: string
  sessionStart?: string
  status?: "online" | "idle" | "offline"
  minutesSinceActivity?: number
  minutesOnline?: number
}

export default function AdminDashboardPage() {
  const { currentCompany } = useCompany()
  const [userRole, setUserRole] = useState<string>("")
  useEffect(() => {
    try {
      const u = localStorage.getItem("user")
      if (u) setUserRole(JSON.parse(u).role || "")
    } catch {}
  }, [])
  const isAdminTpy = userRole === "admin_tpy"
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [allSales, setAllSales] = useState<Sale[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [supervisorAdCosts, setSupervisorAdCosts] = useState<SupervisorAdCost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"historico" | "mensual">("historico")
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  
  // Estados para TuPaginaYa (usando nuevas APIs TPY)
  const [tpyStats, setTpyStats] = useState<TPY_Stats | null>(null)
  const [financeSummary, setFinanceSummary] = useState<{ ingresos: number; egresos: number; balance: number } | null>(null)
  const [softwareStats, setSoftwareStats] = useState<{ total: number; activos: number; morosos: number; paidThisMonth: number; monthlyTotal: number } | null>(null)

  // Estados para Seguros
  const [segurosStats, setSegurosStats] = useState<SegurosStats | null>(null)
  const today = new Date()
  const [segurosYear, setSegurosYear]   = useState(today.getFullYear())
  const [segurosMonth, setSegurosMonth] = useState(today.getMonth()) // 0-indexed

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token")
      if (!token) return

      try {
        // Cargar datos comunes
        const usersRes = await usersAPI.getAll(token)
        const users = usersRes.users || []
        setAllUsers(users)
        
        if (currentCompany.id === "tupaginaya" || currentCompany.id === "paginas") {
          // Cargar datos de TuPaginaYa usando nuevas APIs TPY
          // Si es historico, no pasamos mes para obtener todos los datos
          const monthParam = viewMode === "historico" ? undefined : selectedMonth
          // admin_tpy no tiene acceso a CRM software, solo a datos de landing
          const role = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}").role || "" } catch { return "" } })()
          const tpyIsAdminTpy = role === "admin_tpy"
          const fetchList: Promise<any>[] = [
            tpyStatsAPI.get(token, monthParam),
            tpyTransactionsAPI.getAll(token, monthParam ? { month: monthParam } : {}),
          ]
          if (!tpyIsAdminTpy) fetchList.push(tpySoftwareAPI.getClients(token).catch(() => null))
          const [statsRes, transactionsRes, softwareRes] = await Promise.all(fetchList)
          setTpyStats(statsRes.stats)
          setFinanceSummary(transactionsRes.totals)
          if (!tpyIsAdminTpy && softwareRes?.success) setSoftwareStats(softwareRes.stats)
        } else if (currentCompany.id === "seguros") {
          // Cargar datos de Seguros
          const statsRes = await segurosAPI.getDashboard(token, {
            year: String(segurosYear),
            month: String(segurosMonth + 1),
          })
          setSegurosStats(statsRes.stats)
        } else {
          // Cargar datos de TusVentas (actual)
          const [statsRes, salesRes, adCostsRes] = await Promise.all([
            dashboardAPI.getAdminStats(token),
            salesAPI.getAdminSales(token),
            adCostsAPI.getAll(token),
          ])
          setStats(statsRes)
          setAllSales(salesRes.sales || [])
          setSupervisorAdCosts(adCostsRes.adCosts || [])
          
          // Fetch online users from API
          fetchOnlineUsers(token, users)
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    
    // Refresh online users every 30 seconds (empresa alarmas = prosegur)
    let interval: NodeJS.Timeout | null = null
    if (currentCompany.id === "prosegur" || currentCompany.id === "alarmas") {
      interval = setInterval(() => {
        const token = localStorage.getItem("token")
        if (token) fetchOnlineUsers(token)
      }, 30000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [currentCompany.id, selectedMonth, viewMode, segurosYear, segurosMonth])

  const fetchOnlineUsers = async (token: string, usersList?: User[]) => {
    try {
      const data = await usersAPI.getOnlineUsers(token)
      setOnlineUsers(data.users || [])
    } catch (error) {
      console.error("Error fetching online users:", error)
      setOnlineUsers([])
    }
  }

  // Get status color and icon
  const getStatusInfo = (status: string | undefined) => {
    switch (status) {
      case "online":
        return { color: "text-green-400", bgColor: "bg-green-400", label: "En linea" }
      case "idle":
        return { color: "text-amber-400", bgColor: "bg-amber-400", label: "Sin actividad" }
      default:
        return { color: "text-gray-400", bgColor: "bg-gray-400", label: "Desconectado" }
    }
  }

  // Format time display
  const formatTimeDisplay = (user: OnlineUser) => {
    if (user.status === "online") {
      // Mostrar tiempo conectado
      if (user.minutesOnline !== undefined && user.minutesOnline !== null) {
        const hours = Math.floor(user.minutesOnline / 60)
        const mins = user.minutesOnline % 60
        if (hours > 0) return `${hours}h ${mins}m conectado`
        return `${mins}m conectado`
      }
      return "En linea"
    } else if (user.status === "idle") {
      // Mostrar tiempo sin actividad
      if (user.minutesSinceActivity !== undefined) {
        return `${user.minutesSinceActivity}m sin actividad`
      }
      return "Sin actividad"
    } else {
      // Mostrar tiempo desconectado
      if (user.minutesSinceActivity !== undefined) {
        const hours = Math.floor(user.minutesSinceActivity / 60)
        const mins = user.minutesSinceActivity % 60
        if (hours > 0) return `${hours}h ${mins}m desconectado`
        return `${mins}m desconectado`
      }
      return "Desconectado"
    }
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Admin",
      supervisor: "Supervisor",
      seller: "Vendedor",
      support: "Soporte",
    }
    return labels[role] || role
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "text-purple-400",
      supervisor: "text-blue-400",
      seller: "text-green-400",
      support: "text-amber-400",
    }
    return colors[role] || "text-muted-foreground"
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(value)
  }

  // Filtrar ventas del mes seleccionado
  const getMonthSales = () => {
    const [year, month] = selectedMonth.split("-").map(Number)
    return allSales.filter(sale => {
      const saleDate = new Date(sale.createdAt)
      return saleDate.getMonth() + 1 === month && saleDate.getFullYear() === year
    })
  }

  const monthSales = getMonthSales()

  // Calcular estadisticas del mes
  const activatedSales = monthSales.filter(s => s.status === "completed")
  const cancelledSales = monthSales.filter(s => s.status === "cancelled")
  const pendingSales = monthSales.filter(s => s.status === "pending")
  const pendingSignatureSales = monthSales.filter(s => s.status === "pending_signature")
  const pendingTurnSales = monthSales.filter(s => s.status === "pending_appointment")
  const observedSales = monthSales.filter(s => s.status === "observed")
  const appointedSales = monthSales.filter(s => s.status === "appointed")

  // Constantes de negocio
  const SUPERVISOR_BASE_COMMISSION = 750000 // $750.000 base por venta activada
  const ADMIN_COST_PER_SALE = 35000 // $35.000 costo admin por venta
  const SUPERVISOR_PERCENTAGE = 0.40 // 40% para supervisores

  // Tiers de comisiones para vendedores
  const COMMISSION_TIERS = [
    { minSales: 1, maxSales: 4, amount: 200000 },
    { minSales: 5, maxSales: 9, amount: 300000 },
    { minSales: 10, maxSales: 19, amount: 350000 },
    { minSales: 20, maxSales: 25, amount: 375000 },
    { minSales: 26, maxSales: 999, amount: 400000 },
  ]

  const getCommissionPerSale = (salesCount: number) => {
    for (const tier of COMMISSION_TIERS) {
      if (salesCount >= tier.minSales && salesCount <= tier.maxSales) {
        return tier.amount
      }
    }
    return 0
  }

  // Helper para extraer el ID
  const extractId = (field: string | { _id: string } | undefined): string => {
    if (!field) return ""
    if (typeof field === "string") return field
    return field._id || ""
  }

  // Obtener costo de anuncio de un supervisor para el mes seleccionado
  const getSupervisorAdCostForMonth = (supervisorId: string): number => {
    const adCost = supervisorAdCosts.find((cost) => {
      const costSupervisorId = typeof cost.supervisorId === "object"
        ? (cost.supervisorId as { _id: string })._id
        : cost.supervisorId
      return costSupervisorId === supervisorId && cost.month === selectedMonth
    })
    return adCost?.amount || 0
  }

  // INGRESOS: $750.000 por cada venta activada
  const totalRevenue = activatedSales.length * SUPERVISOR_BASE_COMMISSION

  // COSTO DE ADMINISTRACION: $35.000 por cada venta activada
  const totalAdminCost = activatedSales.length * ADMIN_COST_PER_SALE

  // Calcular totales de costos de instalacion de TODAS las ventas del mes (cualquier estado)
  // Esto incluye ventas pendientes, turnadas, activadas, etc. NO solo las completadas
  const totalInstallationCosts = monthSales.reduce((acc, sale) => {
    return acc + (sale.installationCost || 0)
  }, 0)

  // Helper para verificar si tiene comision fija
  const hasFixedCommission = (user: User) => {
    return user.fixedCommissionPerSale !== null && 
           user.fixedCommissionPerSale !== undefined && 
           typeof user.fixedCommissionPerSale === 'number'
  }

  // COMISIONES VENDEDORES: Comision BRUTA (tier * ventas, SIN descontar instalacion)
  const sellers = allUsers.filter(u => u.role === "seller" && u.isActive)
  const totalSellerCommissions = sellers.reduce((total, seller) => {
    // Ventas completadas del mes donde este usuario es el vendedor
    const sellerCompletedSales = activatedSales.filter(s => extractId(s.sellerId) === seller._id)
    const activatedCount = sellerCompletedSales.length
    if (activatedCount === 0) return total
    
    // Verificar si tiene comision fija (puede ser 0 o cualquier numero)
    let perSale: number
    if (hasFixedCommission(seller)) {
      perSale = seller.fixedCommissionPerSale!
    } else {
      perSale = getCommissionPerSale(activatedCount)
    }
    const commission = activatedCount * perSale
    
    return total + commission
  }, 0)

  // COMISIONES SUPERVISORES: Sumar solo la columna "Com. (40%)" de cada supervisor
  // Formula: (Neto100% - Instalacion - Anuncio) * 40%
  // Exactamente igual que en la pagina de comisiones
  const supervisors = allUsers.filter(u => u.role === "supervisor" && u.isActive)
  const totalSupervisorCommissions = supervisors.reduce((total, supervisor) => {
    // Ventas del supervisor (como vendedor o supervisor asignado) del mes
    const supervisorSales = monthSales.filter(s => 
      extractId(s.sellerId) === supervisor._id || extractId(s.supervisorId) === supervisor._id
    )
    const completedSales = supervisorSales.filter(s => s.status === "completed")
    
    // Si no hay ventas completadas, devolver 0 (no tiene comision)
    if (completedSales.length === 0) return total
    
    // Calcular Neto (100%): Base - Admin - ComisionVendedor por cada venta completada
    let neto100 = 0
    completedSales.forEach(sale => {
      const sellerCommission = sale.sellerCommissionPaid || 0
      neto100 += SUPERVISOR_BASE_COMMISSION - ADMIN_COST_PER_SALE - sellerCommission
    })
    
    // Restar costos de instalacion de TODAS las ventas del supervisor del mes
    supervisorSales.forEach(sale => {
      neto100 -= (sale.installationCost || 0)
    })
    
    // Restar costo de anuncio mensual del supervisor
    const monthlyAdCost = getSupervisorAdCostForMonth(supervisor._id)
    const netAfterAdCost = neto100 - monthlyAdCost
    
    // Aplicar 40% sobre el neto despues de descontar anuncio
    const commission40 = Math.max(0, netAfterAdCost * SUPERVISOR_PERCENTAGE)
    return total + commission40
  }, 0)

  // GANANCIA NETA: Ingresos - Todos los costos y comisiones
  const totalCosts = totalAdminCost + totalInstallationCosts + totalSellerCommissions + totalSupervisorCommissions
  const netProfit = totalRevenue - totalCosts

  // Generar meses disponibles
  const getAvailableMonths = () => {
    const months = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const label = date.toLocaleDateString("es-AR", { month: "long", year: "numeric" })
      months.push({ value, label })
    }
    return months
  }

  const pieChartData = [
    { name: "Cargadas", value: pendingSales.length, color: STATUS_COLORS.pending },
    { name: "Pend. Firma", value: pendingSignatureSales.length, color: STATUS_COLORS.pending_signature },
    { name: "Pend. Turno", value: pendingTurnSales.length, color: STATUS_COLORS.pending_appointment },
    { name: "Observadas", value: observedSales.length, color: STATUS_COLORS.observed },
    { name: "Turnadas", value: appointedSales.length, color: STATUS_COLORS.appointed },
    { name: "Instaladas", value: activatedSales.length, color: STATUS_COLORS.completed },
    { name: "Canceladas", value: cancelledSales.length, color: STATUS_COLORS.cancelled },
  ].filter(d => d.value > 0)

  const topSellersData = stats?.stats.topSellers?.map((seller) => ({
    name: seller.name.split(" ")[0],
    ventas: seller.totalSales,
    comisiones: seller.totalCommissions,
  })) || []

  if (isLoading) {
    return (
      <DashboardLayout requiredRole={["admin", "admin_seguros"]}>
        <div className="flex items-center justify-center h-[60vh]">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  // Dashboard de TuPaginaYa
  if (currentCompany.id === "tupaginaya" || currentCompany.id === "paginas") {
    // Usar datos de la nueva API TPY
    const statusCounts = tpyStats?.clientsByStatus || {}
    const totalClients = Object.values(statusCounts).reduce((sum, count) => sum + (count as number), 0)
    
    return (
      <DashboardLayout requiredRole={["admin", "admin_seguros"]}>
        <div className="relative">
          <BackgroundEffect variant="nodes" />
          <div className="relative z-10 space-y-6">
          {/* Header con selector de periodo */}
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard TuPaginaYa</h1>
              <p className="text-sm text-muted-foreground">
                {viewMode === "historico" ? "Estadisticas generales (historico)" : `Estadisticas de ${getAvailableMonths().find(m => m.value === selectedMonth)?.label || selectedMonth}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={viewMode} onValueChange={(v) => setViewMode(v as "historico" | "mensual")}>
                <SelectTrigger className="w-32 sm:w-40">
                  <Filter className="mr-2 h-4 w-4 shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="historico">Historico</SelectItem>
                  <SelectItem value="mensual">Por Mes</SelectItem>
                </SelectContent>
              </Select>
              {viewMode === "mensual" && (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-40 sm:w-48">
                    <Calendar className="mr-2 h-4 w-4 shrink-0" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableMonths().map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Link href="/admin/clients" className="ml-auto sm:ml-0">
                <Button variant="outline" size="sm" className="gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Ver Clientes</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Balance General Card - Responsive (oculto para admin_tpy) */}
          {!isAdminTpy && <Card className={`overflow-hidden ${(financeSummary?.balance || 0) >= 0 ? "border-emerald-500/20" : "border-red-500/20"}`}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col gap-4">
                {/* Balance principal */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                      {viewMode === "historico" ? "Balance General" : "Balance del Mes"}
                    </p>
                    <p className={`text-2xl sm:text-4xl font-bold ${(financeSummary?.balance || 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {formatCurrency(financeSummary?.balance || 0)}
                    </p>
                  </div>
                  <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl ${(financeSummary?.balance || 0) >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"} flex items-center justify-center shrink-0`}>
                    <DollarSign className={`h-5 w-5 sm:h-6 sm:w-6 ${(financeSummary?.balance || 0) >= 0 ? "text-emerald-500" : "text-red-500"}`} />
                  </div>
                </div>
                {/* Ingresos y Egresos */}
                <div className="flex gap-4 sm:gap-8 pt-2 border-t border-border/50">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Ingresos</p>
                    <p className="text-base sm:text-xl font-semibold text-emerald-500">{formatCurrency(financeSummary?.ingresos || 0)}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Egresos</p>
                    <p className="text-base sm:text-xl font-semibold text-red-500">{formatCurrency(financeSummary?.egresos || 0)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>}

          {/* Stats Cards - Grid responsive */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Clientes</p>
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-blue-500" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{totalClients}</p>
                    <p className="text-xs text-muted-foreground">
                      {statusCounts.cliente_activo || 0} activos
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Demos Enviadas</p>
                    <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-purple-500" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold text-purple-500">{statusCounts.demo_enviada || 0}</p>
                    <p className="text-xs text-muted-foreground">
                      {tpyStats?.totalDemos || 0} totales
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Pendientes</p>
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-amber-500" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold text-amber-500">
                      {(statusCounts.pendiente_demo || 0) + (statusCounts.demo_pausada || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {statusCounts.pendiente_web || 0} webs pend.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Bajas</p>
                    <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <XCircle className="h-4 w-4 text-red-500" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold text-red-500">{statusCounts.cliente_baja || 0}</p>
                    <p className="text-xs text-muted-foreground">
                      Clientes baja
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CRM Software Stats — solo para admin normal, no para admin_tpy */}
          {softwareStats && !isAdminTpy && (
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-primary" />
                    CRM Software
                  </CardTitle>
                  <Link href="/admin/software-billing">
                    <Button variant="ghost" size="sm" className="text-xs gap-1">
                      Ver detalle
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className={`grid gap-3 ${isAdminTpy ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">Clientes CRM</p>
                    <p className="text-2xl font-bold">{softwareStats.total}</p>
                    <p className="text-xs text-green-500">{softwareStats.activos} activos</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">Pagaron este mes</p>
                    <p className="text-2xl font-bold text-blue-500">{softwareStats.paidThisMonth}</p>
                    <p className="text-xs text-muted-foreground">de {softwareStats.activos} activos</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">Morosos</p>
                    <p className="text-2xl font-bold text-red-500">{softwareStats.morosos}</p>
                  </div>
                  {!isAdminTpy && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs text-muted-foreground">Facturación mensual</p>
                      <p className="text-xl font-bold text-primary">{formatCurrency(softwareStats.monthlyTotal)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions - Responsive grid */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Acciones Rapidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Link href="/admin/demos" className="block">
                  <Button variant="outline" className="w-full h-16 sm:h-20 flex flex-col gap-1.5 text-xs sm:text-sm">
                    <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span>Demos</span>
                  </Button>
                </Link>
                <Link href="/admin/clients" className="block">
                  <Button variant="outline" className="w-full h-16 sm:h-20 flex flex-col gap-1.5 text-xs sm:text-sm">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span>Clientes</span>
                  </Button>
                </Link>
                <Link href="/admin/transactions" className="block">
                  <Button variant="outline" className="w-full h-16 sm:h-20 flex flex-col gap-1.5 text-xs sm:text-sm">
                    <Banknote className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span>Transacciones</span>
                  </Button>
                </Link>
                {!isAdminTpy && (
                  <Link href="/admin/software-billing" className="block">
                    <Button variant="outline" className="w-full h-16 sm:h-20 flex flex-col gap-1.5 text-xs sm:text-sm">
                      <Monitor className="h-5 w-5 sm:h-6 sm:w-6" />
                      <span>CRM</span>
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Dashboard de Seguros
  if (currentCompany.id === "seguros") {
    const st = segurosStats
    const MONTH_NAMES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
    const mesDashLabel = `${MONTH_NAMES_ES[segurosMonth]} ${segurosYear}`

    const OBJETIVO = 50
    const emitidas = st?.emitidasEsteMes ?? 0
    const pctObjetivo = Math.min(100, Math.round((emitidas / OBJETIVO) * 100))
    const faltan = Math.max(0, OBJETIVO - emitidas)
    const superado = emitidas > OBJETIVO ? emitidas - OBJETIVO : 0
    const metaAlcanzada = emitidas >= OBJETIVO

    const cobranzasPie = st ? [
      { name: "Cobradas",      value: st.efectivoCobradas,       fill: "#22c55e" },
      { name: "Pendiente",     value: st.efectivoPendiente,      fill: "#f59e0b" },
      { name: "Cupón enviado", value: st.efectivoCuponEnviado,   fill: "#3b82f6" },
      { name: "Cuota vencida", value: st.efectivoCuotaVencida,   fill: "#ef4444" },
      { name: "Adeudan 2m",    value: st.efectivoCompromisoPago, fill: "#f97316" },
    ].filter(d => d.value > 0) : []

    const emisionesPie = [
      { name: "Emitidas",  value: emitidas,                         fill: "#3b82f6" },
      { name: "Restantes", value: Math.max(0, OBJETIVO - emitidas), fill: "#1e293b" },
    ]

    return (
      <DashboardLayout requiredRole={["admin", "admin_seguros"]}>
        <div className="space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                <Shield className="h-7 w-7 text-emerald-500" />
                Dashboard Seguros
              </h1>
              <p className="text-sm text-muted-foreground">Resumen general de pólizas, cobranzas y siniestros</p>
            </div>
            <MonthNavigator
              year={segurosYear}
              month={segurosMonth}
              onChange={(y, m) => { setSegurosYear(y); setSegurosMonth(m) }}
            />
          </div>

          {/* Row 1: Stats generales */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link href="/admin/seguros/polizas?estado=VIGENTE">
              <Card className="border-border/50 bg-card/50 cursor-pointer hover:border-emerald-500/50 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{st?.totalVigentes ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">Pólizas Vigentes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/seguros/polizas?estado=ANULADA">
              <Card className="border-border/50 bg-card/50 cursor-pointer hover:border-red-500/50 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                      <XCircle className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{st?.totalAnuladas ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">Total Anuladas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href={`/admin/seguros/polizas?year=${segurosYear}&month=${segurosMonth + 1}`}>
              <Card className="border-border/50 bg-card/50 cursor-pointer hover:border-blue-500/50 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{st?.emitidasEsteMes ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">Emitidas — {mesDashLabel}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href={`/admin/seguros/polizas?estado=ANULADA&year=${segurosYear}&month=${segurosMonth + 1}`}>
              <Card className="border-border/50 bg-card/50 cursor-pointer hover:border-rose-500/50 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                      <TrendingDown className="h-5 w-5 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{st?.anuladasEsteMes ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">Anuladas — {mesDashLabel}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Row 1b: Desglose medio de pago */}
          <div className="grid grid-cols-2 gap-4">
            <Link href="/admin/seguros/cobranzas">
              <Card className="border-border/50 bg-card/50 cursor-pointer hover:border-amber-500/50 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Banknote className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{st?.totalCobranzas ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">Vigentes en Efectivo / Cupón</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/seguros/polizas?estado=VIGENTE">
              <Card className="border-border/50 bg-card/50 cursor-pointer hover:border-violet-500/50 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                      <CreditCard className="h-5 w-5 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{st?.vigentesDebito ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        Vigentes Débito Automático
                        {st ? ` (CBU: ${st.debitoCBU} / TC: ${st.debitoTarjCred})` : ""}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Row 2: Objetivo mensual */}
          <Card className={`border-2 ${metaAlcanzada ? "border-emerald-500/50 bg-emerald-500/5" : "border-border/50 bg-card/50"}`}>
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${metaAlcanzada ? "bg-emerald-500/20" : "bg-blue-500/10"}`}>
                  <Target className={`h-7 w-7 ${metaAlcanzada ? "text-emerald-500" : "text-blue-500"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Objetivo {mesDashLabel}</span>
                    {metaAlcanzada
                      ? <span className="text-xs font-bold text-emerald-500 bg-emerald-500/15 px-2 py-0.5 rounded-full">¡META ALCANZADA!</span>
                      : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mb-3">
                    <div className="text-center">
                      <p className="text-3xl font-bold">{emitidas}</p>
                      <p className="text-xs text-muted-foreground">Emitidas</p>
                    </div>
                    <div className="text-2xl text-muted-foreground/40 font-light">/</div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-muted-foreground">{OBJETIVO}</p>
                      <p className="text-xs text-muted-foreground">Meta</p>
                    </div>
                    <div className="text-center">
                      {metaAlcanzada
                        ? <p className="text-3xl font-bold text-emerald-500">+{superado}</p>
                        : <p className="text-3xl font-bold text-amber-500">{faltan}</p>}
                      <p className="text-xs text-muted-foreground">{metaAlcanzada ? "Superadas" : "Faltan"}</p>
                    </div>
                  </div>
                  <div className="w-full bg-secondary/50 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-700 ${metaAlcanzada ? "bg-emerald-500" : "bg-blue-500"}`}
                      style={{ width: `${pctObjetivo}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {metaAlcanzada
                      ? `¡Excelente! Superaron el objetivo por ${superado} póliza${superado !== 1 ? "s" : ""}. (${pctObjetivo}%)`
                      : `${pctObjetivo}% completado — faltan ${faltan} póliza${faltan !== 1 ? "s" : ""} para llegar al objetivo.`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Row 2b: Pólizas por compañía */}
          {st?.porAseguradora && st.porAseguradora.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Pólizas Vigentes por Compañía
              </p>
              <div className="flex flex-wrap gap-3">
                {st.porAseguradora.map((a) => (
                  <Link key={a._id} href={`/admin/seguros/polizas?estado=VIGENTE&aseguradora=${encodeURIComponent(a._id)}`}>
                    <Card className="border-border/50 bg-card/50 shrink-0 cursor-pointer hover:border-emerald-500/50 transition-all">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Shield className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-xl font-bold leading-none">{a.total}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{a._id || "Sin compañía"}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Row 2c: Pólizas por ramo */}
          {st?.porRamo && st.porRamo.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Pólizas Vigentes por Ramo
              </p>
              <div className="flex flex-wrap gap-3">
                {st.porRamo.filter(r => r._id).map((r) => {
                  const RAMO_LABELS: Record<string, string> = {
                    AUTOMOTORES: "Automotores", MOTO: "Motos", BICICLETA: "Bicicleta",
                    HOGAR: "Hogar", ACC_PERSONALES: "Acc. Personales", CELULAR: "Celular",
                    COMERCIO: "Comercio", OTRO: "Otro",
                  }
                  const RAMO_COLORS: Record<string, string> = {
                    AUTOMOTORES: "bg-blue-500/10 text-blue-500 hover:border-blue-500/50",
                    MOTO: "bg-purple-500/10 text-purple-500 hover:border-purple-500/50",
                    BICICLETA: "bg-green-500/10 text-green-500 hover:border-green-500/50",
                    HOGAR: "bg-orange-500/10 text-orange-500 hover:border-orange-500/50",
                    ACC_PERSONALES: "bg-pink-500/10 text-pink-500 hover:border-pink-500/50",
                    CELULAR: "bg-cyan-500/10 text-cyan-500 hover:border-cyan-500/50",
                    COMERCIO: "bg-yellow-500/10 text-yellow-600 hover:border-yellow-500/50",
                    OTRO: "bg-gray-500/10 text-gray-400 hover:border-gray-500/50",
                  }
                  const colorClass = RAMO_COLORS[r._id] || "bg-gray-500/10 text-gray-400 hover:border-gray-500/50"
                  const [iconBg, iconColor] = colorClass.split(" ")
                  return (
                    <Link key={r._id} href={`/admin/seguros/polizas?estado=VIGENTE&ramo=${encodeURIComponent(r._id)}`}>
                      <Card className={`border-border/50 bg-card/50 shrink-0 cursor-pointer transition-all ${colorClass.split(" ").find(c => c.startsWith("hover:")) || ""}`}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
                            <FileText className={`h-4 w-4 ${iconColor}`} />
                          </div>
                          <div>
                            <p className="text-xl font-bold leading-none">{r.total}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{RAMO_LABELS[r._id] || r._id}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Row 3: Gráficos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pie cobranzas */}
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">% Cobranzas — {mesDashLabel}</CardTitle>
                <CardDescription className="text-xs">
                  {st ? `${st.totalCobranzas} clientes en total` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {cobranzasPie.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={cobranzasPie}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {cobranzasPie.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          const total = st?.totalCobranzas || 1
                          return [`${value} (${Math.round((value / total) * 100)}%)`, name]
                        }}
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                    Sin datos de cobranzas para {mesDashLabel}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Donut emisiones vs objetivo */}
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Emisiones vs Objetivo — {mesDashLabel}</CardTitle>
                <CardDescription className="text-xs">Meta: {OBJETIVO} pólizas</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex flex-col items-center">
                <div className="relative">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie
                        data={emisionesPie}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        startAngle={90}
                        endAngle={-270}
                        paddingAngle={emitidas > 0 && emitidas < OBJETIVO ? 2 : 0}
                        dataKey="value"
                      >
                        {emisionesPie.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold">{pctObjetivo}%</span>
                    <span className="text-xs text-muted-foreground">completado</span>
                  </div>
                </div>
                <div className="flex gap-6 text-sm mt-1">
                  <div className="text-center">
                    <p className="font-bold text-blue-400">{emitidas}</p>
                    <p className="text-xs text-muted-foreground">Emitidas</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-muted-foreground/50">{OBJETIVO}</p>
                    <p className="text-xs text-muted-foreground">Objetivo</p>
                  </div>
                  {metaAlcanzada
                    ? <div className="text-center">
                        <p className="font-bold text-emerald-500">+{superado}</p>
                        <p className="text-xs text-muted-foreground">Superado</p>
                      </div>
                    : <div className="text-center">
                        <p className="font-bold text-amber-500">{faltan}</p>
                        <p className="text-xs text-muted-foreground">Faltan</p>
                      </div>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick access cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/admin/seguros/polizas">
              <Card className="border-border/50 bg-card/50 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Shield className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Gestión de Pólizas</p>
                    <p className="text-sm text-muted-foreground">Ver, crear y editar pólizas</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/seguros/siniestros">
              <Card className="border-border/50 bg-card/50 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all cursor-pointer">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Gestión de Siniestros</p>
                    <p className="text-sm text-muted-foreground">
                      {st?.siniestrosEnTramite ? `${st.siniestrosEnTramite} en trámite` : "Ver siniestros"}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/seguros/cobranzas">
              <Card className="border-border/50 bg-card/50 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Banknote className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Cobranzas</p>
                    <p className="text-sm text-muted-foreground">
                      {st ? `${st.efectivoCobradas} cobradas este mes` : "Pagos mensuales"}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/seguros/seguimiento">
              <Card className="border-border/50 bg-card/50 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all cursor-pointer">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Seguimiento</p>
                    <p className="text-sm text-muted-foreground">Prospectos y cotizaciones</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </CardContent>
              </Card>
            </Link>
          </div>

        </div>
      </DashboardLayout>
    )
  }

  // Dashboard de TusVentas (original)
  return (
    <DashboardLayout requiredRole={["admin", "admin_seguros"]}>
      <div className="relative">
        <BackgroundEffect variant="aurora" />
        <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Resumen general del negocio
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[160px] sm:w-[200px] bg-secondary/50">
                <Calendar className="mr-2 h-4 w-4 shrink-0" />
                <SelectValue placeholder="Seleccionar mes" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableMonths().map(month => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link href="/admin/sales">
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Ver Todas</span>
                <span className="sm:hidden">Ver</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Stats - Hero Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {/* Total Ventas del Mes */}
          <Card className="border-border/50 bg-gradient-to-br from-primary/10 via-card to-card">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1 sm:space-y-2 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Ventas del Mes</p>
                  <p className="text-2xl sm:text-4xl font-bold text-foreground">{monthSales.length}</p>
                  <div className="flex items-center gap-1 sm:gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 text-xs sm:text-sm text-green-400">
                      <CheckCircle className="h-3 w-3" />
                      {activatedSales.length} activ.
                    </span>
                  </div>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ingresos Totales */}
          <Card className="border-green-500/30 bg-gradient-to-br from-green-500/10 via-card to-card">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1 sm:space-y-2 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Ingresos</p>
                  <p className="text-xl sm:text-4xl font-bold text-green-400 truncate">{formatCurrency(totalRevenue)}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground pt-1">
                    {activatedSales.length} x $750k
                  </p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                  <Banknote className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Costo Administracion */}
          <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-card to-card">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1 sm:space-y-2 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Costo Admin</p>
                  <p className="text-xl sm:text-4xl font-bold text-blue-400 truncate">{formatCurrency(totalAdminCost)}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground pt-1">
                    {activatedSales.length} x $35k
                  </p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ganancia Neta */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1 sm:space-y-2 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Ganancia Neta</p>
                  <p className={`text-xl sm:text-4xl font-bold truncate ${netProfit >= 0 ? 'text-primary' : 'text-red-400'}`}>
                    {formatCurrency(netProfit)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground pt-1">
                    Ing. - Costos
                  </p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Costs Breakdown Row */}
        <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {/* Costos de Instalacion */}
          <Card className="border-red-500/30 bg-card/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Inst.</p>
                  <p className="text-base sm:text-xl font-bold text-red-400 truncate">-{formatCurrency(totalInstallationCosts)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comisiones Vendedores */}
          <Card className="border-amber-500/30 bg-card/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Com. Vend.</p>
                  <p className="text-base sm:text-xl font-bold text-amber-400 truncate">-{formatCurrency(totalSellerCommissions)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comisiones Supervisores */}
          <Card className="border-purple-500/30 bg-card/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                  <UserCog className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Com. Sup.</p>
                  <p className="text-base sm:text-xl font-bold text-purple-400 truncate">-{formatCurrency(totalSupervisorCommissions)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Costos */}
          <Card className="border-gray-500/30 bg-card/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gray-500/10 flex items-center justify-center shrink-0">
                  <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Total</p>
                  <p className="text-base sm:text-xl font-bold text-gray-400 truncate">-{formatCurrency(totalCosts)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Cards Row */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          <StatusCard
            title="Cargadas"
            count={pendingSales.length}
            icon={Clock}
            color="text-yellow-400"
            bgColor="bg-yellow-500/10"
            borderColor="border-yellow-500/30"
            status="pending"
            month={selectedMonth}
          />
          <StatusCard
            title="Pend. Firma"
            count={pendingSignatureSales.length}
            icon={Clock}
            color="text-orange-400"
            bgColor="bg-orange-500/10"
            borderColor="border-orange-500/30"
            status="pending_signature"
            month={selectedMonth}
          />
          <StatusCard
            title="Pend. Turno"
            count={pendingTurnSales.length}
            icon={Calendar}
            color="text-purple-400"
            bgColor="bg-purple-500/10"
            borderColor="border-purple-500/30"
            status="pending_appointment"
            month={selectedMonth}
          />
          <StatusCard
            title="Observadas"
            count={observedSales.length}
            icon={AlertTriangle}
            color="text-amber-400"
            bgColor="bg-amber-500/10"
            borderColor="border-amber-500/30"
            status="observed"
            month={selectedMonth}
          />
          <StatusCard
            title="Turnadas"
            count={appointedSales.length}
            icon={Calendar}
            color="text-blue-400"
            bgColor="bg-blue-500/10"
            borderColor="border-blue-500/30"
            status="appointed"
            month={selectedMonth}
          />
          <StatusCard
            title="Instaladas"
            count={activatedSales.length}
            icon={CheckCircle}
            color="text-green-400"
            bgColor="bg-green-500/10"
            borderColor="border-green-500/30"
            status="completed"
            month={selectedMonth}
          />
          <StatusCard
            title="Canceladas"
            count={cancelledSales.length}
            icon={XCircle}
            color="text-red-400"
            bgColor="bg-red-500/10"
            borderColor="border-red-500/30"
            status="cancelled"
            month={selectedMonth}
          />
        </div>

        {/* Online Users and Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Online Users */}
          <Card className="border-green-500/30 bg-card/50 lg:col-span-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Wifi className="h-4 w-4 text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Vendedores En Linea</CardTitle>
                    <CardDescription className="text-xs">
                      {onlineUsers.filter(u => u.status === "online").length} activos, {onlineUsers.filter(u => u.status === "idle").length} inactivos
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Circle className="h-2 w-2 fill-green-400 text-green-400 animate-pulse" />
                  <span className="text-xs text-green-400">LIVE</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
                {onlineUsers.length > 0 ? (
                  onlineUsers.map((user) => {
                    const statusInfo = getStatusInfo(user.status)
                    return (
                      <div
                        key={user._id}
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="relative">
                            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-medium text-primary">
                                {user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                              </span>
                            </div>
                            <Circle className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-current ${statusInfo.color} border-2 border-card rounded-full`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                            <p className={`text-xs ${getRoleColor(user.role)}`}>{getRoleLabel(user.role)}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</p>
                          <p className={`text-xs font-medium ${statusInfo.color}`}>{formatTimeDisplay(user)}</p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <WifiOff className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No hay usuarios conectados</p>
                    <p className="text-xs text-muted-foreground/70">Los usuarios apareceran aqui cuando inicien sesion</p>
                  </div>
                )}
              </div>
              {onlineUsers.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <p className="text-lg font-bold text-green-400">{onlineUsers.filter(u => u.status === "online").length}</p>
                      <p className="text-xs text-muted-foreground">En linea</p>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <p className="text-lg font-bold text-amber-400">{onlineUsers.filter(u => u.status === "idle").length}</p>
                      <p className="text-xs text-muted-foreground">Sin actividad</p>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-500/10">
                      <p className="text-lg font-bold text-gray-400">{onlineUsers.filter(u => u.status === "offline").length}</p>
                      <p className="text-xs text-muted-foreground">Desconectados</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card className="border-border/50 bg-card/50 lg:col-span-2">
            <CardHeader>
              <CardTitle>Distribucion por Estado</CardTitle>
              <CardDescription>Ventas del mes agrupadas por estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No hay ventas en este mes
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Top Sellers - Grid de cuadraditos */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>Vendedores del Mes</CardTitle>
            <CardDescription>Ventas activadas y turnadas por vendedor</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              // Calcular ventas por vendedor del mes
              const sellerStats = monthSales.reduce((acc, sale) => {
                const sellerName = sale.sellerName
                if (!acc[sellerName]) {
                  acc[sellerName] = { 
                    name: sellerName, 
                    activated: 0, 
                    appointed: 0, 
                    total: 0 
                  }
                }
                if (sale.status === "completed") acc[sellerName].activated++
                if (sale.status === "appointed") acc[sellerName].appointed++
                acc[sellerName].total++
                return acc
              }, {} as Record<string, { name: string; activated: number; appointed: number; total: number }>)

              const sellersArray = Object.values(sellerStats).sort((a, b) => {
                // Ordenar primero por activadas, luego por turnadas
                if (b.activated !== a.activated) return b.activated - a.activated
                return b.appointed - a.appointed
              })

              if (sellersArray.length === 0) {
                return (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    No hay ventas registradas en este mes
                  </div>
                )
              }

              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {sellersArray.map((seller, index) => (
                    <div
                      key={seller.name}
                      className={`relative p-4 rounded-lg border transition-colors ${
                        index === 0 
                          ? "border-primary/50 bg-primary/10" 
                          : "border-border/50 bg-secondary/20 hover:bg-secondary/30"
                      }`}
                    >
                      {index === 0 && (
                        <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-xs font-bold text-primary-foreground">1</span>
                        </div>
                      )}
                      <div className="text-center">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                          <span className="text-sm font-semibold text-primary">
                            {seller.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <p className="font-medium text-foreground text-sm truncate">{seller.name.split(" ")[0]}</p>
                        <div className="flex items-center justify-center gap-3 mt-2">
                          <div className="text-center">
                            <p className="text-lg font-bold text-green-400">{seller.activated}</p>
                            <p className="text-[10px] text-muted-foreground">Activ.</p>
                          </div>
                          <div className="h-6 w-px bg-border" />
                          <div className="text-center">
                            <p className="text-lg font-bold text-blue-400">{seller.appointed}</p>
                            <p className="text-[10px] text-muted-foreground">Turn.</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Total: {seller.total}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </CardContent>
        </Card>

        </div>
      </div>
    </DashboardLayout>
  )
}

function StatusCard({
  title,
  count,
  icon: Icon,
  color,
  bgColor,
  borderColor,
  status,
  month,
}: {
  title: string
  count: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  borderColor: string
  status: string
  month: string
}) {
  return (
    <Link href={`/admin/sales?status=${status}&month=${month}`}>
      <Card className={`border ${borderColor} bg-card/50 hover:bg-card/80 hover:scale-[1.02] transition-all cursor-pointer`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground truncate">{title}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
