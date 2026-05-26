"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
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
  Search,
  Plus,
  AlertTriangle,
  Car,
  Bike,
  Home,
  Eye,
  Edit,
  FileText,
  Calendar,
  User,
  Building,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useCompany } from "@/lib/company-context"

// Tipos basados en el CSV de siniestros
interface Siniestro {
  id: string
  poliza: string
  bienAsegurado: "AUTO" | "MOTO" | "BICICLETA" | "HOGAR"
  fechaOcurrencia: string
  tipoSiniestro: string
  compania: string
  asegurado: string
  denunciaAdministrativa: "REALIZADA" | "PENDIENTE"
  numeroSiniestro: string
  estadoSiniestro: "EN TRAMITE" | "FINALIZADO" | "RECHAZADO"
  observaciones?: string
}

// Datos de ejemplo basados en el CSV
const mockSiniestros: Siniestro[] = [
  {
    id: "1",
    poliza: "4686180",
    bienAsegurado: "BICICLETA",
    fechaOcurrencia: "15/11/2026",
    tipoSiniestro: "ROBO TOTAL",
    compania: "BBVA",
    asegurado: "CANOSA ERIKA",
    denunciaAdministrativa: "REALIZADA",
    numeroSiniestro: "67981",
    estadoSiniestro: "EN TRAMITE",
  },
  {
    id: "2",
    poliza: "839344",
    bienAsegurado: "AUTO",
    fechaOcurrencia: "26/11/2026",
    tipoSiniestro: "DAÑO TOTAL",
    compania: "ATM",
    asegurado: "JILAS DIEGO",
    denunciaAdministrativa: "REALIZADA",
    numeroSiniestro: "120459",
    estadoSiniestro: "EN TRAMITE",
  },
  {
    id: "3",
    poliza: "769510",
    bienAsegurado: "MOTO",
    fechaOcurrencia: "13/12/2026",
    tipoSiniestro: "CHOQUE/ACCIDENTE",
    compania: "ATM",
    asegurado: "GONZALEZ IGNACIO",
    denunciaAdministrativa: "REALIZADA",
    numeroSiniestro: "122314",
    estadoSiniestro: "EN TRAMITE",
  },
  {
    id: "4",
    poliza: "83237",
    bienAsegurado: "AUTO",
    fechaOcurrencia: "16/12/2026",
    tipoSiniestro: "CHOQUE/ACCIDENTE",
    compania: "LA EQUIDAD",
    asegurado: "EKHAUZER EZEQUIEL",
    denunciaAdministrativa: "REALIZADA",
    numeroSiniestro: "4370",
    estadoSiniestro: "EN TRAMITE",
  },
  {
    id: "5",
    poliza: "",
    bienAsegurado: "AUTO",
    fechaOcurrencia: "01/01/2026",
    tipoSiniestro: "ROBO PARCIAL",
    compania: "SANCOR",
    asegurado: "GARCIA ANA PATRICIA",
    denunciaAdministrativa: "REALIZADA",
    numeroSiniestro: "2003886561",
    estadoSiniestro: "FINALIZADO",
  },
  {
    id: "6",
    poliza: "827710",
    bienAsegurado: "AUTO",
    fechaOcurrencia: "05/01/2026",
    tipoSiniestro: "CRISTALES",
    compania: "ATM",
    asegurado: "PEDROS NICOLAS EMMANUEL",
    denunciaAdministrativa: "REALIZADA",
    numeroSiniestro: "124623",
    estadoSiniestro: "FINALIZADO",
  },
  {
    id: "7",
    poliza: "851867",
    bienAsegurado: "AUTO",
    fechaOcurrencia: "08/01/2026",
    tipoSiniestro: "CHOQUE/ACCIDENTE",
    compania: "ATM",
    asegurado: "SOTO ANTONIO OSCAR",
    denunciaAdministrativa: "REALIZADA",
    numeroSiniestro: "124984",
    estadoSiniestro: "EN TRAMITE",
  },
  {
    id: "8",
    poliza: "6200751",
    bienAsegurado: "MOTO",
    fechaOcurrencia: "27/01/2026",
    tipoSiniestro: "ROBO TOTAL",
    compania: "ATM",
    asegurado: "ORTIZ MARTIN IGNACIO",
    denunciaAdministrativa: "REALIZADA",
    numeroSiniestro: "531703",
    estadoSiniestro: "EN TRAMITE",
  },
]

const companias = ["Todas", "ATM", "SANCOR", "BBVA", "PARANA", "LA EQUIDAD", "GALENO"]
const estadosSiniestro = ["Todos", "EN TRAMITE", "FINALIZADO", "RECHAZADO"]
const tiposSiniestro = ["Todos", "ROBO TOTAL", "ROBO PARCIAL", "CHOQUE/ACCIDENTE", "CRISTALES", "DAÑO TOTAL"]

export default function SiniestrosPage() {
  const router = useRouter()
  const { currentCompany } = useCompany()
  const { toast } = useToast()
  
  const [siniestros, setSiniestros] = useState<Siniestro[]>(mockSiniestros)
  const [filteredSiniestros, setFilteredSiniestros] = useState<Siniestro[]>(mockSiniestros)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCompania, setSelectedCompania] = useState("Todas")
  const [selectedEstado, setSelectedEstado] = useState("Todos")
  const [selectedTipo, setSelectedTipo] = useState("Todos")
  const [selectedSiniestro, setSelectedSiniestro] = useState<Siniestro | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isNewSiniestroOpen, setIsNewSiniestroOpen] = useState(false)

  // Redirigir si no es la empresa Seguros
  useEffect(() => {
    if (currentCompany.id !== "seguros") {
      router.push("/admin")
    }
  }, [currentCompany.id, router])

  // Estadisticas
  const stats = {
    total: siniestros.length,
    enTramite: siniestros.filter(s => s.estadoSiniestro === "EN TRAMITE").length,
    finalizados: siniestros.filter(s => s.estadoSiniestro === "FINALIZADO").length,
    rechazados: siniestros.filter(s => s.estadoSiniestro === "RECHAZADO").length,
  }

  // Filtrar siniestros
  useEffect(() => {
    let result = siniestros

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(s =>
        s.asegurado.toLowerCase().includes(term) ||
        s.poliza.includes(term) ||
        s.numeroSiniestro.includes(term)
      )
    }

    if (selectedCompania !== "Todas") {
      result = result.filter(s => s.compania === selectedCompania)
    }

    if (selectedEstado !== "Todos") {
      result = result.filter(s => s.estadoSiniestro === selectedEstado)
    }

    if (selectedTipo !== "Todos") {
      result = result.filter(s => s.tipoSiniestro === selectedTipo)
    }

    setFilteredSiniestros(result)
  }, [searchTerm, selectedCompania, selectedEstado, selectedTipo, siniestros])

  const getBienIcon = (bien: string) => {
    switch (bien) {
      case "AUTO":
        return <Car className="h-4 w-4" />
      case "MOTO":
        return <Bike className="h-4 w-4" />
      case "BICICLETA":
        return <Bike className="h-4 w-4" />
      case "HOGAR":
        return <Home className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "EN TRAMITE":
        return <Badge className="bg-amber-100 text-amber-700 border-0">En Tramite</Badge>
      case "FINALIZADO":
        return <Badge className="bg-emerald-100 text-emerald-700 border-0">Finalizado</Badge>
      case "RECHAZADO":
        return <Badge className="bg-red-100 text-red-700 border-0">Rechazado</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  const getTipoBadge = (tipo: string) => {
    const colores: Record<string, string> = {
      "ROBO TOTAL": "bg-red-100 text-red-700",
      "ROBO PARCIAL": "bg-orange-100 text-orange-700",
      "CHOQUE/ACCIDENTE": "bg-blue-100 text-blue-700",
      "CRISTALES": "bg-slate-100 text-slate-700",
      "DAÑO TOTAL": "bg-purple-100 text-purple-700",
    }
    return <Badge className={`${colores[tipo] || "bg-slate-100 text-slate-700"} border-0`}>{tipo}</Badge>
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
            <h1 className="text-2xl font-bold text-slate-800">Gestion de Siniestros</h1>
            <p className="text-sm text-slate-500">Seguimiento de denuncias y tramites</p>
          </div>
          <Button
            className="bg-[#1a3a5c] hover:bg-[#0f2a45]"
            onClick={() => setIsNewSiniestroOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Siniestro
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600">Total</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-blue-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-600">En Tramite</p>
                  <p className="text-2xl font-bold text-amber-700">{stats.enTramite}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-600">Finalizados</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.finalizados}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-emerald-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-600">Rechazados</p>
                  <p className="text-2xl font-bold text-red-700">{stats.rechazados}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar por asegurado, poliza o numero de siniestro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Select value={selectedCompania} onValueChange={setSelectedCompania}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Compania" />
                  </SelectTrigger>
                  <SelectContent>
                    {companias.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedEstado} onValueChange={setSelectedEstado}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {estadosSiniestro.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedTipo} onValueChange={setSelectedTipo}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposSiniestro.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Siniestros ({filteredSiniestros.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asegurado</TableHead>
                      <TableHead>Bien</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Compania</TableHead>
                      <TableHead>N Siniestro</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSiniestros.map((siniestro) => (
                      <TableRow key={siniestro.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center">
                              <User className="h-4 w-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{siniestro.asegurado}</p>
                              <p className="text-xs text-slate-500">Poliza: {siniestro.poliza || "-"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-slate-600">
                            {getBienIcon(siniestro.bienAsegurado)}
                            <span className="text-sm">{siniestro.bienAsegurado}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{siniestro.fechaOcurrencia}</TableCell>
                        <TableCell>{getTipoBadge(siniestro.tipoSiniestro)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{siniestro.compania}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{siniestro.numeroSiniestro}</TableCell>
                        <TableCell>{getEstadoBadge(siniestro.estadoSiniestro)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setSelectedSiniestro(siniestro)
                                setIsDetailOpen(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Detalle del Siniestro
            </DialogTitle>
            <DialogDescription>
              Siniestro N {selectedSiniestro?.numeroSiniestro}
            </DialogDescription>
          </DialogHeader>

          {selectedSiniestro && (
            <div className="space-y-4 py-4">
              {/* Estado */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
                <div>
                  <p className="text-sm text-slate-500">Estado</p>
                  <div className="mt-1">{getEstadoBadge(selectedSiniestro.estadoSiniestro)}</div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Denuncia</p>
                  <Badge className={selectedSiniestro.denunciaAdministrativa === "REALIZADA" ? "bg-emerald-100 text-emerald-700 border-0" : "bg-amber-100 text-amber-700 border-0"}>
                    {selectedSiniestro.denunciaAdministrativa}
                  </Badge>
                </div>
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Asegurado</p>
                  <p className="font-medium">{selectedSiniestro.asegurado}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Poliza</p>
                  <p className="font-medium font-mono">{selectedSiniestro.poliza || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Bien Asegurado</p>
                  <p className="font-medium flex items-center gap-2">
                    {getBienIcon(selectedSiniestro.bienAsegurado)}
                    {selectedSiniestro.bienAsegurado}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Compania</p>
                  <p className="font-medium">{selectedSiniestro.compania}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Fecha Ocurrencia</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {selectedSiniestro.fechaOcurrencia}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tipo de Siniestro</p>
                  <div className="mt-1">{getTipoBadge(selectedSiniestro.tipoSiniestro)}</div>
                </div>
              </div>

              {/* Observaciones */}
              <div className="pt-3 border-t">
                <p className="text-xs text-slate-500 mb-2">Observaciones</p>
                <Textarea
                  placeholder="Agregar observaciones..."
                  defaultValue={selectedSiniestro.observaciones || ""}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
            <Button className="bg-[#1a3a5c] hover:bg-[#0f2a45]">
              <Edit className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Siniestro Dialog */}
      <Dialog open={isNewSiniestroOpen} onOpenChange={setIsNewSiniestroOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Registrar Siniestro
            </DialogTitle>
            <DialogDescription>
              Ingresa los datos del nuevo siniestro
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Numero de Poliza</label>
                <Input placeholder="Ej: 839344" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Compania</label>
                <Select>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {companias.filter(c => c !== "Todas").map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Asegurado</label>
              <Input placeholder="Nombre completo" className="mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Bien Asegurado</label>
                <Select>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO">Auto</SelectItem>
                    <SelectItem value="MOTO">Moto</SelectItem>
                    <SelectItem value="BICICLETA">Bicicleta</SelectItem>
                    <SelectItem value="HOGAR">Hogar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Fecha Ocurrencia</label>
                <Input type="date" className="mt-1" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Tipo de Siniestro</label>
              <Select>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {tiposSiniestro.filter(t => t !== "Todos").map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Observaciones</label>
              <Textarea placeholder="Detalles adicionales..." className="mt-1" rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewSiniestroOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-[#1a3a5c] hover:bg-[#0f2a45]"
              onClick={() => {
                setIsNewSiniestroOpen(false)
                toast({
                  title: "Siniestro registrado",
                  description: "El siniestro fue registrado correctamente",
                })
              }}
            >
              Registrar Siniestro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
