"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/ui/status-badge"
import { Spinner } from "@/components/ui/spinner"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { salesAPI, adCostsAPI, Sale } from "@/lib/api"
import { DollarSign, TrendingUp, Calendar, FileSpreadsheet, Edit2, Megaphone, Wrench, Printer, Download } from "lucide-react"

// Constantes de comision supervisor
const SUPERVISOR_BASE_COMMISSION = 750000 // Importe base de comision
const SUPERVISOR_PERCENTAGE = 0.40

export default function SupervisorCommissionsPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [isCostsDialogOpen, setIsCostsDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [costForm, setCostForm] = useState({
    installationCost: 0,
    adminCost: 0,
    adCost: 0,
    sellerCommissionPaid: 0,
  })
  const [monthlyAdCost, setMonthlyAdCost] = useState(0)
  const [isLiquidacionDialogOpen, setIsLiquidacionDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [selectedMonth])

  const fetchData = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const [salesRes, adCostsRes] = await Promise.all([
        salesAPI.getMySales(token),
        adCostsAPI.getMyCosts(token, selectedMonth),
      ])
      setSales(salesRes.sales)

      // Obtener el costo de anuncio del mes seleccionado
      const currentAdCost = adCostsRes.adCosts.find(
        (cost) => cost.month === selectedMonth
      )
      setMonthlyAdCost(currentAdCost?.amount || 0)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
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
    return sales.filter(sale => {
      const saleDate = new Date(sale.createdAt)
      return saleDate.getMonth() + 1 === month && saleDate.getFullYear() === year
    })
  }

  const monthSales = getMonthSales()
  const completedSales = monthSales.filter(s => s.status === "completed")
  const cancelledSales = monthSales.filter(s => s.status === "cancelled")
  const pendingSales = monthSales.filter(s => !["completed", "cancelled"].includes(s.status))

  // Calcular costos de instalacion de TODAS las ventas (cualquier estado)
  const getAllInstallationCosts = () => {
    let totalFromCompleted = 0
    let totalFromCancelled = 0
    let totalFromOther = 0
    const salesWithInstallation: Array<{ sale: Sale; cost: number }> = []

    monthSales.forEach(sale => {
      const cost = sale.installationCost || 0
      if (cost > 0) {
        salesWithInstallation.push({ sale, cost })
        if (sale.status === "completed") {
          totalFromCompleted += cost
        } else if (sale.status === "cancelled") {
          totalFromCancelled += cost
        } else {
          totalFromOther += cost
        }
      }
    })

    return {
      totalFromCompleted,
      totalFromCancelled,
      totalFromOther,
      total: totalFromCompleted + totalFromCancelled + totalFromOther,
      salesWithInstallation,
    }
  }

  const installationCosts = getAllInstallationCosts()

  // Calcular comision detallada
  // Base: $750,000 - Descontar: Instalacion, Administracion, Comision Vendedor
  // NOTA: El costo de anuncio (adCost) ya NO se resta automaticamente
  const calculateDetailedCommission = () => {
    let details: Array<{
      sale: Sale
      baseCommission: number
      installationCost: number
      adminCost: number
      sellerCommission: number
      netCommission: number
    }> = []

    let totalBeforePercentage = 0
    let totalInstallationCost = 0

    completedSales.forEach(sale => {
      const baseCommission = SUPERVISOR_BASE_COMMISSION // $750,000
      const installationCost = sale.installationCost || 0
      const adminCost = sale.adminCost || 0
      const sellerCommission = sale.sellerCommissionPaid || 0
      
      // Neto = Base - Instalacion - Admin - Comision Vendedor
      // adCost ya no se resta automaticamente
      const netCommission = baseCommission - installationCost - adminCost - sellerCommission
      totalBeforePercentage += netCommission
      totalInstallationCost += installationCost

      details.push({
        sale,
        baseCommission,
        installationCost,
        adminCost,
        sellerCommission,
        netCommission,
      })
    })

    // Descontar instalaciones de canceladas
    let cancelledInstallationCost = 0
    cancelledSales.forEach(sale => {
      if (sale.installationCost && sale.installationCost > 0) {
        cancelledInstallationCost += sale.installationCost
      }
    })

    totalBeforePercentage -= cancelledInstallationCost

    // Descontar instalaciones de ventas en otros estados (pending, appointed, etc.)
    let otherInstallationCost = 0
    pendingSales.forEach(sale => {
      if (sale.installationCost && sale.installationCost > 0) {
        otherInstallationCost += sale.installationCost
      }
    })

    totalBeforePercentage -= otherInstallationCost

    return {
      details,
      totalBeforePercentage,
      cancelledInstallationCost,
      otherInstallationCost,
      totalInstallationCost,
    }
  }

  const commission = calculateDetailedCommission()
  // Descontar costo de anuncio del neto (100%), LUEGO aplicar 40%
  const netAfterAdCost = commission.totalBeforePercentage - monthlyAdCost
  const finalCommission = Math.max(0, netAfterAdCost * SUPERVISOR_PERCENTAGE)

  const handleOpenCostsDialog = (sale: Sale) => {
    setSelectedSale(sale)
    setCostForm({
      installationCost: sale.installationCost || 0,
      adminCost: sale.adminCost || 0,
      adCost: sale.adCost || 0,
      sellerCommissionPaid: sale.sellerCommissionPaid || 0,
    })
    setIsCostsDialogOpen(true)
  }

  const handleUpdateCosts = async () => {
    if (!selectedSale) return

    setIsUpdating(true)
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      await salesAPI.updateCosts(token, selectedSale._id, {
        installationCost: costForm.installationCost || 0,
        adminCost: costForm.adminCost || 0,
        adCost: costForm.adCost || 0,
        sellerCommissionPaid: costForm.sellerCommissionPaid || 0,
      })
      toast({
        title: "Costos actualizados",
        description: "Los costos de la venta se han actualizado correctamente",
      })
      setIsCostsDialogOpen(false)
      fetchData()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar los costos",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // Helper para obtener etiqueta de estado
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "CARGADA",
      pending_signature: "PENDIENTE DE FIRMA",
      pending_appointment: "PENDIENTE DE TURNO",
      observed: "OBSERVADA",
      appointed: "TURNADA",
      completed: "INSTALADA",
      cancelled: "CANCELADA",
    }
    return labels[status] || status.toUpperCase()
  }

  // Obtener datos de liquidacion
  const getLiquidacionData = () => {
    const [year, month] = selectedMonth.split("-").map(Number)
    const monthName = new Date(year, month - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" })
    
    const userStr = localStorage.getItem("user")
    const currentUser = userStr ? JSON.parse(userStr) : { name: "Supervisor" }

    // Distribuir el total proporcionalmente entre las ventas
    const salesCount = commission.details.length
    const commissionPerSale = salesCount > 0 ? finalCommission / salesCount : 0

    const salesData = commission.details.map((d, idx) => ({
      index: idx + 1,
      customerName: d.sale.customerInfo.name,
      contractNumber: d.sale.contractNumber || "-",
      createdAt: new Date(d.sale.createdAt).toLocaleDateString("es-AR"),
      completedDate: d.sale.completedDate ? new Date(d.sale.completedDate).toLocaleDateString("es-AR") : "-",
      finalCommission: commissionPerSale,
    }))

    return {
      userName: currentUser.name,
      monthName,
      sales: salesData,
      totalCommission: finalCommission,
    }
  }

  // Imprimir como PDF
  const handlePrintLiquidacion = () => {
    const printContent = document.getElementById("liquidacion-print-content")
    if (!printContent) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Liquidacion de Comisiones</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; font-size: 11px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header h1 { font-size: 18px; margin-bottom: 5px; }
          .header p { font-size: 12px; color: #666; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 11px; }
          .info-item { font-size: 11px; }
          .info-item strong { font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th { background-color: #f0f0f0; border: 1px solid #ccc; padding: 6px; text-align: left; font-size: 10px; font-weight: 600; }
          td { border: 1px solid #ccc; padding: 6px; font-size: 10px; }
          tr:nth-child(even) { background-color: #fafafa; }
          .text-right { text-align: right; }
          .text-red-400 { color: #f87171; }
          .text-green-400 { color: #4ade80; }
          .font-medium { font-weight: 500; }
          .font-bold { font-weight: 700; }
          .border { border: 1px solid #ccc; }
          .rounded-lg { border-radius: 8px; }
          .p-4, .p-3 { padding: 12px; }
          .bg-secondary\\/20 { background-color: #f5f5f5; }
          .bg-card { background-color: #fff; border: 1px solid #eee; }
          .grid { display: grid; }
          .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
          .gap-4 { gap: 12px; }
          .space-y-2 > * + * { margin-top: 8px; }
          .mb-3 { margin-bottom: 12px; }
          .mt-2 { margin-top: 8px; }
          .mt-3 { margin-top: 12px; }
          .pt-3 { padding-top: 12px; }
          .border-t { border-top: 1px solid #ccc; }
          .text-muted-foreground { color: #666; }
          .text-lg { font-size: 14px; }
          .total-section { margin-top: 20px; padding: 15px; border: 2px solid #333; text-align: right; background-color: #f8f8f8; }
          .total-section h2 { font-size: 20px; font-weight: bold; }
          .text-3xl { font-size: 22px; }
          .text-primary { color: #f59e0b; }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .text-red-400 { color: #dc2626 !important; }
            .text-green-400 { color: #16a34a !important; }
          }
          @page { size: landscape; margin: 10mm; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  // Exportar a CSV con diseño mejorado para Google Sheets
  const handleExportCSV = () => {
    const [year, month] = selectedMonth.split("-").map(Number)
    const monthName = new Date(year, month - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" })
    
    // Obtener usuario actual
    const userStr = localStorage.getItem("user")
    const currentUser = userStr ? JSON.parse(userStr) : { name: "Supervisor" }
    
    const csvRows: string[] = []
    
    // ENCABEZADO
    csvRows.push(`LIQUIDACION DE COMISIONES - SUPERVISOR`)
    csvRows.push(``)
    csvRows.push(`Nombre:,${currentUser.name}`)
    csvRows.push(`Periodo:,${monthName.toUpperCase()}`)
    csvRows.push(`Fecha de emision:,${new Date().toLocaleDateString("es-AR")}`)
    csvRows.push(``)
    csvRows.push(`═══════════════════════════════════════════════════════════════════════════`)
    csvRows.push(``)
    
    // SECCION: VENTAS ACTIVADAS
    csvRows.push(`VENTAS ACTIVADAS (${completedSales.length})`)
    csvRows.push(`───────────────────────────────────────────────────────────────────────────`)
    csvRows.push(`#,Cliente,DNI,Plan,Fecha Carga,Fecha Activacion,Base,Instalacion,Admin,Com.Vendedor,Neto`)
    
    commission.details.forEach((d, idx) => {
      const completedDate = d.sale.completedDate ? new Date(d.sale.completedDate).toLocaleDateString("es-AR") : "-"
      csvRows.push(`${idx + 1},${d.sale.customerInfo.name},${d.sale.customerInfo.dni},${d.sale.planName},${new Date(d.sale.createdAt).toLocaleDateString("es-AR")},${completedDate},${formatCurrency(d.baseCommission)},${formatCurrency(d.installationCost)},${formatCurrency(d.adminCost)},${formatCurrency(d.sellerCommission)},${formatCurrency(d.netCommission)}`)
    })
    
    if (commission.details.length === 0) {
      csvRows.push(`-,Sin ventas activadas este mes,-,-,-,-,-,-,-,-,-`)
    }
    
    csvRows.push(``)
    csvRows.push(`,,,,,SUBTOTAL ACTIVADAS:,,,,,${formatCurrency(commission.totalBeforePercentage + commission.cancelledInstallationCost + commission.otherInstallationCost)}`)
    csvRows.push(``)
    
    // SECCION: VENTAS CANCELADAS CON DESCUENTO
    const cancelledWithCost = cancelledSales.filter(s => s.installationCost && s.installationCost > 0)
    csvRows.push(`VENTAS CANCELADAS CON DESCUENTO DE INSTALACION (${cancelledWithCost.length})`)
    csvRows.push(`────────────────────────────────────────────────────────────���──────────────`)
    csvRows.push(`#,Cliente,DNI,Plan,Fecha Carga,Estado,Costo Instalacion Descontado`)
    
    cancelledWithCost.forEach((sale, idx) => {
      csvRows.push(`${idx + 1},${sale.customerInfo.name},${sale.customerInfo.dni},${sale.planName},${new Date(sale.createdAt).toLocaleDateString("es-AR")},CANCELADA,-${formatCurrency(sale.installationCost || 0)}`)
    })
    
    if (cancelledWithCost.length === 0) {
      csvRows.push(`-,Sin descuentos por cancelaciones,-,-,-,-,-`)
    }
    
    csvRows.push(``)
    csvRows.push(`,,,,SUBTOTAL DESCUENTOS:,,-${formatCurrency(commission.cancelledInstallationCost)}`)
    csvRows.push(``)
    
    // SECCION: VENTAS EN PROCESO CON COSTO DE INSTALACION
    const pendingWithCost = pendingSales.filter(s => s.installationCost && s.installationCost > 0)
    if (pendingWithCost.length > 0) {
      csvRows.push(`VENTAS EN PROCESO CON COSTO DE INSTALACION (${pendingWithCost.length})`)
      csvRows.push(`───────────────────────────────────────────────────────────────────────────`)
      csvRows.push(`#,Cliente,DNI,Plan,Fecha Carga,Estado,Costo Instalacion Descontado`)
      pendingWithCost.forEach((sale, idx) => {
        csvRows.push(`${idx + 1},${sale.customerInfo.name},${sale.customerInfo.dni},${sale.planName},${new Date(sale.createdAt).toLocaleDateString("es-AR")},${getStatusLabel(sale.status)},-${formatCurrency(sale.installationCost || 0)}`)
      })
      csvRows.push(``)
      csvRows.push(`,,,,SUBTOTAL INSTALACIONES PENDIENTES:,,-${formatCurrency(commission.otherInstallationCost)}`)
      csvRows.push(``)
    }
    
    // SECCION: OTRAS VENTAS DEL PERIODO (sin costo de instalacion)
    const pendingWithoutCost = pendingSales.filter(s => !s.installationCost || s.installationCost <= 0)
    if (pendingWithoutCost.length > 0) {
      csvRows.push(`OTRAS VENTAS EN PROCESO (${pendingWithoutCost.length})`)
      csvRows.push(`───────────────────────────────────────────────────────────────────────────`)
      csvRows.push(`#,Cliente,DNI,Plan,Fecha Carga,Estado,Observacion`)
      pendingWithoutCost.forEach((sale, idx) => {
        csvRows.push(`${idx + 1},${sale.customerInfo.name},${sale.customerInfo.dni},${sale.planName},${new Date(sale.createdAt).toLocaleDateString("es-AR")},${getStatusLabel(sale.status)},Pendiente de activacion`)
      })
      csvRows.push(``)
    }
    
    // RESUMEN FINAL
    csvRows.push(`═══════════════════════════════════════════════════════════════════════════`)
    csvRows.push(`RESUMEN DE LIQUIDACION`)
    csvRows.push(`═══════════════════════════════════════════════════════════════════════════`)
    csvRows.push(``)
    csvRows.push(`Total Ventas Activadas:,${completedSales.length}`)
    csvRows.push(`Total Ventas Canceladas:,${cancelledSales.length}`)
    csvRows.push(`Total Ventas en Proceso:,${pendingSales.length}`)
    csvRows.push(``)
    csvRows.push(`Subtotal Neto Activadas:,${formatCurrency(commission.totalBeforePercentage + commission.cancelledInstallationCost + commission.otherInstallationCost)}`)
    if (commission.totalInstallationCost > 0) {
      csvRows.push(`Instalaciones de Activadas:,-${formatCurrency(commission.totalInstallationCost)}`)
    }
    if (commission.cancelledInstallationCost > 0) {
      csvRows.push(`Instalaciones de Canceladas:,-${formatCurrency(commission.cancelledInstallationCost)}`)
    }
    if (commission.otherInstallationCost > 0) {
      csvRows.push(`Instalaciones de Pendientes:,-${formatCurrency(commission.otherInstallationCost)}`)
    }
    csvRows.push(`Neto (100%):,${formatCurrency(commission.totalBeforePercentage)}`)
    if (monthlyAdCost > 0) {
      csvRows.push(`Costo de Anuncio Mensual (sobre 100%):,-${formatCurrency(monthlyAdCost)}`)
      csvRows.push(`Neto despues de Anuncio:,${formatCurrency(netAfterAdCost)}`)
    }
    csvRows.push(``)
    csvRows.push(`COMISION FINAL (40%):,${formatCurrency(finalCommission)}`)
    csvRows.push(``)
    csvRows.push(`══════════════════════════════════════════════════════════════════════════���`)

    // Agregar BOM para que Excel/Sheets detecte UTF-8
    const BOM = "\uFEFF"
    const csvContent = BOM + csvRows.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `liquidacion-supervisor-${selectedMonth}.csv`
    link.click()

    toast({
      title: "Exportacion completada",
      description: "Liquidacion exportada correctamente",
    })
  }

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
            <h1 className="text-3xl font-bold text-foreground">Mis Comisiones</h1>
            <p className="text-muted-foreground">
              Detalle de comisiones del mes seleccionado
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px] bg-secondary/50">
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
            <Button
              onClick={() => setIsLiquidacionDialogOpen(true)}
              variant="outline"
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Ver Liquidacion
            </Button>
          </div>
        </div>

        {/* Commission Summary */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ventas Instaladas</p>
                  <p className="text-2xl font-bold text-foreground">{completedSales.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Neto (100%)</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(commission.totalBeforePercentage)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {commission.totalInstallationCost > 0 && (
            <Card className="border-orange-500/30 bg-orange-500/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Wrench className="h-6 w-6 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Instalaciones (100%)</p>
                    <p className="text-2xl font-bold text-orange-400">-{formatCurrency(commission.totalInstallationCost)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {commission.cancelledInstallationCost > 0 && (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Download className="h-6 w-6 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Inst. Canceladas</p>
                    <p className="text-2xl font-bold text-red-400">-{formatCurrency(commission.cancelledInstallationCost)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {commission.otherInstallationCost > 0 && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Wrench className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Inst. Pendientes</p>
                    <p className="text-2xl font-bold text-yellow-400">-{formatCurrency(commission.otherInstallationCost)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {monthlyAdCost > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Megaphone className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Costo Anuncio (100%)</p>
                    <p className="text-2xl font-bold text-amber-400">-{formatCurrency(monthlyAdCost)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Comision Final</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(finalCommission)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Table */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>Detalle de Comisiones</CardTitle>
            <CardDescription>Desglose por venta instalada</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Plan</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Base</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Instalacion</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Admin</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Com. Vendedor</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Neto</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {commission.details.map((detail) => (
                    <tr
                      key={detail.sale._id}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-foreground">{detail.sale.customerInfo.name}</p>
                          <p className="text-sm text-muted-foreground">{detail.sale.customerInfo.dni}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-foreground">{detail.sale.planName}</td>
                      <td className="py-3 px-4 text-right text-foreground">{formatCurrency(detail.baseCommission)}</td>
                      <td className="py-3 px-4 text-right text-red-400">-{formatCurrency(detail.installationCost)}</td>
                      <td className="py-3 px-4 text-right text-red-400">-{formatCurrency(detail.adminCost)}</td>
                      <td className="py-3 px-4 text-right text-red-400">-{formatCurrency(detail.sellerCommission)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-primary">{formatCurrency(detail.netCommission)}</td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenCostsDialog(detail.sale)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {commission.details.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        No hay ventas instaladas este mes
                      </td>
                    </tr>
                  )}
                </tbody>
                {commission.details.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-border bg-secondary/20">
                      <td colSpan={6} className="py-3 px-4 text-right font-semibold text-foreground">
                        Comision (40%):
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">
                        {formatCurrency(commission.totalBeforePercentage * SUPERVISOR_PERCENTAGE)}
                      </td>
                      <td></td>
                    </tr>
                    {commission.cancelledInstallationCost > 0 && (
                      <tr className="bg-secondary/20">
                        <td colSpan={6} className="py-3 px-4 text-right font-semibold text-red-400">
                          Descuento por canceladas:
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-red-400">
                          -{formatCurrency(commission.cancelledInstallationCost)}
                        </td>
                        <td></td>
                      </tr>
                    )}
                    {monthlyAdCost > 0 && (
                      <tr className="bg-amber-500/10">
                        <td colSpan={6} className="py-3 px-4 text-right font-semibold text-amber-400">
                          Costo de Anuncio Mensual (sobre 100%):
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-amber-400">
                          -{formatCurrency(monthlyAdCost)}
                        </td>
                        <td></td>
                      </tr>
                    )}
                    <tr className="bg-primary/10">
                      <td colSpan={6} className="py-3 px-4 text-right font-semibold text-primary">
                        COMISION FINAL (40%):
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-primary text-lg">
                        {formatCurrency(finalCommission)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Cancelled Sales with Installation Cost */}
        {cancelledSales.filter(s => s.installationCost && s.installationCost > 0).length > 0 && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardHeader>
              <CardTitle className="text-red-400">Ventas Canceladas con Costo de Instalacion</CardTitle>
              <CardDescription>Estos montos se descuentan del total</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Cliente</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Plan</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Estado</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Costo Instalacion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cancelledSales.filter(s => s.installationCost && s.installationCost > 0).map((sale) => (
                      <tr
                        key={sale._id}
                        className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-foreground">{sale.customerInfo.name}</p>
                            <p className="text-sm text-muted-foreground">{sale.customerInfo.dni}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-foreground">{sale.planName}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={sale.status} />
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-red-400">
                          -{formatCurrency(sale.installationCost || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Costs Dialog */}
        <Dialog open={isCostsDialogOpen} onOpenChange={setIsCostsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Costos de Venta</DialogTitle>
              <DialogDescription>
                Ingresa los costos aplicables a esta venta
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="installationCost">Costo de Instalacion (pagado por JV)</FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="installationCost"
                    type="number"
                    value={costForm.installationCost}
                    onChange={(e) => setCostForm(prev => ({ ...prev, installationCost: Number(e.target.value) }))}
                    className="bg-secondary/50 pl-8"
                  />
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="adminCost">Costo de Administracion (JV)</FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="adminCost"
                    type="number"
                    value={costForm.adminCost}
                    onChange={(e) => setCostForm(prev => ({ ...prev, adminCost: Number(e.target.value) }))}
                    className="bg-secondary/50 pl-8"
                  />
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="adCost">Costo de Anuncio (informativo - no se resta automaticamente)</FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="adCost"
                    type="number"
                    value={costForm.adCost}
                    onChange={(e) => setCostForm(prev => ({ ...prev, adCost: Number(e.target.value) }))}
                    className="bg-secondary/50 pl-8"
                  />
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="sellerCommissionPaid">Comision del Vendedor</FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="sellerCommissionPaid"
                    type="number"
                    value={costForm.sellerCommissionPaid}
                    onChange={(e) => setCostForm(prev => ({ ...prev, sellerCommissionPaid: Number(e.target.value) }))}
                    className="bg-secondary/50 pl-8"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Este monto se descontara de tu comision total
                </p>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCostsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateCosts}
                disabled={isUpdating}
                className="bg-primary text-primary-foreground"
              >
                {isUpdating ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Costos"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Liquidacion */}
        <Dialog open={isLiquidacionDialogOpen} onOpenChange={setIsLiquidacionDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Liquidacion de Comisiones
              </DialogTitle>
              <DialogDescription>
                Detalle de comisiones para facturar
              </DialogDescription>
            </DialogHeader>
            
            {(() => {
              const data = getLiquidacionData()
              return (
                <div id="liquidacion-print-content" className="space-y-6">
                  {/* Header de la liquidacion */}
                  <div className="header text-center border-b-2 border-foreground pb-4">
                    <h1 className="text-xl font-bold">LIQUIDACION DE COMISIONES</h1>
                    <p className="text-muted-foreground">SUPERVISOR</p>
                  </div>

                  {/* Info del usuario y periodo */}
                  <div className="info-row flex justify-between text-sm">
                    <div className="info-item">
                      <strong>Nombre:</strong> {data.userName}
                    </div>
                    <div className="info-item">
                      <strong>Periodo:</strong> {data.monthName.toUpperCase()}
                    </div>
                    <div className="info-item">
                      <strong>Fecha de emision:</strong> {new Date().toLocaleDateString("es-AR")}
                    </div>
                  </div>

                  {/* Tabla de ventas simplificada */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary">
                          <th className="p-3 text-left font-semibold border-b">#</th>
                          <th className="p-3 text-left font-semibold border-b">Fecha de Venta</th>
                          <th className="p-3 text-left font-semibold border-b">Nombre y Apellido</th>
                          <th className="p-3 text-left font-semibold border-b">N de Contrato</th>
                          <th className="p-3 text-left font-semibold border-b">Fecha de Activacion</th>
                          <th className="p-3 text-right font-semibold border-b">Importe Comision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.sales.length > 0 ? (
                          data.sales.map((sale) => (
                            <tr key={sale.index} className="border-b hover:bg-secondary/30">
                              <td className="p-3">{sale.index}</td>
                              <td className="p-3">{sale.createdAt}</td>
                              <td className="p-3 font-medium">{sale.customerName}</td>
                              <td className="p-3">{sale.contractNumber}</td>
                              <td className="p-3">{sale.completedDate}</td>
                              <td className="p-3 text-right font-medium text-green-400">{formatCurrency(sale.finalCommission)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-muted-foreground">
                              No hay ventas activadas en este periodo
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Total a facturar */}
                  <div className="total-section border-2 border-primary rounded-lg p-6 text-right bg-primary/10">
                    <p className="text-sm text-muted-foreground mb-2">TOTAL A FACTURAR</p>
                    <h2 className="text-3xl font-bold text-primary">{formatCurrency(data.totalCommission)}</h2>
                  </div>
                </div>
              )
            })()}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsLiquidacionDialogOpen(false)}>
                Cerrar
              </Button>
              <Button onClick={handlePrintLiquidacion} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <Printer className="h-4 w-4" />
                Descargar PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
