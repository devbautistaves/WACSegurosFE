"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { StatCard } from "@/components/dashboard/stat-card"
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
import { salesAPI, adCostsAPI, Sale } from "@/lib/api"
import {
  DollarSign,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  AlertTriangle,
  Megaphone,
} from "lucide-react"

// Constantes de comision supervisor
const SUPERVISOR_BASE_COMMISSION = 750000
const ADMIN_COST = 35000
const SUPERVISOR_PERCENTAGE = 0.40

export default function SupervisorDashboardPage() {
  const [mySales, setMySales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [monthlyAdCost, setMonthlyAdCost] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token")
      if (!token) return

      try {
        const [salesRes, adCostsRes] = await Promise.all([
          salesAPI.getMySales(token),
          adCostsAPI.getMyCosts(token, selectedMonth),
        ])
        setMySales(salesRes.sales)

        // Obtener el costo de anuncio del mes actual
        const currentAdCost = adCostsRes.adCosts.find(
          (cost) => cost.month === selectedMonth
        )
        setMonthlyAdCost(currentAdCost?.amount || 0)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedMonth])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(value))
  }

  // Filtrar ventas del mes seleccionado segun reglas de negocio:
  // - INSTALADAS (completed): Se muestran en el mes de completedDate (fecha de activacion)
  // - TURNADAS (appointed): Se muestran en el mes de appointedDate (fecha del turno)
  // - PENDIENTE DE TURNO (pending_appointment): Aparecen en TODOS los meses hasta que se resuelvan
  // - CANCELADAS: Quedan en el mes donde fueron canceladas (createdAt)
  // - CARGADAS y PENDIENTE DE FIRMA: Se muestran en el mes de createdAt
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
      
      // CANCELADAS, CARGADAS, PENDIENTE DE FIRMA y otras: usar fecha de creacion
      const saleDate = new Date(sale.createdAt)
      return saleDate.getMonth() + 1 === month && saleDate.getFullYear() === year
    })
  }
  
  // Obtener costo de instalacion del mes seleccionado
  const getInstallationCostForMonth = (sale: Sale): number => {
    const [year, month] = selectedMonth.split("-").map(Number)
    
    if (!sale.installationCost || sale.installationCost <= 0) return 0
    
    // Si tiene fecha de costo de instalacion, usar esa fecha
    if (sale.installationCostDate) {
      const costDate = new Date(sale.installationCostDate)
      if (costDate.getMonth() + 1 === month && costDate.getFullYear() === year) {
        return sale.installationCost
      }
      return 0
    }
    
    // Si no tiene fecha especifica, usar la fecha de creacion
    const saleDate = new Date(sale.createdAt)
    if (saleDate.getMonth() + 1 === month && saleDate.getFullYear() === year) {
      return sale.installationCost
    }
    
    return 0
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

  // Calcular totales de costos para el desglose (costos del mes actual)
  const totalInstallationCosts = mySales.reduce((acc, sale) => {
    return acc + getInstallationCostForMonth(sale)
  }, 0)

  const totalAdCosts = installedSales.reduce((acc, sale) => {
    return acc + (sale.adCost || 0)
  }, 0)

  const totalSellerCommissions = installedSales.reduce((acc, sale) => {
    return acc + (sale.sellerCommissionPaid || 0)
  }, 0)

  // Calcular comisiones del supervisor (mismo calculo que admin)
  // La comision se imputa en el mes que se activa (completedDate)
  // El costo de instalacion se descuenta en el mes que se coloco (installationCostDate)
  const calculateSupervisorCommission = () => {
    let totalBeforePercentage = 0

    // Solo ventas instaladas suman comision base
    // NOTA: El costo de anuncio (adCost) ya NO se resta automaticamente
    // Solo se restan: Base - Admin - Comision del vendedor
    installedSales.forEach(sale => {
      const baseCommission = SUPERVISOR_BASE_COMMISSION
      const sellerCommission = sale.sellerCommissionPaid || 0
      
      // La instalacion se descuenta por separado segun su fecha
      // adCost ya no se descuenta automaticamente - debe aplicarse manualmente
      const netCommission = baseCommission - ADMIN_COST - sellerCommission
      totalBeforePercentage += netCommission
    })

    // Descontar costos de instalacion que correspondan a este mes
    // Revisar TODAS las ventas del supervisor para costos de instalacion
    mySales.forEach(sale => {
      const installationCost = getInstallationCostForMonth(sale)
      if (installationCost > 0) {
        totalBeforePercentage -= installationCost
      }
    })

    return Math.max(0, totalBeforePercentage)
  }

  const totalBeforePercentage = calculateSupervisorCommission()
  // Descontar costo de anuncio del 100% (neto), luego aplicar 40%
  const netAfterAdCost = totalBeforePercentage - monthlyAdCost
  const totalCommission = Math.max(0, netAfterAdCost * SUPERVISOR_PERCENTAGE)

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

  if (isLoading) {
    return (
      <DashboardLayout requiredRole="supervisor">
        <div className="flex items-center justify-center h-[60vh]">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="supervisor">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mi Dashboard</h1>
            <p className="text-muted-foreground">
              Resumen de tu actividad como Supervisor
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
            <Link href="/supervisor/new-sale">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Venta
              </Button>
            </Link>
          </div>
        </div>

        {/* Commission Card - Final Commission Only */}
        <Card className="border-[#39FF14]/50 bg-gradient-to-br from-[#39FF14]/20 via-card to-card shadow-lg shadow-[#39FF14]/10">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <p className="text-lg font-semibold text-foreground">MI COMISION FINAL</p>
                <p className="text-5xl font-bold text-[#39FF14] drop-shadow-[0_0_10px_rgba(57,255,20,0.5)]">
                  {formatCurrency(totalCommission)}
                </p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Basado en {installedSales.length} ventas instaladas</p>
                  {monthlyAdCost > 0 && (
                    <p className="flex items-center gap-1 text-amber-400">
                      <Megaphone className="h-3 w-3" />
                      Costo de anuncio descontado: -{formatCurrency(monthlyAdCost)}
                    </p>
                  )}
                </div>
              </div>
              <div className="h-16 w-16 rounded-2xl bg-[#39FF14]/20 flex items-center justify-center">
                <DollarSign className="h-8 w-8 text-[#39FF14]" />
              </div>
            </div>
          </CardContent>
        </Card>

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

        {/* Detailed Breakdown */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Desglose de Costos */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Desglose de Descuentos</CardTitle>
              <CardDescription>Costos que se restan de tu comision</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/30">
                <span className="text-sm text-muted-foreground">Costos de Instalacion:</span>
                <span className="font-semibold text-red-400">-{formatCurrency(totalInstallationCosts)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/30">
                <span className="text-sm text-muted-foreground">Costo Admin ({installedSales.length} ventas):</span>
                <span className="font-semibold text-red-400">-{formatCurrency(installedSales.length * ADMIN_COST)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/30">
                <span className="text-sm text-muted-foreground">Costos de Anuncios (ventas):</span>
                <span className="font-semibold text-red-400">-{formatCurrency(totalAdCosts)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/30">
                <span className="text-sm text-muted-foreground">Comisiones Vendedores:</span>
                <span className="font-semibold text-red-400">-{formatCurrency(totalSellerCommissions)}</span>
              </div>
              {monthlyAdCost > 0 && (
                <div className="flex justify-between items-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <span className="text-sm text-amber-400 flex items-center gap-2">
                    <Megaphone className="h-4 w-4" />
                    Costo de Anuncio Mensual (sobre 100%):
                  </span>
                  <span className="font-semibold text-amber-400">-{formatCurrency(monthlyAdCost)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-red-500/10">
                  <span className="text-sm font-medium text-foreground">TOTAL DESCUENTOS:</span>
                  <span className="font-bold text-lg text-red-400">
                    -{formatCurrency(totalInstallationCosts + (installedSales.length * ADMIN_COST) + totalAdCosts + totalSellerCommissions + monthlyAdCost)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumen del Mes */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Resumen del Mes</CardTitle>
              <CardDescription>Total de ventas por estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-foreground">Instaladas</span>
                  </div>
                  <span className="font-bold text-green-400">{installedSales.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-red-400" />
                    <span className="text-foreground">Canceladas</span>
                  </div>
                  <span className="font-bold text-red-400">{cancelledSales.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-400" />
                    <span className="text-foreground">Turnadas</span>
                  </div>
                  <span className="font-bold text-blue-400">{appointedSales.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-purple-400" />
                    <span className="text-foreground">Pendiente de Turno</span>
                  </div>
                  <span className="font-bold text-purple-400">{pendingTurnSales.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                    <span className="text-foreground">Observadas</span>
                  </div>
                  <span className="font-bold text-amber-400">{observedSales.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-orange-400" />
                    <span className="text-foreground">Pendiente de Firma</span>
                  </div>
                  <span className="font-bold text-orange-400">{pendingSignatureSales.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-yellow-400" />
                    <span className="text-foreground">Cargadas</span>
                  </div>
                  <span className="font-bold text-yellow-400">{loadedSales.length}</span>
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
            <Link href="/supervisor/sales">
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
    </DashboardLayout>
  )
}
