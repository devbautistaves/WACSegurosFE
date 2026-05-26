"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { salesAPI, usersAPI, Sale, User } from "@/lib/api"
import { Spinner } from "@/components/ui/spinner"
import { 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart,
  XCircle,
  RefreshCw
} from "lucide-react"

// Helper para extraer ID de campos que pueden ser string u objeto
const extractId = (field: string | { _id: string } | undefined): string => {
  if (!field) return ""
  if (typeof field === "string") return field
  return field._id || ""
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "pending", label: "Pendiente" },
  { value: "pending_appointment", label: "Pendiente de Cita" },
  { value: "appointed", label: "Turnada" },
  { value: "completed", label: "Instalada" },
  { value: "cancelled", label: "Cancelada" },
]

const MONTHS = [
  { value: "all", label: "Todos los meses" },
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
]

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: "Pendiente", className: "bg-amber-500/20 text-amber-500 border-amber-500/30" },
    pending_appointment: { label: "Pendiente Cita", className: "bg-blue-500/20 text-blue-500 border-blue-500/30" },
    appointed: { label: "Turnada", className: "bg-purple-500/20 text-purple-500 border-purple-500/30" },
    completed: { label: "Instalada", className: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" },
    cancelled: { label: "Cancelada", className: "bg-red-500/20 text-red-500 border-red-500/30" },
  }

  const config = statusConfig[status] || { label: status, className: "bg-gray-500/20 text-gray-500" }

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}

export default function HistoryPage() {
  const router = useRouter()
  const [sales, setSales] = useState<Sale[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  
  // Filtros
  const [selectedMonth, setSelectedMonth] = useState("all")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedSeller, setSelectedSeller] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Generar lista de años disponibles (ultimos 3 años)
  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear - 1, currentYear - 2].map(y => ({ value: y.toString(), label: y.toString() }))

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")
    
    if (!token || !userData) {
      router.push("/login")
      return
    }

    const user = JSON.parse(userData)
    if (user.role !== "admin") {
      router.push("/login")
      return
    }

    fetchData(token)
  }, [router])

  const fetchData = async (token: string) => {
    try {
      setLoading(true)
      const [salesResponse, usersResponse] = await Promise.all([
        salesAPI.getAll(token),
        usersAPI.getAll(token)
      ])
      setSales(salesResponse.sales || [])
      setUsers(usersResponse.users || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Aplicar filtros
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.createdAt)
    const saleMonth = saleDate.getMonth() + 1
    const saleYear = saleDate.getFullYear()
    const sellerId = extractId(sale.sellerId)

    // Filtro por mes
    if (selectedMonth !== "all" && saleMonth !== parseInt(selectedMonth)) {
      return false
    }

    // Filtro por año
    if (saleYear !== parseInt(selectedYear)) {
      return false
    }

    // Filtro por estado
    if (selectedStatus !== "all" && sale.status !== selectedStatus) {
      return false
    }

    // Filtro por vendedor
    if (selectedSeller !== "all" && sellerId !== selectedSeller) {
      return false
    }

    // Filtro por busqueda (nombre cliente, telefono, plan)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesClient = sale.customerInfo.name.toLowerCase().includes(query)
      const matchesPhone = sale.customerInfo.phone.toLowerCase().includes(query)
      const matchesPlan = sale.planName.toLowerCase().includes(query)
      const matchesSeller = sale.sellerName.toLowerCase().includes(query)
      if (!matchesClient && !matchesPhone && !matchesPlan && !matchesSeller) {
        return false
      }
    }

    return true
  })

  // Calcular resumen de ventas filtradas
  const summary = {
    total: filteredSales.length,
    completed: filteredSales.filter(s => s.status === "completed").length,
    pending: filteredSales.filter(s => s.status !== "completed" && s.status !== "cancelled").length,
    cancelled: filteredSales.filter(s => s.status === "cancelled").length,
    totalCommissions: filteredSales
      .filter(s => s.status === "completed")
      .reduce((sum, s) => sum + (s.commission || 0), 0),
    totalInstallationCosts: filteredSales
      .reduce((sum, s) => sum + (s.installationCost || 0), 0),
    netCommissions: filteredSales
      .filter(s => s.status === "completed")
      .reduce((sum, s) => sum + (s.commission || 0), 0) - 
      filteredSales.reduce((sum, s) => sum + (s.installationCost || 0), 0),
  }

  // Limpiar filtros
  const clearFilters = () => {
    setSelectedMonth("all")
    setSelectedYear(currentYear.toString())
    setSelectedStatus("all")
    setSelectedSeller("all")
    setSearchQuery("")
  }

  // Exportar a CSV
  const exportToCSV = () => {
    const headers = ["Fecha", "Cliente", "Telefono", "Plan", "Vendedor", "Estado", "Comision", "Costo Instalacion"]
    const rows = filteredSales.map(sale => [
      new Date(sale.createdAt).toLocaleDateString("es-AR"),
      sale.customerInfo.name,
      sale.customerInfo.phone,
      sale.planName,
      sale.sellerName,
      sale.status,
      sale.commission || 0,
      sale.installationCost || 0
    ])

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `historial_ventas_${selectedYear}_${selectedMonth !== "all" ? selectedMonth : "todos"}.csv`
    link.click()
  }

  // Obtener solo vendedores y supervisores para el filtro
  const sellers = users.filter(u => u.role === "seller" || u.role === "supervisor")

  // Obtener nombre del mes para el titulo
  const getMonthName = () => {
    if (selectedMonth === "all") return "Todos los meses"
    return MONTHS.find(m => m.value === selectedMonth)?.label || ""
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Historial de Ventas</h1>
          <p className="text-muted-foreground">
            Vista global de todas las ventas con filtros avanzados
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Busqueda */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, telefono, plan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Mes */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(month => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Año */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year.value} value={year.value}>
                    {year.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Estado */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            {/* Vendedor */}
            <Select value={selectedSeller} onValueChange={setSelectedSeller}>
              <SelectTrigger className="sm:w-64">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los vendedores</SelectItem>
                {sellers.map(seller => (
                  <SelectItem key={seller._id} value={seller._id}>
                    {seller.name} ({seller.role === "supervisor" ? "Sup." : "Vend."})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="ghost" onClick={clearFilters} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Ventas</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Instaladas</p>
                <p className="text-2xl font-bold text-emerald-500">{summary.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <DollarSign className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comisiones Brutas</p>
                <p className="text-2xl font-bold">${summary.totalCommissions.toLocaleString("es-AR")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comisiones Netas</p>
                <p className="text-2xl font-bold text-emerald-500">
                  ${summary.netCommissions.toLocaleString("es-AR")}
                </p>
                {summary.totalInstallationCosts > 0 && (
                  <p className="text-xs text-red-400">
                    -${summary.totalInstallationCosts.toLocaleString("es-AR")} inst.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de ventas */}
      <Card>
        <CardHeader>
          <CardTitle>
            Ventas de {getMonthName()} {selectedYear}
          </CardTitle>
          <CardDescription>
            Mostrando {filteredSales.length} ventas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSales.length === 0 ? (
            <div className="text-center py-12">
              <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No se encontraron ventas con los filtros seleccionados</p>
              <Button variant="link" onClick={clearFilters}>Limpiar filtros</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Comision</TableHead>
                    <TableHead className="text-right">Costo Inst.</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale._id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(sale.createdAt).toLocaleDateString("es-AR")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sale.customerInfo.name}</p>
                          <p className="text-xs text-muted-foreground">{sale.customerInfo.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>{sale.planName}</TableCell>
                      <TableCell>{sale.sellerName}</TableCell>
                      <TableCell>
                        <StatusBadge status={sale.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        ${(sale.commission || 0).toLocaleString("es-AR")}
                      </TableCell>
                      <TableCell className="text-right">
                        {sale.installationCost ? (
                          <span className="text-red-400">
                            -${sale.installationCost.toLocaleString("es-AR")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedSale(sale)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalle */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Venta</DialogTitle>
            <DialogDescription>
              Informacion completa de la venta
            </DialogDescription>
          </DialogHeader>
          
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha</p>
                  <p className="font-medium">
                    {new Date(selectedSale.createdAt).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <StatusBadge status={selectedSale.status} />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="font-semibold mb-2">Cliente</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nombre:</span>{" "}
                    {selectedSale.customerInfo.name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Telefono:</span>{" "}
                    {selectedSale.customerInfo.phone}
                  </div>
                  <div>
                    <span className="text-muted-foreground">DNI:</span>{" "}
                    {selectedSale.customerInfo.dni}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    {selectedSale.customerInfo.email || "-"}
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="font-semibold mb-2">Direccion</h4>
                <p className="text-sm">
                  {selectedSale.customerInfo.address.street} {selectedSale.customerInfo.address.number},
                  {" "}{selectedSale.customerInfo.address.city}, {selectedSale.customerInfo.address.province}
                </p>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="font-semibold mb-2">Plan y Comision</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Plan:</span>{" "}
                    {selectedSale.planName}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Precio:</span>{" "}
                    ${(selectedSale.customPrice || selectedSale.planPrice || 0).toLocaleString("es-AR")}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Comision:</span>{" "}
                    <span className="text-emerald-500">
                      ${(selectedSale.commission || 0).toLocaleString("es-AR")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Costo Inst.:</span>{" "}
                    {selectedSale.installationCost ? (
                      <span className="text-red-400">
                        -${selectedSale.installationCost.toLocaleString("es-AR")}
                      </span>
                    ) : "-"}
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="font-semibold mb-2">Vendedor</h4>
                <p className="text-sm">{selectedSale.sellerName}</p>
              </div>

              {selectedSale.statusHistory && selectedSale.statusHistory.length > 0 && (
                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold mb-2">Historial de Estados</h4>
                  <div className="space-y-2">
                    {selectedSale.statusHistory.map((h, i) => (
                      <div key={i} className="flex justify-between items-center text-sm bg-secondary/30 p-2 rounded">
                        <StatusBadge status={h.status} />
                        <span className="text-muted-foreground">
                          {new Date(h.changedAt).toLocaleString("es-AR")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
