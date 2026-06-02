"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Search,
  DollarSign,
  Users,
  Building,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Eye,
  Settings,
  Percent,
  FileText,
  Calculator,
  Plus,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useCompany } from "@/lib/company-context"
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

// Tipos
interface ComisionAseguradora {
  id: string
  aseguradora: string
  porcentajeBase: number
  porcentajeVida: number
  polizasVigentes: number
  primaTotal: number
  comisionTotal: number
}

interface ComisionVendedor {
  id: string
  nombre: string
  email: string
  polizasVendidas: number
  primaTotal: number
  porcentajeComision: number
  comisionTotal: number
  comisionPagada: number
  comisionPendiente: number
}

interface LiquidacionMensual {
  id: string
  mes: string
  aseguradora: string
  polizas: number
  primaTotal: number
  porcentaje: number
  comision: number
  estado: "pendiente" | "pagada" | "parcial"
  fechaPago?: string
}

// Colores para graficos
const COLORS = ["#1a3a5c", "#5eb3e4", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"]

// Datos de ejemplo
const mockComisionesAseguradoras: ComisionAseguradora[] = [
  { id: "1", aseguradora: "SANCOR", porcentajeBase: 18, porcentajeVida: 25, polizasVigentes: 38, primaTotal: 1250000, comisionTotal: 225000 },
  { id: "2", aseguradora: "ATM", porcentajeBase: 15, porcentajeVida: 20, polizasVigentes: 277, primaTotal: 3500000, comisionTotal: 525000 },
  { id: "3", aseguradora: "BBVA", porcentajeBase: 12, porcentajeVida: 18, polizasVigentes: 94, primaTotal: 890000, comisionTotal: 106800 },
  { id: "4", aseguradora: "LES", porcentajeBase: 16, porcentajeVida: 22, polizasVigentes: 57, primaTotal: 720000, comisionTotal: 115200 },
  { id: "5", aseguradora: "PARANA", porcentajeBase: 14, porcentajeVida: 20, polizasVigentes: 3, primaTotal: 85000, comisionTotal: 11900 },
  { id: "6", aseguradora: "GALENO", porcentajeBase: 10, porcentajeVida: 15, polizasVigentes: 1, primaTotal: 45000, comisionTotal: 4500 },
]

const mockComisionesVendedores: ComisionVendedor[] = [
  { id: "1", nombre: "Juan Perez", email: "jperez@seguros.com", polizasVendidas: 45, primaTotal: 850000, porcentajeComision: 8, comisionTotal: 68000, comisionPagada: 50000, comisionPendiente: 18000 },
  { id: "2", nombre: "Maria Garcia", email: "mgarcia@seguros.com", polizasVendidas: 38, primaTotal: 720000, porcentajeComision: 8, comisionTotal: 57600, comisionPagada: 57600, comisionPendiente: 0 },
  { id: "3", nombre: "Carlos Lopez", email: "clopez@seguros.com", polizasVendidas: 52, primaTotal: 980000, porcentajeComision: 10, comisionTotal: 98000, comisionPagada: 75000, comisionPendiente: 23000 },
  { id: "4", nombre: "Ana Martinez", email: "amartinez@seguros.com", polizasVendidas: 28, primaTotal: 420000, porcentajeComision: 8, comisionTotal: 33600, comisionPagada: 33600, comisionPendiente: 0 },
  { id: "5", nombre: "Pedro Gonzalez", email: "pgonzalez@seguros.com", polizasVendidas: 35, primaTotal: 590000, porcentajeComision: 8, comisionTotal: 47200, comisionPagada: 30000, comisionPendiente: 17200 },
]

const mockLiquidaciones: LiquidacionMensual[] = [
  { id: "1", mes: "Enero 2026", aseguradora: "ATM", polizas: 45, primaTotal: 580000, porcentaje: 15, comision: 87000, estado: "pagada", fechaPago: "15/02/2026" },
  { id: "2", mes: "Enero 2026", aseguradora: "SANCOR", polizas: 12, primaTotal: 320000, porcentaje: 18, comision: 57600, estado: "pagada", fechaPago: "18/02/2026" },
  { id: "3", mes: "Febrero 2026", aseguradora: "ATM", polizas: 52, primaTotal: 620000, porcentaje: 15, comision: 93000, estado: "pendiente" },
  { id: "4", mes: "Febrero 2026", aseguradora: "SANCOR", polizas: 15, primaTotal: 380000, porcentaje: 18, comision: 68400, estado: "pendiente" },
  { id: "5", mes: "Febrero 2026", aseguradora: "BBVA", polizas: 28, primaTotal: 180000, porcentaje: 12, comision: 21600, estado: "parcial" },
]

export default function InsuranceCommissionsPage() {
  const router = useRouter()
  const { currentCompany } = useCompany()
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("aseguradoras")
  const [searchTerm, setSearchTerm] = useState("")
  const MONTH_OPTIONS = (() => {
    const names = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
    const now = new Date()
    const out: { value: string; label: string }[] = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      out.push({ value: `${y}-${String(m).padStart(2, "0")}`, label: `${names[m - 1]} ${y}` })
    }
    return out
  })()
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTIONS[0].value)
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [selectedAseguradora, setSelectedAseguradora] = useState<ComisionAseguradora | null>(null)

  // Redirigir si no es la empresa Seguros
  useEffect(() => {
    if (currentCompany.id !== "seguros") {
      router.push("/admin/commissions")
    }
  }, [currentCompany.id, router])

  // Estadisticas generales
  const totalComisionesAseguradoras = mockComisionesAseguradoras.reduce((acc, c) => acc + c.comisionTotal, 0)
  const totalComisionesVendedores = mockComisionesVendedores.reduce((acc, c) => acc + c.comisionTotal, 0)
  const totalPendienteVendedores = mockComisionesVendedores.reduce((acc, c) => acc + c.comisionPendiente, 0)
  const totalPolizas = mockComisionesAseguradoras.reduce((acc, c) => acc + c.polizasVigentes, 0)

  // Datos para graficos
  const chartDataAseguradoras = mockComisionesAseguradoras.map(c => ({
    name: c.aseguradora,
    comision: c.comisionTotal,
    polizas: c.polizasVigentes,
  }))

  const pieDataAseguradoras = mockComisionesAseguradoras.map(c => ({
    name: c.aseguradora,
    value: c.comisionTotal,
  }))

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(value)
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pagada":
        return <Badge className="bg-emerald-100 text-emerald-700 border-0">Pagada</Badge>
      case "pendiente":
        return <Badge className="bg-amber-100 text-amber-700 border-0">Pendiente</Badge>
      case "parcial":
        return <Badge className="bg-blue-100 text-blue-700 border-0">Parcial</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  if (currentCompany.id !== "seguros") {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center h-[60vh]">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Comisiones de Seguros</h1>
            <p className="text-sm text-slate-500">Gestion de comisiones por aseguradora y vendedor</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button size="sm" className="bg-[#1a3a5c] hover:bg-[#0f2a45]">
              <Calculator className="h-4 w-4 mr-2" />
              Liquidar Mes
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600">Comisiones Aseguradoras</p>
                  <p className="text-xl font-bold text-blue-700">{formatCurrency(totalComisionesAseguradoras)}</p>
                  <p className="text-xs text-blue-500 mt-1">{totalPolizas} polizas</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-200/80 flex items-center justify-center">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-600">Comisiones Vendedores</p>
                  <p className="text-xl font-bold text-emerald-700">{formatCurrency(totalComisionesVendedores)}</p>
                  <p className="text-xs text-emerald-500 mt-1">{mockComisionesVendedores.length} vendedores</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-emerald-200/80 flex items-center justify-center">
                  <Users className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-600">Pendiente Vendedores</p>
                  <p className="text-xl font-bold text-amber-700">{formatCurrency(totalPendienteVendedores)}</p>
                  <p className="text-xs text-amber-500 mt-1">A liquidar</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-amber-200/80 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-600">Margen Bruto</p>
                  <p className="text-xl font-bold text-purple-700">{formatCurrency(totalComisionesAseguradoras - totalComisionesVendedores)}</p>
                  <p className="text-xs text-purple-500 mt-1">Diferencia</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-purple-200/80 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="aseguradoras" className="gap-2">
              <Building className="h-4 w-4" />
              Aseguradoras
            </TabsTrigger>
            <TabsTrigger value="vendedores" className="gap-2">
              <Users className="h-4 w-4" />
              Vendedores
            </TabsTrigger>
            <TabsTrigger value="liquidaciones" className="gap-2">
              <FileText className="h-4 w-4" />
              Liquidaciones
            </TabsTrigger>
          </TabsList>

          {/* Tab Aseguradoras */}
          <TabsContent value="aseguradoras" className="space-y-4">
            <div className="grid lg:grid-cols-3 gap-4">
              {/* Tabla */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Comisiones por Aseguradora</CardTitle>
                  <CardDescription>Porcentajes y montos por cada compania</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Aseguradora</TableHead>
                        <TableHead className="text-center">% Base</TableHead>
                        <TableHead className="text-center">% Vida</TableHead>
                        <TableHead className="text-center">Polizas</TableHead>
                        <TableHead className="text-right">Prima Total</TableHead>
                        <TableHead className="text-right">Comision</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockComisionesAseguradoras.map((comision) => (
                        <TableRow key={comision.id}>
                          <TableCell>
                            <Badge variant="outline" className="font-semibold">
                              {comision.aseguradora}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-mono text-sm">{comision.porcentajeBase}%</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-mono text-sm">{comision.porcentajeVida}%</span>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {comision.polizasVigentes}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(comision.primaTotal)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-emerald-600">
                            {formatCurrency(comision.comisionTotal)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setSelectedAseguradora(comision)
                                setIsConfigDialogOpen(true)
                              }}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Grafico */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Distribucion</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieDataAseguradoras}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieDataAseguradoras.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Vendedores */}
          <TabsContent value="vendedores" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Comisiones por Vendedor</CardTitle>
                    <CardDescription>Detalle de comisiones y liquidaciones</CardDescription>
                  </div>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Configurar Comision
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendedor</TableHead>
                      <TableHead className="text-center">Polizas</TableHead>
                      <TableHead className="text-right">Prima</TableHead>
                      <TableHead className="text-center">%</TableHead>
                      <TableHead className="text-right">Comision</TableHead>
                      <TableHead className="text-right">Pagado</TableHead>
                      <TableHead className="text-right">Pendiente</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockComisionesVendedores.map((vendedor) => (
                      <TableRow key={vendedor.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{vendedor.nombre}</p>
                            <p className="text-xs text-slate-500">{vendedor.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {vendedor.polizasVendidas}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(vendedor.primaTotal)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono">
                            {vendedor.porcentajeComision}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(vendedor.comisionTotal)}
                        </TableCell>
                        <TableCell className="text-right text-emerald-600">
                          {formatCurrency(vendedor.comisionPagada)}
                        </TableCell>
                        <TableCell className="text-right">
                          {vendedor.comisionPendiente > 0 ? (
                            <span className="text-amber-600 font-medium">
                              {formatCurrency(vendedor.comisionPendiente)}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Liquidaciones */}
          <TabsContent value="liquidaciones" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Liquidaciones Mensuales</CardTitle>
                    <CardDescription>Historial de liquidaciones de aseguradoras</CardDescription>
                  </div>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[150px]">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>Aseguradora</TableHead>
                      <TableHead className="text-center">Polizas</TableHead>
                      <TableHead className="text-right">Prima</TableHead>
                      <TableHead className="text-center">%</TableHead>
                      <TableHead className="text-right">Comision</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Pago</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockLiquidaciones.map((liquidacion) => (
                      <TableRow key={liquidacion.id}>
                        <TableCell className="font-medium">{liquidacion.mes}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{liquidacion.aseguradora}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{liquidacion.polizas}</TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(liquidacion.primaTotal)}
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          {liquidacion.porcentaje}%
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600">
                          {formatCurrency(liquidacion.comision)}
                        </TableCell>
                        <TableCell>{getEstadoBadge(liquidacion.estado)}</TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {liquidacion.fechaPago || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Config Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar Comisiones
            </DialogTitle>
            <DialogDescription>
              Ajustar porcentajes para {selectedAseguradora?.aseguradora}
            </DialogDescription>
          </DialogHeader>

          {selectedAseguradora && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Porcentaje Base</label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      defaultValue={selectedAseguradora.porcentajeBase}
                      className="pr-8"
                    />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Porcentaje Vida</label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      defaultValue={selectedAseguradora.porcentajeVida}
                      className="pr-8"
                    />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setIsConfigDialogOpen(false)
                toast({
                  title: "Configuracion guardada",
                  description: `Se actualizaron los porcentajes de ${selectedAseguradora?.aseguradora}`,
                })
              }}
              className="bg-[#1a3a5c] hover:bg-[#0f2a45]"
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
