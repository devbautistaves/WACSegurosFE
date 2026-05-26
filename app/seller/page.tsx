"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { StatCard } from "@/components/dashboard/stat-card"
import { BackgroundEffect } from "@/components/ui/background-effect"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { dashboardAPI, salesAPI, usersAPI, leadsAPI, advancesAPI, tpyClientsAPI, tpyDemosAPI, DashboardStats, Sale, Lead, Advance, TPY_Demo } from "@/lib/api"
import { useCompany } from "@/lib/company-context"
import { getCommissionPerSale, calculateTotalCommission } from "@/lib/commissions"
import {
  DollarSign,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  AlertTriangle,
  UserPlus,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface UserProfile {
  _id: string
  name: string
  fixedCommissionPerSale?: number | null
}

interface TPYClient {
  _id: string
  name: string
  status: string
  monthlyPrice: number
  billingDay: number
}

export default function SellerDashboardPage() {
  const { currentCompany } = useCompany()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [mySales, setMySales] = useState<Sale[]>([])
  const [myLeads, setMyLeads] = useState<Lead[]>([])
  const [myAdvances, setMyAdvances] = useState<Advance[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tpyClients, setTpyClients] = useState<TPYClient[]>([])
  const [tpyDemos, setTpyDemos] = useState<TPY_Demo[]>([])
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token")
      if (!token) return

      try {
        if (currentCompany.id === "tupaginaya" || currentCompany.id === "paginas") {
          // For TuPaginaYa, fetch clients and demos assigned to the seller
          const [clientsRes, demosRes] = await Promise.all([
            tpyClientsAPI.getMyClients(token),
            tpyDemosAPI.getMyDemos(token),
          ])
          setTpyClients(clientsRes.clients || [])
          setTpyDemos(demosRes.demos || [])
        } else {
          // For Prosegur, fetch all sales data
          const [statsRes, salesRes, profileRes, leadsRes, advancesRes] = await Promise.all([
            dashboardAPI.getStats(token),
            salesAPI.getMySales(token),
            usersAPI.getProfile(token),
            leadsAPI.getMyLeads(token),
            advancesAPI.getMine(token, selectedMonth),
          ])
          setStats(statsRes)
          setMySales(salesRes.sales)
          setUserProfile(profileRes.user as UserProfile)
          setMyLeads(leadsRes.leads || [])
          setMyAdvances(advancesRes.advances || [])
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedMonth, currentCompany])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(value)
  }

  // Filtrar ventas del mes seleccionado segun reglas de negocio:
  // - INSTALADAS (completed): Se muestran en el mes de completedDate (fecha de activacion)
  // - TURNADAS (appointed): Se muestran en el mes de appointedDate (fecha del turno)
  // - PENDIENTE DE TURNO (pending_appointment): Aparecen en TODOS los meses hasta que se resuelvan
  // - Otros estados: Se muestran en el mes de createdAt
  const getMonthSales = () => {
    const [year, month] = selectedMonth.split("-").map(Number)
    return mySales.filter(sale => {
      // PENDIENTE DE TURNO: aparecen en todos los meses
      if (sale.status === "pending_appointment") {
        return true
      }
      
      // INSTALADAS: usar fecha de activacion
      if (sale.status === "completed" && sale.completedDate) {
        const completedDate = new Date(sale.completedDate)
        return completedDate.getMonth() + 1 === month && completedDate.getFullYear() === year
      }
      
      // TURNADAS: usar fecha del turno
      if (sale.status === "appointed" && sale.appointedDate) {
        const appointedDate = new Date(sale.appointedDate)
        return appointedDate.getMonth() + 1 === month && appointedDate.getFullYear() === year
      }
      
      // Otros estados: usar fecha de creacion
      const saleDate = new Date(sale.createdAt)
      return saleDate.getMonth() + 1 === month && saleDate.getFullYear() === year
    })
  }

  const salesThisMonth = getMonthSales()

  // Contar por estado
  const installedSales = salesThisMonth.filter(s => s.status === "completed")
  const cancelledSales = salesThisMonth.filter(s => s.status === "cancelled")
  const appointedSales = salesThisMonth.filter(s => s.status === "appointed")
  const pendingTurnSales = salesThisMonth.filter(s => s.status === "pending_appointment")
  const observedSales = salesThisMonth.filter(s => s.status === "observed")
  const pendingSignatureSales = salesThisMonth.filter(s => s.status === "pending_signature")
  const loadedSales = salesThisMonth.filter(s => s.status === "pending")
  
  // Calcular comision total basada en la cantidad de ventas activadas
  // Si el usuario tiene comision fija, usarla; sino usar la escala
  const activatedCount = installedSales.length
  const hasFixedCommission = userProfile?.fixedCommissionPerSale !== null && userProfile?.fixedCommissionPerSale !== undefined
  const commissionPerSale = hasFixedCommission 
    ? userProfile!.fixedCommissionPerSale! 
    : getCommissionPerSale(activatedCount)
  const totalCommission = activatedCount * commissionPerSale

  // Calcular costos de instalacion (se descuentan siempre de cualquier venta)
  const totalInstallationCosts = salesThisMonth.reduce((acc, sale) => {
    return acc + (sale.installationCost || 0)
  }, 0)

  // Calcular total de adelantos del mes
  const totalAdvances = myAdvances.reduce((acc, advance) => acc + advance.amount, 0)

  // Comision neta = comision - costos de instalacion - adelantos
  const netCommission = totalCommission - totalInstallationCosts - totalAdvances

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

  // Mock chart data
  const chartData = [
    { name: "Lun", ventas: 2 },
    { name: "Mar", ventas: 4 },
    { name: "Mie", ventas: 3 },
    { name: "Jue", ventas: 5 },
    { name: "Vie", ventas: 6 },
    { name: "Sab", ventas: 4 },
    { name: "Dom", ventas: 2 },
  ]

  if (isLoading) {
    return (
      <DashboardLayout requiredRole="seller">
        <div className="flex items-center justify-center h-[60vh]">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="seller">
      <div className="relative">
        <BackgroundEffect variant="dna" />
        <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mi Dashboard</h1>
            <p className="text-muted-foreground">
              Resumen de tu actividad de ventas
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px] bg-secondary/50">
                <Calendar className="mr-2 h-4 w-4" />
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
            <Link href="/seller/new-sale">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Venta
              </Button>
            </Link>
          </div>
        </div>

        {/* Commission Cards - PRIMERO */}
        <div className="grid gap-4 md:grid-cols-4">
          {/* Ganancias Generadas (Comision Bruta) */}
          <Card className="border-green-500/30 bg-gradient-to-br from-green-500/10 via-card to-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Ganancias Generadas</p>
                  <p className="text-3xl font-bold text-green-400">{formatCurrency(totalCommission)}</p>
                  <p className="text-xs text-muted-foreground">
                    {activatedCount} ventas x {formatCurrency(commissionPerSale)}
                    {hasFixedCommission && " (fija)"}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instaladas / Webs Vendidas */}
          <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-card to-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {currentCompany.id === "tupaginaya" || currentCompany.id === "paginas" ? "Webs Vendidas" : "Instaladas"}
                  </p>
                  <p className="text-3xl font-bold text-purple-400">{installedSales.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {currentCompany.id === "tupaginaya" || currentCompany.id === "paginas" ? "Webs activadas" : "Ventas completadas"}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Demos (solo TPY) */}
          {currentCompany.id === "tupaginaya" || currentCompany.id === "paginas" && (
            <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-card to-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Mis Demos</p>
                    <p className="text-3xl font-bold text-cyan-400">{tpyDemos.length}</p>
                    <p className="text-xs text-muted-foreground">Demos creadas por ti</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-cyan-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Leads Recibidos */}
          <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-card to-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Leads Recibidos</p>
                  <p className="text-3xl font-bold text-blue-400">{myLeads.length}</p>
                  <p className="text-xs text-muted-foreground">
                    Leads asignados a ti
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <UserPlus className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid - Estado de Ventas */}
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
          <StatCard
            title="Instaladas"
            value={installedSales.length}
            icon={CheckCircle}
            className="border-green-500/30"
          />
          <StatCard
            title="Canceladas"
            value={cancelledSales.length}
            icon={XCircle}
            className="border-red-500/30"
          />
          <StatCard
            title="Turnadas"
            value={appointedSales.length}
            icon={Calendar}
            className="border-blue-500/30"
          />
          <StatCard
            title="Pend. Turno"
            value={pendingTurnSales.length}
            icon={AlertTriangle}
            className="border-purple-500/30"
          />
          <StatCard
            title="Observadas"
            value={observedSales.length}
            icon={AlertTriangle}
            className="border-amber-500/30"
          />
          <StatCard
            title="Pend. Firma"
            value={pendingSignatureSales.length}
            icon={Clock}
            className="border-orange-500/30"
          />
          <StatCard
            title="Cargadas"
            value={loadedSales.length}
            icon={Clock}
            className="border-yellow-500/30"
          />
        </div>

        {/* Charts and Commission Info */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Sales Chart */}
          <Card className="lg:col-span-2 border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Ventas de la Semana</CardTitle>
              <CardDescription>Tu actividad de los ultimos 7 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="ventas"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorVentas)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

  {/* Commission Summary */}
  <Card className="border-border/50 bg-card/50">
  <CardHeader>
  <CardTitle>Resumen</CardTitle>
  <CardDescription>Tu actividad del mes</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
  <div className="space-y-3">
  <div className="flex justify-between items-center p-3 rounded-lg bg-blue-500/10">
  <span className="text-sm text-muted-foreground">Leads recibidos:</span>
  <span className="font-semibold text-blue-400">{myLeads.length}</span>
  </div>
  <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/30">
  <span className="text-sm text-muted-foreground">Ventas activadas:</span>
  <span className="font-semibold text-foreground">{activatedCount}</span>
  </div>
  <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/30">
  <span className="text-sm text-muted-foreground">Comision por venta:</span>
  <span className="font-semibold text-foreground">{formatCurrency(commissionPerSale)}</span>
  </div>
  <div className="flex justify-between items-center p-3 rounded-lg bg-green-500/10">
  <span className="text-sm text-muted-foreground">Comision bruta:</span>
  <span className="font-semibold text-green-400">{formatCurrency(totalCommission)}</span>
  </div>
  {totalInstallationCosts > 0 && (
  <div className="flex justify-between items-center p-3 rounded-lg bg-red-500/10">
  <span className="text-sm text-muted-foreground">Costos instalacion:</span>
  <span className="font-semibold text-red-400">-{formatCurrency(totalInstallationCosts)}</span>
  </div>
  )}
  {totalAdvances > 0 && (
  <div className="flex justify-between items-center p-3 rounded-lg bg-amber-500/10">
  <span className="text-sm text-muted-foreground">Adelantos:</span>
  <span className="font-semibold text-amber-400">-{formatCurrency(totalAdvances)}</span>
  </div>
  )}
  <div className="border-t border-border pt-3">
  <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
  <span className="text-sm font-medium text-foreground">COMISION NETA:</span>
  <span className={`font-bold text-lg ${netCommission >= 0 ? 'text-primary' : 'text-red-400'}`}>
  {formatCurrency(netCommission)}
  </span>
  </div>
  </div>
  </div>
  </CardContent>
          </Card>
        </div>

        {/* Recent Sales */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Mis Ventas del Mes</CardTitle>
              <CardDescription>Ventas de {getAvailableMonths().find(m => m.value === selectedMonth)?.label}</CardDescription>
            </div>
            <Link href="/seller/sales">
              <Button variant="outline" size="sm">
                Ver todas
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Plan</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">Costo Inst.</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Estado</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {salesThisMonth.slice(0, 10).map((sale) => (
                    <tr key={sale._id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-foreground">{sale.customerInfo.name}</p>
                          <p className="text-sm text-muted-foreground">{sale.customerInfo.phone}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-foreground">{sale.planName}</td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        {sale.installationCost ? (
                          <span className="text-red-400">-{formatCurrency(sale.installationCost)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={sale.status} />
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">
                        {new Date(sale.createdAt).toLocaleDateString("es-AR")}
                      </td>
                    </tr>
                  ))}
                  {salesThisMonth.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No tienes ventas registradas en este mes
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
