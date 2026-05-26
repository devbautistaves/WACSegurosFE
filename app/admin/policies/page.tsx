"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import {
  Search,
  Plus,
  FileText,
  Phone,
  Mail,
  Eye,
  Edit,
  Trash2,
  Filter,
  Download,
  Upload,
  Building2,
  Calendar,
  Car,
  Shield,
  User,
  CreditCard,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useCompany } from "@/lib/company-context"
import { polizasAPI, Poliza } from "@/lib/api"

// Tipos de datos para polizas de seguros (legacy, mantenemos para compatibilidad)
interface Policy {
  id: string
  sucursal: string
  fechaInicVig: string
  medioPago: string
  estado: "vigente" | "pendiente_pago" | "en_mora" | "renovacion" | "anulada"
  patente: string
  aseguradora: string
  tipoCobertura: string
  nombreApellido: string
  dni: string
  nacimiento: string
  celular: string
  email: string
  domicilio: string
  localidad: string
  cp: string
  datosRiesgo: string
  chasis: string
  motor: string
  gnc: string
  numPoliza: string
  primaTotal?: number
  vendedor?: string
}

// Datos de ejemplo basados en los CSV proporcionados
const mockPolicies: Policy[] = [
  {
    id: "1",
    sucursal: "LONG",
    fechaInicVig: "3/10/2018",
    medioPago: "TARJ CRED",
    estado: "vigente",
    patente: "APCOL",
    aseguradora: "BBVA",
    tipoCobertura: "ACC PERSONALES COLECTIVO",
    nombreApellido: "CAO PABLO EZEQUIEL",
    dni: "35243460",
    nacimiento: "01/05/1990",
    celular: "",
    email: "pablocao90@gmail.com",
    domicilio: "OCHOA 845",
    localidad: "CABA",
    cp: "1000",
    datosRiesgo: "ACCIDENTES PERSONALES COLECTIVO",
    chasis: "NO",
    motor: "NO",
    gnc: "NO",
    numPoliza: "9998441",
    primaTotal: 15000,
    vendedor: "Juan Perez",
  },
  {
    id: "2",
    sucursal: "GLEW",
    fechaInicVig: "11/10/2022",
    medioPago: "CUPON",
    estado: "vigente",
    patente: "250IGL",
    aseguradora: "ATM",
    tipoCobertura: "MOTOVEHICULO",
    nombreApellido: "CENTURION SERGIO",
    dni: "33856194",
    nacimiento: "28/05/1988",
    celular: "1166956426",
    email: "Jocesito0688@gmail.com",
    domicilio: "Tapin 3402",
    localidad: "GLEW",
    cp: "1856",
    datosRiesgo: "MOTOVEHICULO",
    chasis: "8CHKC0820CP011480",
    motor: "KC08E2C507772",
    gnc: "NO",
    numPoliza: "2532452",
    primaTotal: 8500,
    vendedor: "Maria Garcia",
  },
  {
    id: "3",
    sucursal: "GLEW",
    fechaInicVig: "7/11/2022",
    medioPago: "CUPON",
    estado: "pendiente_pago",
    patente: "NSH786",
    aseguradora: "SANCOR",
    tipoCobertura: "AUTOMOTORES",
    nombreApellido: "BRUNA EMILIO JOSE",
    dni: "16075856",
    nacimiento: "06/01/1963",
    celular: "1150963281",
    email: "josebruna875@gmail.com",
    domicilio: "EVA PERON 943",
    localidad: "GLEW",
    cp: "1856",
    datosRiesgo: "AUTOMOTORES",
    chasis: "8AGCB4850ER176899",
    motor: "CXXM06510",
    gnc: "NO",
    numPoliza: "11547930",
    primaTotal: 25000,
    vendedor: "Carlos Lopez",
  },
  {
    id: "4",
    sucursal: "GLEW",
    fechaInicVig: "5/1/2023",
    medioPago: "CUPON",
    estado: "vigente",
    patente: "AD485GJ",
    aseguradora: "SANCOR",
    tipoCobertura: "AUTOMOTORES",
    nombreApellido: "ALARCON CRISTIAN SEBASTIAN",
    dni: "29055362",
    nacimiento: "11/09/1981",
    celular: "1160197270",
    email: "cristianalarcon81@hotmail.com.ar",
    domicilio: "CABRERA 538",
    localidad: "GLEW",
    cp: "1856",
    datosRiesgo: "AUTOMOTORES",
    chasis: "93Y4SRBE4KJ729034",
    motor: "K7MA812UF00849",
    gnc: "NO",
    numPoliza: "11659166",
    primaTotal: 32000,
    vendedor: "Ana Martinez",
  },
  {
    id: "5",
    sucursal: "GLEW",
    fechaInicVig: "8/3/2023",
    medioPago: "CBU",
    estado: "en_mora",
    patente: "A155NFP",
    aseguradora: "ATM",
    tipoCobertura: "MOTOVEHICULO",
    nombreApellido: "ACOSTA SERGIO LEONARDO",
    dni: "32948294",
    nacimiento: "",
    celular: "1128576838",
    email: "sergioacosta1824@gmail.com",
    domicilio: "JUJUY 3021",
    localidad: "RAFAEL CALZADA",
    cp: "1847",
    datosRiesgo: "MOTOVEHICULO",
    chasis: "8CVA910Y6MA012940",
    motor: "JEXCME85732",
    gnc: "NO",
    numPoliza: "5384937",
    primaTotal: 12000,
    vendedor: "Pedro Gonzalez",
  },
]

// Aseguradoras disponibles
const ASEGURADORAS = ["BBVA", "SANCOR", "ATM", "LES", "PARANA", "GALENO", "ORBIS", "CALEDONIA"]

export default function PoliciesPage() {
  const { currentCompany } = useCompany()
  const { toast } = useToast()
  const [policies, setPolicies] = useState<Policy[]>(mockPolicies)
  const [polizasAPI_data, setPolizasAPIData] = useState<Poliza[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [aseguradoraFilter, setAseguradoraFilter] = useState<string>("all")
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  // Cargar polizas desde la API
  useEffect(() => {
    const loadPolizas = async () => {
      try {
        setIsLoading(true)
        const token = localStorage.getItem("token")
        if (!token) return

        const response = await polizasAPI.getAll(token, {
          search: searchTerm || undefined,
          estado: statusFilter !== "all" ? statusFilter : undefined,
          aseguradora: aseguradoraFilter !== "all" ? aseguradoraFilter : undefined,
        })

        if (response.success && response.polizas) {
          setPolizasAPIData(response.polizas)
          // Convertir a formato legacy para mantener compatibilidad
          const convertedPolicies: Policy[] = response.polizas.map((p) => ({
            id: p._id,
            sucursal: p.sucursal || "",
            fechaInicVig: new Date(p.vigenciaDesde).toLocaleDateString("es-AR"),
            medioPago: p.formaPago,
            estado: p.estado as Policy["estado"],
            patente: p.bienAsegurado?.patente || "",
            aseguradora: p.aseguradora,
            tipoCobertura: p.ramo,
            nombreApellido: p.clienteNombre,
            dni: p.clienteDni,
            nacimiento: "",
            celular: p.clienteTelefono || "",
            email: p.clienteEmail || "",
            domicilio: p.clienteDomicilio || "",
            localidad: p.clienteLocalidad || "",
            cp: "",
            datosRiesgo: p.bienAsegurado?.tipo || "",
            chasis: "",
            motor: "",
            gnc: "",
            numPoliza: p.numeroPoliza,
            primaTotal: p.primaTotal,
            vendedor: p.productorNombre,
          }))
          setPolicies(convertedPolicies)
        }
      } catch (error) {
        console.error("[v0] Error loading polizas:", error)
        // Si falla la API, mantener los datos mock para desarrollo
        toast({
          title: "Usando datos de ejemplo",
          description: "No se pudo conectar con el servidor. Mostrando datos de ejemplo.",
          variant: "default",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadPolizas()
  }, [searchTerm, statusFilter, aseguradoraFilter, toast])

  const filteredPolicies = policies.filter((policy) => {
    const matchesSearch =
      policy.nombreApellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.dni.includes(searchTerm) ||
      policy.patente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.numPoliza.includes(searchTerm)
    const matchesStatus = statusFilter === "all" || policy.estado === statusFilter
    const matchesAseguradora = aseguradoraFilter === "all" || policy.aseguradora === aseguradoraFilter
    return matchesSearch && matchesStatus && matchesAseguradora
  })

  const getStatusBadge = (estado: Policy["estado"]) => {
    const statusConfig = {
      vigente: { label: "Vigente", className: "bg-green-100 text-green-700 border-green-300" },
      pendiente_pago: { label: "Pend. Pago", className: "bg-amber-100 text-amber-700 border-amber-300" },
      en_mora: { label: "En Mora", className: "bg-red-100 text-red-700 border-red-300" },
      renovacion: { label: "Renovacion", className: "bg-blue-100 text-blue-700 border-blue-300" },
      anulada: { label: "Anulada", className: "bg-gray-100 text-gray-700 border-gray-300" },
    }
    const config = statusConfig[estado] || statusConfig.vigente
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(value)
  }

  // Estadisticas
  const stats = {
    total: policies.length,
    vigentes: policies.filter((p) => p.estado === "vigente").length,
    pendientes: policies.filter((p) => p.estado === "pendiente_pago").length,
    enMora: policies.filter((p) => p.estado === "en_mora").length,
    anuladas: policies.filter((p) => p.estado === "anulada").length,
  }

  return (
    <DashboardLayout requiredRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Polizas de Seguros</h1>
            <p className="text-sm text-muted-foreground">
              Gestion de polizas y coberturas - {stats.total} polizas registradas
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Importar CSV</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button size="sm" className="gap-2 bg-[#1a3a5c] hover:bg-[#0f2840]">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva Poliza</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <Card className="border-0 bg-gradient-to-br from-slate-50 to-slate-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-200 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="text-xl font-bold text-slate-700">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-200 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-green-600">Vigentes</p>
                  <p className="text-xl font-bold text-green-700">{stats.vigentes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-200 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-amber-600">Pend. Pago</p>
                  <p className="text-xl font-bold text-amber-700">{stats.pendientes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-200 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-red-600">En Mora</p>
                  <p className="text-xl font-bold text-red-700">{stats.enMora}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-gray-50 to-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Anuladas</p>
                  <p className="text-xl font-bold text-gray-700">{stats.anuladas}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, DNI, patente o nro poliza..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="vigente">Vigente</SelectItem>
                  <SelectItem value="pendiente_pago">Pend. Pago</SelectItem>
                  <SelectItem value="en_mora">En Mora</SelectItem>
                  <SelectItem value="renovacion">Renovacion</SelectItem>
                  <SelectItem value="anulada">Anulada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={aseguradoraFilter} onValueChange={setAseguradoraFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Aseguradora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {ASEGURADORAS.map((aseg) => (
                    <SelectItem key={aseg} value={aseg}>
                      {aseg}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Policies Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">Asegurado</TableHead>
                    <TableHead className="font-semibold">Aseguradora</TableHead>
                    <TableHead className="font-semibold">Patente</TableHead>
                    <TableHead className="font-semibold">Cobertura</TableHead>
                    <TableHead className="font-semibold">Nro Poliza</TableHead>
                    <TableHead className="font-semibold">Prima</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="font-semibold text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPolicies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No se encontraron polizas
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPolicies.map((policy) => (
                      <TableRow key={policy.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{policy.nombreApellido}</span>
                            <span className="text-xs text-muted-foreground">DNI: {policy.dni}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-medium">
                            {policy.aseguradora}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{policy.patente}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-sm">
                          {policy.tipoCobertura}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{policy.numPoliza}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(policy.primaTotal || 0)}
                        </TableCell>
                        <TableCell>{getStatusBadge(policy.estado)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setSelectedPolicy(policy)
                                setIsViewDialogOpen(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* View Policy Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalle de Poliza
              </DialogTitle>
              <DialogDescription>
                Informacion completa de la poliza {selectedPolicy?.numPoliza}
              </DialogDescription>
            </DialogHeader>
            {selectedPolicy && (
              <div className="grid gap-4 py-4">
                {/* Datos del Asegurado */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Datos del Asegurado
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Nombre</p>
                      <p className="font-medium">{selectedPolicy.nombreApellido}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">DNI</p>
                      <p className="font-medium">{selectedPolicy.dni}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Celular</p>
                      <p className="font-medium">{selectedPolicy.celular || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedPolicy.email || "-"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Domicilio</p>
                      <p className="font-medium">{selectedPolicy.domicilio}, {selectedPolicy.localidad} ({selectedPolicy.cp})</p>
                    </div>
                  </div>
                </div>

                {/* Datos de la Poliza */}
                <div className="space-y-3 pt-3 border-t">
                  <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Datos de la Poliza
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Aseguradora</p>
                      <p className="font-medium">{selectedPolicy.aseguradora}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Nro. Poliza</p>
                      <p className="font-medium">{selectedPolicy.numPoliza}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cobertura</p>
                      <p className="font-medium">{selectedPolicy.tipoCobertura}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Prima Mensual</p>
                      <p className="font-medium text-green-600">{formatCurrency(selectedPolicy.primaTotal || 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Medio de Pago</p>
                      <p className="font-medium">{selectedPolicy.medioPago}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Estado</p>
                      {getStatusBadge(selectedPolicy.estado)}
                    </div>
                  </div>
                </div>

                {/* Datos del Vehiculo */}
                <div className="space-y-3 pt-3 border-t">
                  <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Datos del Riesgo
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Patente</p>
                      <p className="font-medium font-mono">{selectedPolicy.patente}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Descripcion</p>
                      <p className="font-medium">{selectedPolicy.datosRiesgo}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Chasis</p>
                      <p className="font-medium font-mono text-xs">{selectedPolicy.chasis}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Motor</p>
                      <p className="font-medium font-mono text-xs">{selectedPolicy.motor}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">GNC</p>
                      <p className="font-medium">{selectedPolicy.gnc}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sucursal</p>
                      <p className="font-medium">{selectedPolicy.sucursal}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Cerrar
              </Button>
              <Button className="bg-[#1a3a5c] hover:bg-[#0f2840]">
                <Edit className="h-4 w-4 mr-2" />
                Editar Poliza
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

// Missing imports for icons used in stats
import { Clock, AlertTriangle, XCircle } from "lucide-react"
