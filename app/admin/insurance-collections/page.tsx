"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Search,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Calendar,
  FileText,
  Send,
  Eye,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Filter,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useCompany } from "@/lib/company-context"

// Tipos basados en el CSV de cobranzas
interface CobranzaSeguro {
  id: string
  sucursal: string
  diaVto: number
  nombreApellido: string
  whatsapp: string
  aseguradora: string
  patente: string
  pagos: Record<string, "PAGO" | "ADEUDA" | "NO CORRES" | "AVISO" | "NO RESPONDE" | "">
  ultimoPago?: string
  estadoActual: "al_dia" | "adeuda" | "no_responde" | "aviso"
}

// Meses disponibles para el seguimiento
const MESES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
]

// Datos de ejemplo basados en el CSV
const mockCobranzas: CobranzaSeguro[] = [
  {
    id: "1",
    sucursal: "GLEW",
    diaVto: 1,
    nombreApellido: "BOGOJEVICH NADIA ROMINA",
    whatsapp: "1144208800",
    aseguradora: "BBVA",
    patente: "HOGAR",
    pagos: { "OCTUBRE": "PAGO", "NOVIEMBRE": "PAGO", "DICIEMBRE": "PAGO", "ENERO": "PAGO", "FEBRERO": "AVISO" },
    ultimoPago: "ENERO",
    estadoActual: "aviso",
  },
  {
    id: "2",
    sucursal: "GLEW",
    diaVto: 1,
    nombreApellido: "MENDY VALERIA MAGALI",
    whatsapp: "1162274438",
    aseguradora: "BBVA",
    patente: "BICI",
    pagos: { "OCTUBRE": "PAGO", "NOVIEMBRE": "PAGO", "DICIEMBRE": "PAGO", "ENERO": "PAGO", "FEBRERO": "PAGO" },
    ultimoPago: "FEBRERO",
    estadoActual: "al_dia",
  },
  {
    id: "3",
    sucursal: "GLEW",
    diaVto: 2,
    nombreApellido: "DEMATTEI MOCCIA BARBARA DANIELA",
    whatsapp: "1141811085",
    aseguradora: "SANCOR",
    patente: "AF582DK",
    pagos: { "OCTUBRE": "PAGO", "NOVIEMBRE": "PAGO", "DICIEMBRE": "PAGO", "ENERO": "PAGO", "FEBRERO": "PAGO" },
    ultimoPago: "FEBRERO",
    estadoActual: "al_dia",
  },
  {
    id: "4",
    sucursal: "GLEW",
    diaVto: 2,
    nombreApellido: "RAMIREZ SIERRA JORGE ERNESTO",
    whatsapp: "1169891830",
    aseguradora: "SANCOR",
    patente: "AG263ZG",
    pagos: { "OCTUBRE": "PAGO", "NOVIEMBRE": "PAGO", "DICIEMBRE": "ADEUDA", "ENERO": "", "FEBRERO": "NO RESPONDE" },
    ultimoPago: "NOVIEMBRE",
    estadoActual: "no_responde",
  },
  {
    id: "5",
    sucursal: "GLEW",
    diaVto: 3,
    nombreApellido: "MARIANELA TATIANA IGLESIAS",
    whatsapp: "2224544101",
    aseguradora: "ATM",
    patente: "LOK066",
    pagos: { "OCTUBRE": "PAGO", "NOVIEMBRE": "PAGO", "DICIEMBRE": "PAGO", "ENERO": "PAGO", "FEBRERO": "AVISO" },
    ultimoPago: "ENERO",
    estadoActual: "aviso",
  },
  {
    id: "6",
    sucursal: "GLEW",
    diaVto: 3,
    nombreApellido: "GONZALEZ DELVALLE ARTURO",
    whatsapp: "1171328914",
    aseguradora: "ATM",
    patente: "JQM311",
    pagos: { "OCTUBRE": "PAGO", "NOVIEMBRE": "PAGO", "DICIEMBRE": "ADEUDA", "ENERO": "", "FEBRERO": "NO RESPONDE" },
    ultimoPago: "NOVIEMBRE",
    estadoActual: "no_responde",
  },
  {
    id: "7",
    sucursal: "GLEW",
    diaVto: 1,
    nombreApellido: "QUIÑONEZ BENITEZ BERNARDINO",
    whatsapp: "1127131874",
    aseguradora: "LES",
    patente: "UTR896",
    pagos: { "OCTUBRE": "PAGO", "NOVIEMBRE": "PAGO", "DICIEMBRE": "PAGO", "ENERO": "PAGO", "FEBRERO": "AVISO" },
    ultimoPago: "ENERO",
    estadoActual: "aviso",
  },
]

const aseguradoras = ["Todas", "BBVA", "SANCOR", "ATM", "LES", "PARANA", "GALENO"]
const estados = ["Todos", "al_dia", "adeuda", "aviso", "no_responde"]

export default function InsuranceCollectionsPage() {
  const router = useRouter()
  const { currentCompany } = useCompany()
  const { toast } = useToast()
  
  const [cobranzas, setCobranzas] = useState<CobranzaSeguro[]>(mockCobranzas)
  const [filteredCobranzas, setFilteredCobranzas] = useState<CobranzaSeguro[]>(mockCobranzas)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAseguradora, setSelectedAseguradora] = useState("Todas")
  const [selectedEstado, setSelectedEstado] = useState("Todos")
  const [selectedDiaVto, setSelectedDiaVto] = useState("Todos")
  const [selectedCobranza, setSelectedCobranza] = useState<CobranzaSeguro | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState("FEBRERO")

  // Redirigir si no es la empresa Seguros
  useEffect(() => {
    if (currentCompany.id !== "seguros") {
      router.push("/admin/collections")
    }
  }, [currentCompany.id, router])

  // Estadisticas
  const stats = {
    total: cobranzas.length,
    alDia: cobranzas.filter(c => c.estadoActual === "al_dia").length,
    adeuda: cobranzas.filter(c => c.estadoActual === "adeuda").length,
    aviso: cobranzas.filter(c => c.estadoActual === "aviso").length,
    noResponde: cobranzas.filter(c => c.estadoActual === "no_responde").length,
  }

  // Filtrar cobranzas
  useEffect(() => {
    let result = cobranzas

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(c =>
        c.nombreApellido.toLowerCase().includes(term) ||
        c.patente.toLowerCase().includes(term) ||
        c.whatsapp.includes(term)
      )
    }

    if (selectedAseguradora !== "Todas") {
      result = result.filter(c => c.aseguradora === selectedAseguradora)
    }

    if (selectedEstado !== "Todos") {
      result = result.filter(c => c.estadoActual === selectedEstado)
    }

    if (selectedDiaVto !== "Todos") {
      result = result.filter(c => c.diaVto === parseInt(selectedDiaVto))
    }

    setFilteredCobranzas(result)
  }, [searchTerm, selectedAseguradora, selectedEstado, selectedDiaVto, cobranzas])

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "al_dia":
        return <Badge className="bg-emerald-100 text-emerald-700 border-0">Al Dia</Badge>
      case "adeuda":
        return <Badge className="bg-red-100 text-red-700 border-0">Adeuda</Badge>
      case "aviso":
        return <Badge className="bg-amber-100 text-amber-700 border-0">Aviso Enviado</Badge>
      case "no_responde":
        return <Badge className="bg-slate-100 text-slate-700 border-0">No Responde</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  const getPagoBadge = (pago: string) => {
    switch (pago) {
      case "PAGO":
        return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600"><CheckCircle className="h-3 w-3" /></span>
      case "ADEUDA":
        return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600"><XCircle className="h-3 w-3" /></span>
      case "AVISO":
        return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-600"><Clock className="h-3 w-3" /></span>
      case "NO RESPONDE":
        return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600"><AlertTriangle className="h-3 w-3" /></span>
      case "NO CORRES":
        return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-50 text-slate-400">-</span>
      default:
        return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-50 text-slate-300">-</span>
    }
  }

  const handleRegisterPayment = (cobranza: CobranzaSeguro) => {
    setSelectedCobranza(cobranza)
    setIsPaymentDialogOpen(true)
  }

  const handleSavePayment = () => {
    if (!selectedCobranza) return
    
    // Actualizar el pago en el estado
    const updated = cobranzas.map(c => {
      if (c.id === selectedCobranza.id) {
        return {
          ...c,
          pagos: { ...c.pagos, [selectedMonth]: "PAGO" as const },
          ultimoPago: selectedMonth,
          estadoActual: "al_dia" as const,
        }
      }
      return c
    })
    
    setCobranzas(updated)
    setIsPaymentDialogOpen(false)
    toast({
      title: "Pago registrado",
      description: `Se registro el pago de ${selectedMonth} para ${selectedCobranza.nombreApellido}`,
    })
  }

  const handleSendReminder = (cobranza: CobranzaSeguro) => {
    // Simular envio de recordatorio por WhatsApp
    const message = encodeURIComponent(`Hola ${cobranza.nombreApellido}, le recordamos que tiene un pago pendiente de su poliza. Por favor comuniquese con nosotros.`)
    window.open(`https://wa.me/54${cobranza.whatsapp}?text=${message}`, "_blank")
    
    toast({
      title: "Recordatorio enviado",
      description: `Se abrio WhatsApp para enviar recordatorio a ${cobranza.nombreApellido}`,
    })
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
            <h1 className="text-2xl font-bold text-slate-800">Cobranzas de Seguros</h1>
            <p className="text-sm text-slate-500">Control de pagos mensuales de polizas</p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES.map(mes => (
                  <SelectItem key={mes} value={mes}>{mes}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600">Total</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-600">Al Dia</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.alDia}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-emerald-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-600">Aviso</p>
                  <p className="text-2xl font-bold text-amber-700">{stats.aviso}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-600">Adeuda</p>
                  <p className="text-2xl font-bold text-red-700">{stats.adeuda}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-slate-50 to-slate-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">No Responde</p>
                  <p className="text-2xl font-bold text-slate-700">{stats.noResponde}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-slate-300" />
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
                  placeholder="Buscar por nombre, patente o telefono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Select value={selectedAseguradora} onValueChange={setSelectedAseguradora}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Aseguradora" />
                  </SelectTrigger>
                  <SelectContent>
                    {aseguradoras.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedEstado} onValueChange={setSelectedEstado}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="al_dia">Al Dia</SelectItem>
                    <SelectItem value="aviso">Aviso</SelectItem>
                    <SelectItem value="adeuda">Adeuda</SelectItem>
                    <SelectItem value="no_responde">No Responde</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedDiaVto} onValueChange={setSelectedDiaVto}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Dia Vto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(dia => (
                      <SelectItem key={dia} value={dia.toString()}>Dia {dia}</SelectItem>
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
            <CardTitle className="text-lg">Cobranzas ({filteredCobranzas.length})</CardTitle>
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
                      <TableHead>Cliente</TableHead>
                      <TableHead>Aseg.</TableHead>
                      <TableHead>Patente</TableHead>
                      <TableHead>Vto</TableHead>
                      <TableHead className="text-center">Oct</TableHead>
                      <TableHead className="text-center">Nov</TableHead>
                      <TableHead className="text-center">Dic</TableHead>
                      <TableHead className="text-center">Ene</TableHead>
                      <TableHead className="text-center">Feb</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCobranzas.map((cobranza) => (
                      <TableRow key={cobranza.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{cobranza.nombreApellido}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {cobranza.whatsapp}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{cobranza.aseguradora}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{cobranza.patente}</TableCell>
                        <TableCell className="text-sm">{cobranza.diaVto}</TableCell>
                        <TableCell className="text-center">{getPagoBadge(cobranza.pagos["OCTUBRE"] || "")}</TableCell>
                        <TableCell className="text-center">{getPagoBadge(cobranza.pagos["NOVIEMBRE"] || "")}</TableCell>
                        <TableCell className="text-center">{getPagoBadge(cobranza.pagos["DICIEMBRE"] || "")}</TableCell>
                        <TableCell className="text-center">{getPagoBadge(cobranza.pagos["ENERO"] || "")}</TableCell>
                        <TableCell className="text-center">{getPagoBadge(cobranza.pagos["FEBRERO"] || "")}</TableCell>
                        <TableCell>{getEstadoBadge(cobranza.estadoActual)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRegisterPayment(cobranza)}
                              title="Registrar pago"
                            >
                              <DollarSign className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleSendReminder(cobranza)}
                              title="Enviar recordatorio"
                            >
                              <Send className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setSelectedCobranza(cobranza)
                                setIsDetailOpen(true)
                              }}
                              title="Ver detalle"
                            >
                              <Eye className="h-4 w-4" />
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

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Registrar Pago
            </DialogTitle>
            <DialogDescription>
              Registrar pago para {selectedCobranza?.nombreApellido}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Mes</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map(mes => (
                      <SelectItem key={mes} value={mes}>{mes}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Aseguradora</label>
                <Input value={selectedCobranza?.aseguradora || ""} disabled className="mt-1" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Patente / Riesgo</label>
              <Input value={selectedCobranza?.patente || ""} disabled className="mt-1" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePayment} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Cobranza</DialogTitle>
            <DialogDescription>
              Historial de pagos de {selectedCobranza?.nombreApellido}
            </DialogDescription>
          </DialogHeader>

          {selectedCobranza && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Aseguradora</p>
                  <p className="font-medium">{selectedCobranza.aseguradora}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Patente</p>
                  <p className="font-medium font-mono">{selectedCobranza.patente}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Dia de Vencimiento</p>
                  <p className="font-medium">{selectedCobranza.diaVto}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">WhatsApp</p>
                  <p className="font-medium">{selectedCobranza.whatsapp}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-slate-700 mb-3">Historial de Pagos</p>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(selectedCobranza.pagos).map(([mes, estado]) => (
                    <div key={mes} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                      <span className="text-xs text-slate-500">{mes.slice(0, 3)}</span>
                      {getPagoBadge(estado)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
