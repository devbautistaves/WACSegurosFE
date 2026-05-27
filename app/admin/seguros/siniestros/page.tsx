"use client"

import { useEffect, useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { MonthNavigator } from "@/components/ui/month-navigator"
import { segurosAPI, Siniestro } from "@/lib/api"
import { AlertTriangle, Plus, Search, Edit2, Trash2, X, Clock, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const ASEGURADORAS = [
  "LA_CAJA", "MERCANTIL_ANDINA", "SAN_CRISTOBAL", "SANCOR", "ALLIANZ",
  "ZURICH", "GALICIA", "LA_PERSEVERANCIA", "ATM", "BERKLEY",
  "RIVADAVIA", "MAPFRE", "NACION", "INTEGRITY", "PROVIDENCIA", "PROF", "OTRA",
]
const BIENES = ["AUTO", "MOTO", "BICICLETA", "HOGAR", "CELULAR", "OTRO"]
const TIPOS_SIN = [
  "ROBO_TOTAL", "ROBO_PARCIAL", "DAÑO_TOTAL", "CHOQUE_ACCIDENTE",
  "CRISTALES", "INCENDIO", "GRANIZO", "OTRO",
]
const TIPO_LABELS: Record<string, string> = {
  ROBO_TOTAL: "Robo Total", ROBO_PARCIAL: "Robo Parcial", DAÑO_TOTAL: "Daño Total",
  CHOQUE_ACCIDENTE: "Choque/Accidente", CRISTALES: "Cristales", INCENDIO: "Incendio",
  GRANIZO: "Granizo", OTRO: "Otro",
}
const ASEG_LABELS: Record<string, string> = {
  LA_CAJA: "La Caja", MERCANTIL_ANDINA: "Mercantil Andina", SAN_CRISTOBAL: "San Cristóbal",
  SANCOR: "Sancor", ALLIANZ: "Allianz", ZURICH: "Zurich", GALICIA: "Galicia",
  LA_PERSEVERANCIA: "La Perseverancia", ATM: "ATM", BERKLEY: "Berkley",
  RIVADAVIA: "Rivadavia", MAPFRE: "Mapfre", NACION: "Nación", INTEGRITY: "Integrity",
  PROVIDENCIA: "Providencia", PROF: "Prof", OTRA: "Otra",
}

function estadoBadge(estado: string) {
  switch (estado) {
    case "EN_TRAMITE":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-500"><Clock className="h-3 w-3" />En Trámite</span>
    case "FINALIZADO":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-500"><CheckCircle2 className="h-3 w-3" />Finalizado</span>
    default:
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-500"><XCircle className="h-3 w-3" />Rechazado</span>
  }
}

const EMPTY: Partial<Siniestro> = {
  asegurado: "", estado: "EN_TRAMITE", denunciaAdministrativa: "PENDIENTE",
  numPoliza: "", compania: "", numeroSiniestro: "", observaciones: "",
}

export default function SiniestrosPage() {
  const [siniestros, setSiniestros] = useState<Siniestro[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [estadoFilter, setEstadoFilter] = useState("all")
  const [companiaFilter, setCompaniaFilter] = useState("all")
  const [tipoFilter, setTipoFilter] = useState("all")
  const [filterYear, setFilterYear] = useState<number | null>(null)
  const [filterMonth, setFilterMonth] = useState<number | null>(null) // 0-indexed
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<Siniestro | null>(null)
  const [formData, setFormData] = useState<Partial<Siniestro>>(EMPTY)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const fetchSiniestros = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    setIsLoading(true)
    try {
      const params: Record<string, string> = {}
      if (estadoFilter !== "all") params.estado = estadoFilter
      if (companiaFilter !== "all") params.compania = companiaFilter
      if (tipoFilter !== "all") params.tipoSiniestro = tipoFilter
      if (search.trim()) params.search = search.trim()
      if (filterYear !== null && filterMonth !== null) {
        params.year  = String(filterYear)
        params.month = String(filterMonth + 1)
      }
      const res = await segurosAPI.getSiniestros(token, params)
      setSiniestros(res.siniestros)
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los siniestros", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchSiniestros() }, [estadoFilter, companiaFilter, tipoFilter, filterYear, filterMonth])

  const enTramite = siniestros.filter(s => s.estado === "EN_TRAMITE").length
  const finalizados = siniestros.filter(s => s.estado === "FINALIZADO").length

  const hasFilters = estadoFilter !== "all" || companiaFilter !== "all" || tipoFilter !== "all" || search.trim() !== ""
  const clearFilters = () => { setEstadoFilter("all"); setCompaniaFilter("all"); setTipoFilter("all"); setSearch("") }

  const openCreate = () => { setSelected(null); setFormData(EMPTY); setIsDialogOpen(true) }
  const openEdit = (s: Siniestro) => { setSelected(s); setFormData({ ...s }); setIsDialogOpen(true) }

  const f = (key: keyof Siniestro) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData(p => ({ ...p, [key]: e.target.value }))

  const handleSubmit = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    if (!formData.asegurado?.trim()) {
      toast({ title: "Error", description: "El nombre del asegurado es requerido", variant: "destructive" }); return
    }
    setIsSubmitting(true)
    try {
      if (selected) {
        await segurosAPI.updateSiniestro(token, selected._id, formData)
        toast({ title: "Siniestro actualizado" })
      } else {
        await segurosAPI.createSiniestro(token, formData)
        toast({ title: "Siniestro creado" })
      }
      setIsDialogOpen(false)
      fetchSiniestros()
    } catch {
      toast({ title: "Error", description: "No se pudo guardar", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const token = localStorage.getItem("token")
    if (!token || !selected) return
    try {
      await segurosAPI.deleteSiniestro(token, selected._id)
      toast({ title: "Siniestro eliminado" })
      setIsDeleteOpen(false)
      fetchSiniestros()
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" })
    }
  }

  return (
    <DashboardLayout requiredRole={["admin", "admin_seguros"]}>
      <div>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              Gestión de Siniestros
            </h1>
            <p className="text-muted-foreground">{siniestros.length} siniestros — {enTramite} en trámite</p>
          </div>
          <Button onClick={openCreate} className="bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Siniestro
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
                  onChange={(y, m) => { setFilterYear(y); setFilterMonth(m) }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Mostrando todos los siniestros</p>
              )}
              <button
                onClick={() => {
                  const now = new Date()
                  if (filterYear !== null) { setFilterYear(null); setFilterMonth(null) }
                  else { setFilterYear(now.getFullYear()); setFilterMonth(now.getMonth()) }
                }}
                className="text-xs text-amber-500 hover:underline"
              >
                {filterYear !== null ? "Ver todos" : "Filtrar por mes"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "En Trámite", value: enTramite, color: "text-amber-500", bg: "bg-amber-500/10", icon: Clock, filter: "EN_TRAMITE" },
            { label: "Finalizados", value: finalizados, color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckCircle2, filter: "FINALIZADO" },
            { label: "Total", value: siniestros.length, color: "text-blue-500", bg: "bg-blue-500/10", icon: AlertTriangle, filter: "all" },
          ].map(s => (
            <Card
              key={s.label}
              onClick={() => setEstadoFilter(prev => prev === s.filter ? "all" : s.filter)}
              className={cn(
                "border-border/50 bg-card/50 cursor-pointer transition-all hover:ring-1 hover:ring-border",
                estadoFilter === s.filter && s.filter !== "all" && "ring-2 ring-amber-500/50"
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
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Asegurado, N° póliza, N° siniestro..." value={search}
                  onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchSiniestros()}
                  className="pl-9 bg-secondary/50" />
              </div>
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger className="w-full sm:w-[160px] bg-secondary/50"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="EN_TRAMITE">En Trámite</SelectItem>
                  <SelectItem value="FINALIZADO">Finalizado</SelectItem>
                  <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={companiaFilter} onValueChange={setCompaniaFilter}>
                <SelectTrigger className="w-full sm:w-[140px] bg-secondary/50"><SelectValue placeholder="Compañía" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {ASEGURADORAS.map(a => <SelectItem key={a} value={a}>{ASEG_LABELS[a] || a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-secondary/50"><SelectValue placeholder="Tipo siniestro" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {TIPOS_SIN.map(t => <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="default" size="sm" onClick={fetchSiniestros} className="bg-amber-600 hover:bg-amber-700">
                <Search className="h-4 w-4" />
              </Button>
              {hasFilters && <Button variant="ghost" size="icon" onClick={clearFilters}><X className="h-4 w-4" /></Button>}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader><CardTitle>Siniestros ({siniestros.length})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-amber-500" /></div>
            ) : siniestros.length === 0 ? (
              <div className="py-16 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No se encontraron siniestros</p>
                {hasFilters && <Button variant="link" onClick={clearFilters}>Limpiar filtros</Button>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-3 px-3 font-medium">Asegurado</th>
                      <th className="text-left py-3 px-3 font-medium">N° Póliza</th>
                      <th className="text-left py-3 px-3 font-medium">Tipo Siniestro</th>
                      <th className="text-left py-3 px-3 font-medium">Bien Asegurado</th>
                      <th className="text-left py-3 px-3 font-medium">Compañía</th>
                      <th className="text-left py-3 px-3 font-medium hidden md:table-cell">N° Siniestro</th>
                      <th className="text-left py-3 px-3 font-medium hidden md:table-cell">Denuncia</th>
                      <th className="text-left py-3 px-3 font-medium hidden lg:table-cell">Fecha Ocurrencia</th>
                      <th className="text-left py-3 px-3 font-medium">Estado</th>
                      <th className="text-left py-3 px-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siniestros.map(s => (
                      <tr key={s._id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-3 font-medium">{s.asegurado}</td>
                        <td className="py-3 px-3 font-mono text-xs">{s.numPoliza || "—"}</td>
                        <td className="py-3 px-3">{s.tipoSiniestro ? (TIPO_LABELS[s.tipoSiniestro] || s.tipoSiniestro) : "—"}</td>
                        <td className="py-3 px-3">{s.bienAsegurado || "—"}</td>
                        <td className="py-3 px-3">{s.compania ? (ASEG_LABELS[s.compania] || s.compania) : "—"}</td>
                        <td className="py-3 px-3 hidden md:table-cell font-mono text-xs">{s.numeroSiniestro || "—"}</td>
                        <td className="py-3 px-3 hidden md:table-cell">
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium",
                            s.denunciaAdministrativa === "REALIZADA"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-amber-500/10 text-amber-500")}>
                            {s.denunciaAdministrativa === "REALIZADA" ? "Realizada" : "Pendiente"}
                          </span>
                        </td>
                        <td className="py-3 px-3 hidden lg:table-cell text-xs text-muted-foreground">
                          {s.fechaOcurrencia ? new Date(s.fechaOcurrencia).toLocaleDateString("es-AR") : "—"}
                        </td>
                        <td className="py-3 px-3">{estadoBadge(s.estado)}</td>
                        <td className="py-3 px-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit2 className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                              onClick={() => { setSelected(s); setIsDeleteOpen(true) }}><Trash2 className="h-4 w-4" /></Button>
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

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[92dvh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>{selected ? "Editar Siniestro" : "Nuevo Siniestro"}</DialogTitle>
            <DialogDescription>Completá los datos del siniestro</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-2">
            <FieldGroup>
              <Field>
                <FieldLabel>Asegurado *</FieldLabel>
                <Input value={formData.asegurado || ""} onChange={f("asegurado")} placeholder="APELLIDO NOMBRE" className="bg-secondary/50" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>N° Póliza</FieldLabel>
                  <Input value={formData.numPoliza || ""} onChange={f("numPoliza")} placeholder="Número de póliza" className="bg-secondary/50" />
                </Field>
                <Field>
                  <FieldLabel>N° Siniestro</FieldLabel>
                  <Input value={formData.numeroSiniestro || ""} onChange={f("numeroSiniestro")} placeholder="Número de siniestro" className="bg-secondary/50" />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Compañía</FieldLabel>
                  <Select value={formData.compania || ""} onValueChange={v => setFormData(p => ({ ...p, compania: v }))}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>{ASEGURADORAS.map(a => <SelectItem key={a} value={a}>{ASEG_LABELS[a] || a}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Bien Asegurado</FieldLabel>
                  <Select value={formData.bienAsegurado || ""} onValueChange={v => setFormData(p => ({ ...p, bienAsegurado: v as any }))}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>{BIENES.map(b => <SelectItem key={b} value={b}>{b.charAt(0) + b.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Tipo de Siniestro</FieldLabel>
                  <Select value={formData.tipoSiniestro || ""} onValueChange={v => setFormData(p => ({ ...p, tipoSiniestro: v as any }))}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>{TIPOS_SIN.map(t => <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Fecha de Ocurrencia</FieldLabel>
                  <Input type="date" value={formData.fechaOcurrencia ? String(formData.fechaOcurrencia).substring(0, 10) : ""} onChange={f("fechaOcurrencia")} className="bg-secondary/50" />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Estado</FieldLabel>
                  <Select value={formData.estado || "EN_TRAMITE"} onValueChange={v => setFormData(p => ({ ...p, estado: v as any }))}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EN_TRAMITE">En Trámite</SelectItem>
                      <SelectItem value="FINALIZADO">Finalizado</SelectItem>
                      <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Denuncia Administrativa</FieldLabel>
                  <Select value={formData.denunciaAdministrativa || "PENDIENTE"} onValueChange={v => setFormData(p => ({ ...p, denunciaAdministrativa: v as any }))}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                      <SelectItem value="REALIZADA">Realizada</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field>
                <FieldLabel>Observaciones</FieldLabel>
                <Textarea value={formData.observaciones || ""} onChange={f("observaciones")} placeholder="Notas del siniestro..." rows={3} className="bg-secondary/50" />
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50 shrink-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white">
              {isSubmitting ? <><Spinner className="mr-2 h-4 w-4" />Guardando...</> : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Siniestro</AlertDialogTitle>
            <AlertDialogDescription>¿Eliminás el siniestro de <strong>{selected?.asegurado}</strong>? Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
