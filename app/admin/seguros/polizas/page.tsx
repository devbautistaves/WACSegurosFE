"use client"

import { useEffect, useState, Suspense, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { MonthNavigator } from "@/components/ui/month-navigator"
import { segurosAPI, Poliza } from "@/lib/api"
import { buscarLocalidad, type LocalidadAR } from "@/lib/localidades-ar"
import {
  Shield, Plus, Search, Filter, Edit2, Trash2, X, CheckCircle2,
  XCircle, Clock, Car, Bike, Home, User, Banknote, ChevronLeft, ChevronRight,
  Loader2, UserCheck, MapPin,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ASEGURADORAS = [
  "LA_CAJA", "MERCANTIL_ANDINA", "SAN_CRISTOBAL", "SANCOR", "ALLIANZ",
  "ZURICH", "GALICIA", "LA_PERSEVERANCIA", "ATM", "BERKLEY",
  "RIVADAVIA", "MAPFRE", "NACION", "INTEGRITY", "PROVIDENCIA", "PROF", "OTRA",
]
const RAMOS = [
  "AUTOS", "MOTOS", "HOGAR", "INCENDIO", "INT_COMERCIO",
  "ART", "ACC_PERSONALES", "VIDA", "RESP_CIVIL", "OBJ_ESPECIFICOS",
  "FLOTA_AUTOMOTOR", "OTRO",
]
const ESTADOS = ["VIGENTE", "ANULADA", "PENDIENTE_CLIENTE"]
const MEDIOS_PAGO = ["TARJ_CRED", "CBU", "CUPON", "OTRO"]

const RAMO_LABELS: Record<string, string> = {
  AUTOS: "Autos", MOTOS: "Motos", HOGAR: "Hogar", INCENDIO: "Incendio",
  INT_COMERCIO: "Int. Comercio", ART: "ART", ACC_PERSONALES: "Acc. Personales",
  VIDA: "Vida", RESP_CIVIL: "Resp. Civil", OBJ_ESPECIFICOS: "Obj. Específicos",
  FLOTA_AUTOMOTOR: "Flota Automotor", OTRO: "Otro",
}
const ASEGURADORA_LABELS: Record<string, string> = {
  LA_CAJA: "La Caja", MERCANTIL_ANDINA: "Mercantil Andina", SAN_CRISTOBAL: "San Cristóbal",
  SANCOR: "Sancor", ALLIANZ: "Allianz", ZURICH: "Zurich", GALICIA: "Galicia",
  LA_PERSEVERANCIA: "La Perseverancia", ATM: "ATM", BERKLEY: "Berkley",
  RIVADAVIA: "Rivadavia", MAPFRE: "Mapfre", NACION: "Nación", INTEGRITY: "Integrity",
  PROVIDENCIA: "Providencia", PROF: "Prof", OTRA: "Otra",
}
const MEDIO_LABELS: Record<string, string> = {
  TARJ_CRED: "Tarj. Crédito", CBU: "CBU", EFECTIVO: "Efectivo", CUPON: "Cupón/Efectivo", OTRO: "Otro",
}

function estadoBadge(estado: string) {
  switch (estado) {
    case "VIGENTE": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-500"><CheckCircle2 className="h-3 w-3" />Vigente</span>
    case "ANULADA": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-500"><XCircle className="h-3 w-3" />Anulada</span>
    default: return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-500"><Clock className="h-3 w-3" />Pend. Cliente</span>
  }
}

function ramoBadge(ramo?: string) {
  if (!ramo) return null
  const colors: Record<string, string> = {
    AUTOS: "bg-blue-500/10 text-blue-500",
    MOTOS: "bg-purple-500/10 text-purple-500",
    HOGAR: "bg-orange-500/10 text-orange-500",
    INCENDIO: "bg-red-500/10 text-red-500",
    INT_COMERCIO: "bg-yellow-500/10 text-yellow-600",
    ART: "bg-pink-500/10 text-pink-500",
    ACC_PERSONALES: "bg-teal-500/10 text-teal-500",
    VIDA: "bg-green-500/10 text-green-500",
    RESP_CIVIL: "bg-indigo-500/10 text-indigo-500",
    OBJ_ESPECIFICOS: "bg-cyan-500/10 text-cyan-500",
    FLOTA_AUTOMOTOR: "bg-violet-500/10 text-violet-500",
    OTRO: "bg-gray-500/10 text-gray-500",
  }
  return <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", colors[ramo] || "bg-gray-500/10 text-gray-500")}>{RAMO_LABELS[ramo] || ramo}</span>
}

const EMPTY_FORM: Partial<Poliza> = {
  medioDePago: "CUPON", estado: "VIGENTE", gnc: false,
  nombreApellido: "", patente: "", aseguradora: undefined, ramo: undefined,
  tipoCobertura: "", numPoliza: "", dni: "", celular: "", email: "",
  domicilio: "", localidad: "", cp: "", datosRiesgo: "",
}

const PAGE_SIZE = 50

function PolizasPageInner() {
  const searchParams = useSearchParams()

  const [polizas, setPolizas] = useState<Poliza[]>([])
  const [total, setTotal] = useState(0)
  const [globalStats, setGlobalStats] = useState({ vigentes: 0, anuladas: 0, pendientes: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)

  // Month filter — seeded from URL ?year=&month= (month is 1-indexed in URL)
  const [filterYear, setFilterYear] = useState<number | null>(() => {
    const y = searchParams.get("year"); return y ? parseInt(y) : null
  })
  const [filterMonth, setFilterMonth] = useState<number | null>(() => {
    const m = searchParams.get("month"); return m ? parseInt(m) - 1 : null
  })

  // Filters — seeded from URL params
  const [search, setSearch] = useState("")
  const [estadoFilter, setEstadoFilter] = useState(() => searchParams.get("estado") || "all")
  const [aseguradoraFilter, setAseguradoraFilter] = useState(() => searchParams.get("aseguradora") || "all")
  const [ramoFilter, setRamoFilter] = useState(() => searchParams.get("ramo") || "all")

  // Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedPoliza, setSelectedPoliza] = useState<Poliza | null>(null)
  const [formData, setFormData] = useState<Partial<Poliza>>(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Autocomplete de asegurados (solo en creación)
  type AseguradoSug = Awaited<ReturnType<typeof segurosAPI.buscarAsegurados>>["asegurados"][number]
  const [aseguradoSugs, setAseguradoSugs] = useState<AseguradoSug[]>([])
  const [aseguradoLoading, setAseguradoLoading] = useState(false)
  const [aseguradoOpen, setAseguradoOpen] = useState(false)
  const [aseguradoFromPick, setAseguradoFromPick] = useState(false)
  const aseguradoBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (selectedPoliza) return
    if (aseguradoFromPick) { setAseguradoFromPick(false); return }
    const q = (formData.nombreApellido || "").trim()
    if (q.length < 2) { setAseguradoSugs([]); setAseguradoOpen(false); return }
    const token = localStorage.getItem("token")
    if (!token) return
    const t = setTimeout(async () => {
      try {
        setAseguradoLoading(true)
        const res = await segurosAPI.buscarAsegurados(token, q, 8)
        setAseguradoSugs(res.asegurados || [])
        setAseguradoOpen((res.asegurados || []).length > 0)
      } catch { /* silenciar */ }
      finally { setAseguradoLoading(false) }
    }, 280)
    return () => clearTimeout(t)
  }, [formData.nombreApellido, selectedPoliza, aseguradoFromPick])

  const pickAsegurado = (a: AseguradoSug) => {
    setAseguradoFromPick(true)
    setFormData(prev => ({
      ...prev,
      nombreApellido: a.nombreApellido || prev.nombreApellido,
      dni: a.dni || prev.dni,
      fechaNacimiento: a.fechaNacimiento || prev.fechaNacimiento,
      celular: a.celular || prev.celular,
      email: a.email || prev.email,
      domicilio: a.domicilio || prev.domicilio,
      localidad: a.localidad || prev.localidad,
      cp: a.cp || prev.cp,
    }))
    setAseguradoOpen(false)
    setAseguradoSugs([])
  }

  // Autocomplete de Localidad → autocompleta CP. Dataset local (sin requests).
  const [localidadSugs, setLocalidadSugs] = useState<LocalidadAR[]>([])
  const [localidadOpen, setLocalidadOpen] = useState(false)
  const [localidadFromPick, setLocalidadFromPick] = useState(false)
  const localidadBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (localidadFromPick) { setLocalidadFromPick(false); return }
    const q = (formData.localidad || "").trim()
    if (q.length < 2) { setLocalidadSugs([]); setLocalidadOpen(false); return }
    const results = buscarLocalidad(q, 8)
    setLocalidadSugs(results)
    setLocalidadOpen(results.length > 0)
  }, [formData.localidad, localidadFromPick])

  const pickLocalidad = (loc: LocalidadAR) => {
    setLocalidadFromPick(true)
    setFormData(prev => ({
      ...prev,
      localidad: loc.nombre,
      cp: loc.cp,
    }))
    setLocalidadOpen(false)
    setLocalidadSugs([])
  }

  const { toast } = useToast()

  const fetchPolizas = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    setIsLoading(true)
    try {
      const params: Record<string, string> = { limit: String(PAGE_SIZE), page: String(page) }
      if (estadoFilter !== "all") params.estado = estadoFilter
      if (aseguradoraFilter !== "all") params.aseguradora = aseguradoraFilter
      if (ramoFilter !== "all") params.ramo = ramoFilter
      if (search.trim()) params.search = search.trim()
      if (filterYear !== null && filterMonth !== null) {
        params.year  = String(filterYear)
        params.month = String(filterMonth + 1) // convert 0-indexed to 1-indexed
      }
      const res = await segurosAPI.getPolizas(token, params)
      setPolizas(res.polizas)
      setTotal(res.total)
      if (res.stats) setGlobalStats(res.stats)
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar las pólizas", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchPolizas() }, [page, estadoFilter, aseguradoraFilter, ramoFilter, filterYear, filterMonth])

  const handleSearch = () => { setPage(1); fetchPolizas() }

  const hasFilters = estadoFilter !== "all" || aseguradoraFilter !== "all" || ramoFilter !== "all" || search.trim() !== ""
  const clearFilters = () => { setEstadoFilter("all"); setAseguradoraFilter("all"); setRamoFilter("all"); setSearch(""); setPage(1) }

  const openCreate = () => { setSelectedPoliza(null); setFormData(EMPTY_FORM); setIsDialogOpen(true) }
  const openEdit = (p: Poliza) => { setSelectedPoliza(p); setFormData({ ...p }); setIsDialogOpen(true) }

  const handleSubmit = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    if (!formData.nombreApellido?.trim()) {
      toast({ title: "Error", description: "El nombre del asegurado es requerido", variant: "destructive" }); return
    }
    setIsSubmitting(true)
    try {
      if (selectedPoliza) {
        const res = await segurosAPI.updatePoliza(token, selectedPoliza._id, formData)
        toast({
          title: "Póliza actualizada",
          description: res.cobranzaCreada ? "Se generó el registro de cobranza automáticamente." : undefined,
        })
      } else {
        const res = await segurosAPI.createPoliza(token, formData)
        toast({
          title: "Póliza creada",
          description: res.cobranzaCreada ? "Se generó el registro de cobranza automáticamente." : undefined,
        })
      }
      setIsDialogOpen(false)
      fetchPolizas()
    } catch {
      toast({ title: "Error", description: "No se pudo guardar la póliza", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const token = localStorage.getItem("token")
    if (!token || !selectedPoliza) return
    try {
      await segurosAPI.deletePoliza(token, selectedPoliza._id)
      toast({ title: "Póliza eliminada" })
      setIsDeleteOpen(false)
      fetchPolizas()
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" })
    }
  }

  const field = (key: keyof Poliza) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(prev => ({ ...prev, [key]: e.target.value }))

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <DashboardLayout requiredRole={["admin", "admin_seguros"]}>
      <div>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-8 w-8 text-emerald-500" />
              Gestión de Pólizas
            </h1>
            <p className="text-muted-foreground">{total} pólizas encontradas</p>
          </div>
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Póliza
          </Button>
        </div>

        {/* Month filter */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {filterYear !== null && filterMonth !== null ? (
                <MonthNavigator
                  year={filterYear}
                  month={filterMonth}
                  onChange={(y, m) => { setFilterYear(y); setFilterMonth(m); setPage(1) }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Mostrando todas las pólizas</p>
              )}
              <button
                onClick={() => {
                  const now = new Date()
                  if (filterYear !== null) { setFilterYear(null); setFilterMonth(null) }
                  else { setFilterYear(now.getFullYear()); setFilterMonth(now.getMonth()) }
                  setPage(1)
                }}
                className="text-xs text-emerald-500 hover:underline"
              >
                {filterYear !== null ? "Ver todas" : "Filtrar por mes"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Vigentes", value: globalStats.vigentes, color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckCircle2, filter: "VIGENTE" },
            { label: "Anuladas", value: globalStats.anuladas, color: "text-red-500", bg: "bg-red-500/10", icon: XCircle, filter: "ANULADA" },
            { label: "Pend. Cliente", value: globalStats.pendientes, color: "text-amber-500", bg: "bg-amber-500/10", icon: Clock, filter: "PENDIENTE_CLIENTE" },
          ].map((s) => (
            <Card
              key={s.label}
              onClick={() => { setEstadoFilter(prev => prev === s.filter ? "all" : s.filter); setPage(1) }}
              className={cn(
                "border-border/50 bg-card/50 cursor-pointer transition-all hover:ring-1 hover:ring-border",
                estadoFilter === s.filter && "ring-2 ring-emerald-500/50"
              )}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", s.bg)}>
                  <s.icon className={cn("h-5 w-5", s.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre, patente, N° póliza, DNI..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  className="pl-9 bg-secondary/50"
                />
              </div>
              <Select value={estadoFilter} onValueChange={v => { setEstadoFilter(v); setPage(1) }}>
                <SelectTrigger className="w-full sm:w-[160px] bg-secondary/50"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="VIGENTE">Vigente</SelectItem>
                  <SelectItem value="ANULADA">Anulada</SelectItem>
                  <SelectItem value="PENDIENTE_CLIENTE">Pendiente Cliente</SelectItem>
                </SelectContent>
              </Select>
              <Select value={aseguradoraFilter} onValueChange={v => { setAseguradoraFilter(v); setPage(1) }}>
                <SelectTrigger className="w-full sm:w-[150px] bg-secondary/50"><SelectValue placeholder="Aseguradora" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {ASEGURADORAS.map(a => <SelectItem key={a} value={a}>{ASEGURADORA_LABELS[a] || a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={ramoFilter} onValueChange={v => { setRamoFilter(v); setPage(1) }}>
                <SelectTrigger className="w-full sm:w-[150px] bg-secondary/50"><SelectValue placeholder="Ramo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los ramos</SelectItem>
                  {RAMOS.map(r => <SelectItem key={r} value={r}>{RAMO_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="default" size="sm" onClick={handleSearch} className="bg-emerald-600 hover:bg-emerald-700">
                <Search className="h-4 w-4" />
              </Button>
              {hasFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpiar filtros">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Pólizas ({total})</span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2 text-sm font-normal">
                  <Button variant="ghost" size="icon" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-muted-foreground">Pág. {page} / {totalPages}</span>
                  <Button variant="ghost" size="icon" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-emerald-500" /></div>
            ) : polizas.length === 0 ? (
              <div className="py-16 text-center">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No se encontraron pólizas</p>
                {hasFilters && <Button variant="link" onClick={clearFilters}>Limpiar filtros</Button>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-3 px-3 font-medium">Asegurado</th>
                      <th className="text-left py-3 px-3 font-medium">Patente / Riesgo</th>
                      <th className="text-left py-3 px-3 font-medium">Aseguradora</th>
                      <th className="text-left py-3 px-3 font-medium">Ramo</th>
                      <th className="text-left py-3 px-3 font-medium hidden md:table-cell">Cobertura</th>
                      <th className="text-left py-3 px-3 font-medium hidden lg:table-cell">N° Póliza</th>
                      <th className="text-left py-3 px-3 font-medium hidden xl:table-cell">Medio Pago</th>
                      <th className="text-left py-3 px-3 font-medium">Estado</th>
                      <th className="text-left py-3 px-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {polizas.map(p => (
                      <tr key={p._id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-3">
                          <p className="font-medium">{p.nombreApellido}</p>
                          {p.dni && <p className="text-xs text-muted-foreground">DNI: {p.dni}</p>}
                          {p.celular && <p className="text-xs text-muted-foreground">{p.celular}</p>}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-mono font-medium">{p.patente || "—"}</p>
                          {p.localidad && <p className="text-xs text-muted-foreground">{p.localidad}</p>}
                        </td>
                        <td className="py-3 px-3 font-medium">{p.aseguradora ? (ASEGURADORA_LABELS[p.aseguradora] || p.aseguradora) : "—"}</td>
                        <td className="py-3 px-3">{ramoBadge(p.ramo)}</td>
                        <td className="py-3 px-3 hidden md:table-cell">
                          <p className="text-xs max-w-[180px] truncate" title={p.tipoCobertura}>{p.tipoCobertura || "—"}</p>
                        </td>
                        <td className="py-3 px-3 hidden lg:table-cell font-mono text-xs">{p.numPoliza || "—"}</td>
                        <td className="py-3 px-3 hidden xl:table-cell text-xs">{p.medioDePago ? (MEDIO_LABELS[p.medioDePago] || p.medioDePago) : "—"}</td>
                        <td className="py-3 px-3">{estadoBadge(p.estado)}</td>
                        <td className="py-3 px-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                              onClick={() => { setSelectedPoliza(p); setIsDeleteOpen(true) }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[680px] flex flex-col max-h-[92dvh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>{selectedPoliza ? "Editar Póliza" : "Nueva Póliza"}</DialogTitle>
            <DialogDescription>Completá los datos del asegurado y la cobertura</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-2">
            <FieldGroup>
              {/* Fila 1: Estado + Medio de Pago */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Estado</FieldLabel>
                  <Select value={formData.estado || "VIGENTE"} onValueChange={v => setFormData(p => ({ ...p, estado: v as any }))}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIGENTE">Vigente</SelectItem>
                      <SelectItem value="ANULADA">Anulada</SelectItem>
                      <SelectItem value="PENDIENTE_CLIENTE">Pendiente Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Medio de Pago</FieldLabel>
                  <Select value={formData.medioDePago || "EFECTIVO"} onValueChange={v => setFormData(p => ({ ...p, medioDePago: v }))}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>{MEDIOS_PAGO.map(m => <SelectItem key={m} value={m}>{MEDIO_LABELS[m] || m}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>

              {formData.estado === "ANULADA" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Motivo de Anulación</FieldLabel>
                    <Input value={formData.motivoAnulacion || ""} onChange={field("motivoAnulacion")} placeholder="Ej: Falta de pago" className="bg-secondary/50" />
                  </Field>
                  <Field>
                    <FieldLabel>Fecha de Anulación</FieldLabel>
                    <Input type="date" value={formData.fechaAnulacion ? String(formData.fechaAnulacion).substring(0, 10) : ""} onChange={field("fechaAnulacion")} className="bg-secondary/50" />
                  </Field>
                </div>
              )}

              {/* Fila 2: Aseguradora + Ramo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Aseguradora</FieldLabel>
                  <Select value={formData.aseguradora || ""} onValueChange={v => setFormData(p => ({ ...p, aseguradora: v as any }))}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>{ASEGURADORAS.map(a => <SelectItem key={a} value={a}>{ASEGURADORA_LABELS[a] || a}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Ramo</FieldLabel>
                  <Select value={formData.ramo || ""} onValueChange={v => setFormData(p => ({ ...p, ramo: v as any }))}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>{RAMOS.map(r => <SelectItem key={r} value={r}>{RAMO_LABELS[r]}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>

              {/* Tipo cobertura + N° Póliza */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Tipo de Cobertura</FieldLabel>
                  <Input value={formData.tipoCobertura || ""} onChange={field("tipoCobertura")} placeholder="Ej: Todo Riesgo, RC con asistencia..." className="bg-secondary/50" />
                </Field>
                <Field>
                  <FieldLabel>N° Póliza</FieldLabel>
                  <Input value={formData.numPoliza || ""} onChange={field("numPoliza")} placeholder="Número de póliza" className="bg-secondary/50" />
                </Field>
              </div>

              {/* Patente + Fecha inicio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Patente / Identificador de Riesgo</FieldLabel>
                  <Input value={formData.patente || ""} onChange={field("patente")} placeholder="Ej: ABC123 o BICI" className="bg-secondary/50" />
                </Field>
                <Field>
                  <FieldLabel>Fecha Inicio Vigencia</FieldLabel>
                  <Input type="date" value={formData.fechaInicVig ? String(formData.fechaInicVig).substring(0, 10) : ""} onChange={field("fechaInicVig")} className="bg-secondary/50" />
                </Field>
              </div>

              <div className="border-t border-border/50 pt-4 mt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Datos del Asegurado</p>
              </div>

              <Field>
                <FieldLabel>Nombre y Apellido *</FieldLabel>
                <div className="relative">
                  <Input
                    value={formData.nombreApellido || ""}
                    onChange={field("nombreApellido")}
                    onFocus={() => { if (!selectedPoliza && aseguradoSugs.length > 0) setAseguradoOpen(true) }}
                    onBlur={() => {
                      if (aseguradoBlurTimer.current) clearTimeout(aseguradoBlurTimer.current)
                      aseguradoBlurTimer.current = setTimeout(() => setAseguradoOpen(false), 150)
                    }}
                    placeholder="APELLIDO NOMBRE"
                    className="bg-secondary/50 pr-9"
                    autoComplete="off"
                  />
                  {!selectedPoliza && aseguradoLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {!selectedPoliza && aseguradoOpen && aseguradoSugs.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 rounded-lg border border-border bg-popover shadow-xl overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-muted/40">
                        <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                        <p className="text-xs font-medium text-muted-foreground">
                          {aseguradoSugs.length} {aseguradoSugs.length === 1 ? "asegurado encontrado" : "asegurados encontrados"} — clic para autocompletar
                        </p>
                      </div>
                      <ul className="max-h-72 overflow-y-auto">
                        {aseguradoSugs.map((a, i) => (
                          <li key={`${a.dni || ""}-${a.nombreApellido}-${i}`}>
                            <button
                              type="button"
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => pickAsegurado(a)}
                              className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex items-start justify-between gap-3"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{a.nombreApellido}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {[
                                    a.dni && `DNI ${a.dni}`,
                                    a.celular && a.celular,
                                    a.email && a.email,
                                    a.localidad && a.localidad,
                                  ].filter(Boolean).join(" · ") || "Sin más datos cargados"}
                                </p>
                              </div>
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 whitespace-nowrap flex-shrink-0">
                                {a.cantPolizas} {a.cantPolizas === 1 ? "póliza" : "pólizas"}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {!selectedPoliza && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    💡 Tipeá el apellido para autocompletar datos de pólizas anteriores del mismo cliente.
                  </p>
                )}
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>DNI</FieldLabel>
                  <Input value={formData.dni || ""} onChange={field("dni")} placeholder="12345678" className="bg-secondary/50" />
                </Field>
                <Field>
                  <FieldLabel>Fecha de Nacimiento</FieldLabel>
                  <Input type="date" value={formData.fechaNacimiento ? String(formData.fechaNacimiento).substring(0, 10) : ""} onChange={field("fechaNacimiento")} className="bg-secondary/50" />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Celular</FieldLabel>
                  <Input value={formData.celular || ""} onChange={field("celular")} placeholder="1112345678" className="bg-secondary/50" />
                </Field>
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <Input type="email" value={formData.email || ""} onChange={field("email")} placeholder="cliente@email.com" className="bg-secondary/50" />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field>
                  <FieldLabel>Domicilio</FieldLabel>
                  <Input value={formData.domicilio || ""} onChange={field("domicilio")} placeholder="Calle 123" className="bg-secondary/50" />
                </Field>
                <Field>
                  <FieldLabel>Localidad</FieldLabel>
                  <div className="relative">
                    <Input
                      value={formData.localidad || ""}
                      onChange={field("localidad")}
                      onFocus={() => { if (localidadSugs.length > 0) setLocalidadOpen(true) }}
                      onBlur={() => {
                        if (localidadBlurTimer.current) clearTimeout(localidadBlurTimer.current)
                        localidadBlurTimer.current = setTimeout(() => setLocalidadOpen(false), 150)
                      }}
                      placeholder="Ej: Berazategui"
                      className="bg-secondary/50 pl-8"
                      autoComplete="off"
                    />
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    {localidadOpen && localidadSugs.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 rounded-lg border border-border bg-popover shadow-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-muted/40">
                          <MapPin className="h-3.5 w-3.5 text-blue-500" />
                          <p className="text-xs font-medium text-muted-foreground">
                            {localidadSugs.length} {localidadSugs.length === 1 ? "localidad" : "localidades"} — clic para autocompletar el CP
                          </p>
                        </div>
                        <ul className="max-h-64 overflow-y-auto">
                          {localidadSugs.map((loc, i) => (
                            <li key={`${loc.cp}-${loc.nombre}-${i}`}>
                              <button
                                type="button"
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => pickLocalidad(loc)}
                                className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center justify-between gap-3"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{loc.nombre}</p>
                                  <p className="text-[11px] text-muted-foreground truncate">{loc.provincia}</p>
                                </div>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-600 whitespace-nowrap flex-shrink-0">
                                  CP {loc.cp}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Field>
                <Field>
                  <FieldLabel>CP</FieldLabel>
                  <Input value={formData.cp || ""} onChange={field("cp")} placeholder="1234" className="bg-secondary/50" />
                </Field>
              </div>

              <div className="border-t border-border/50 pt-4 mt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Datos del Vehículo (si aplica)</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field>
                  <FieldLabel>Chasis</FieldLabel>
                  <Input value={formData.chasis || ""} onChange={field("chasis")} placeholder="N° de chasis" className="bg-secondary/50" />
                </Field>
                <Field>
                  <FieldLabel>Motor</FieldLabel>
                  <Input value={formData.motor || ""} onChange={field("motor")} placeholder="N° de motor" className="bg-secondary/50" />
                </Field>
                <Field>
                  <FieldLabel>GNC</FieldLabel>
                  <Select value={formData.gnc ? "SI" : "NO"} onValueChange={v => setFormData(p => ({ ...p, gnc: v === "SI" }))}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NO">No</SelectItem>
                      <SelectItem value="SI">Sí</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field>
                <FieldLabel>Descripción / Datos del Riesgo</FieldLabel>
                <Input value={formData.datosRiesgo || ""} onChange={field("datosRiesgo")} placeholder="Descripción adicional del riesgo" className="bg-secondary/50" />
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50 shrink-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSubmitting ? <><Spinner className="mr-2 h-4 w-4" />Guardando...</> : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Póliza</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminás la póliza de <strong>{selectedPoliza?.nombreApellido}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </DashboardLayout>
  )
}

export default function PolizasPage() {
  return (
    <Suspense fallback={null}>
      <PolizasPageInner />
    </Suspense>
  )
}
