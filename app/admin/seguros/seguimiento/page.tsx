"use client"

import { useEffect, useState, useCallback } from "react"
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
import { seguimientoAPI, Seguimiento } from "@/lib/api"
import {
  Activity, Plus, Search, Edit2, Trash2, X,
  Phone, Mail, Car, User, CheckCircle2, MessageCircle, FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Estado config ──────────────────────────────────────────────────────────────
type EstadoSeg = Seguimiento["estado"]

const ESTADO_CONFIG: Record<EstadoSeg, { label: string; color: string; bg: string }> = {
  NUEVO:      { label: "Nuevo",      color: "text-blue-500",    bg: "bg-blue-500/10"    },
  CONTACTADO: { label: "Contactado", color: "text-purple-500",  bg: "bg-purple-500/10"  },
  COTIZANDO:  { label: "Cotizando",  color: "text-amber-500",   bg: "bg-amber-500/10"   },
  EMITIDO:    { label: "Emitido",    color: "text-emerald-500", bg: "bg-emerald-500/10" },
  RECHAZADO:  { label: "Rechazado",  color: "text-red-500",     bg: "bg-red-500/10"     },
}

function EstadoBadge({ estado }: { estado: EstadoSeg | null | undefined }) {
  const cfg = estado ? (ESTADO_CONFIG[estado] ?? ESTADO_CONFIG["NUEVO"]) : ESTADO_CONFIG["NUEVO"]
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
      cfg.bg, cfg.color,
    )}>
      {cfg.label}
    </span>
  )
}

const ESTADOS: EstadoSeg[] = ["NUEVO", "CONTACTADO", "COTIZANDO", "EMITIDO", "RECHAZADO"]

const EMPTY: Partial<Seguimiento> = {
  patente: "",
  nombre: "",
  apellido: "",
  dni: "",
  email: "",
  celular: "",
  estado: "NUEVO",
  observaciones: "",
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function SeguimientoPage() {
  const [items, setItems] = useState<Seguimiento[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [estadoFilter, setEstadoFilter] = useState<"all" | EstadoSeg>("all")
  const [filterYear, setFilterYear] = useState<number | null>(null)
  const [filterMonth, setFilterMonth] = useState<number | null>(null) // 0-indexed
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<Seguimiento | null>(null)
  const [formData, setFormData] = useState<Partial<Seguimiento>>(EMPTY)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    setIsLoading(true)
    try {
      const params: Record<string, string> = {}
      if (estadoFilter !== "all") params.estado = estadoFilter
      if (search.trim()) params.search = search.trim()
      if (filterYear !== null && filterMonth !== null) {
        params.year  = String(filterYear)
        params.month = String(filterMonth + 1)
      }
      const res = await seguimientoAPI.getAll(token, params)
      setItems(res.seguimientos)
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los prospectos", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [estadoFilter, search, filterYear, filterMonth, toast])

  useEffect(() => { fetchData() }, [estadoFilter, filterYear, filterMonth])

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const countByEstado = (e: EstadoSeg) => items.filter(i => i.estado === e).length

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const hasFilters = estadoFilter !== "all" || search.trim() !== ""
  const clearFilters = () => { setEstadoFilter("all"); setSearch("") }

  const openCreate = () => { setSelected(null); setFormData(EMPTY); setIsDialogOpen(true) }
  const openEdit   = (item: Seguimiento) => { setSelected(item); setFormData({ ...item }); setIsDialogOpen(true) }
  const f = (key: keyof Seguimiento) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFormData(p => ({ ...p, [key]: e.target.value }))

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    if (!formData.nombre?.trim() && !formData.apellido?.trim() && !formData.patente?.trim()) {
      toast({ title: "Error", description: "Completá al menos nombre, apellido o patente", variant: "destructive" })
      return
    }
    setIsSubmitting(true)
    try {
      if (selected) {
        await seguimientoAPI.update(token, selected._id, formData)
        toast({ title: "Prospecto actualizado" })
      } else {
        await seguimientoAPI.create(token, formData)
        toast({ title: "Prospecto creado" })
      }
      setIsDialogOpen(false)
      fetchData()
    } catch {
      toast({ title: "Error", description: "No se pudo guardar", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    const token = localStorage.getItem("token")
    if (!token || !selected) return
    try {
      await seguimientoAPI.delete(token, selected._id)
      toast({ title: "Prospecto eliminado" })
      setIsDeleteOpen(false)
      fetchData()
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" })
    }
  }

  const fullName = (item: Seguimiento | null | undefined) =>
    item ? ([item?.nombre, item?.apellido].filter(Boolean).join(" ") || "—") : "Sin nombre"

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout requiredRole={["admin", "admin_seguros"]}>
      <div>
        <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-8 w-8 text-blue-500" />
              Seguimiento de Prospectos
            </h1>
            <p className="text-muted-foreground">{items.length} prospectos en seguimiento</p>
          </div>
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Prospecto
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
                <p className="text-sm text-muted-foreground">Mostrando todos los prospectos</p>
              )}
              <button
                onClick={() => {
                  const now = new Date()
                  if (filterYear !== null) { setFilterYear(null); setFilterMonth(null) }
                  else { setFilterYear(now.getFullYear()); setFilterMonth(now.getMonth()) }
                }}
                className="text-xs text-blue-500 hover:underline"
              >
                {filterYear !== null ? "Ver todos" : "Filtrar por mes"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {ESTADOS.map(e => {
            const cfg = ESTADO_CONFIG[e]
            const count = countByEstado(e)
            return (
              <Card
                key={e}
                className={cn(
                  "border-border/50 bg-card/50 cursor-pointer transition-all",
                  estadoFilter === e && "ring-2 ring-blue-500",
                )}
                onClick={() => setEstadoFilter(estadoFilter === e ? "all" : e)}
              >
                <CardContent className="p-4">
                  <p className={cn("text-2xl font-bold", cfg.color)}>{count}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{cfg.label}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Filters */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre, apellido, patente, celular, DNI..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && fetchData()}
                  className="pl-9 bg-secondary/50"
                />
              </div>
              <Select value={estadoFilter} onValueChange={v => setEstadoFilter(v as "all" | EstadoSeg)}>
                <SelectTrigger className="w-full sm:w-[170px] bg-secondary/50">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {ESTADOS.map(e => (
                    <SelectItem key={e} value={e}>{ESTADO_CONFIG[e].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="default" size="sm" onClick={fetchData} className="bg-blue-600 hover:bg-blue-700">
                <Search className="h-4 w-4" />
              </Button>
              {hasFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>Prospectos ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Spinner className="h-8 w-8 text-blue-500" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-16 text-center">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No hay prospectos registrados</p>
                {hasFilters && <Button variant="link" onClick={clearFilters}>Limpiar filtros</Button>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-3 px-3 font-medium">Prospecto</th>
                      <th className="text-left py-3 px-3 font-medium hidden sm:table-cell">Patente</th>
                      <th className="text-left py-3 px-3 font-medium hidden md:table-cell">Contacto</th>
                      <th className="text-left py-3 px-3 font-medium hidden lg:table-cell">Observaciones</th>
                      <th className="text-left py-3 px-3 font-medium">Estado</th>
                      <th className="text-left py-3 px-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item._id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        {/* Nombre + DNI */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                              <User className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                              <div className="font-medium">{fullName(item)}</div>
                              {item.dni && (
                                <div className="text-xs text-muted-foreground">DNI {item.dni}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Patente */}
                        <td className="py-3 px-3 hidden sm:table-cell">
                          {item.patente ? (
                            <span className="inline-flex items-center gap-1 font-mono text-xs uppercase bg-secondary/60 px-2 py-0.5 rounded">
                              <Car className="h-3 w-3" />
                              {item.patente}
                            </span>
                          ) : "—"}
                        </td>
                        {/* Contacto */}
                        <td className="py-3 px-3 hidden md:table-cell">
                          <div className="space-y-0.5">
                            {item.celular && (
                              <div className="flex items-center gap-1 text-xs">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                {item.celular}
                              </div>
                            )}
                            {item.email && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground truncate max-w-[180px]">
                                <Mail className="h-3 w-3" />
                                {item.email}
                              </div>
                            )}
                          </div>
                        </td>
                        {/* Observaciones */}
                        <td className="py-3 px-3 hidden lg:table-cell max-w-[220px]">
                          {item.observaciones ? (
                            <span className="text-xs text-muted-foreground line-clamp-2">
                              {item.observaciones}
                            </span>
                          ) : "—"}
                        </td>
                        {/* Estado */}
                        <td className="py-3 px-3">
                          <EstadoBadge estado={item.estado} />
                        </td>
                        {/* Acciones */}
                        <td className="py-3 px-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => { setSelected(item); setIsDeleteOpen(true) }}
                            >
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

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[560px] flex flex-col max-h-[92dvh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>{selected ? "Editar Prospecto" : "Nuevo Prospecto"}</DialogTitle>
            <DialogDescription>Datos del prospecto para seguimiento de seguro</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-2">
            <FieldGroup>
              {/* Nombre + Apellido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Nombre</FieldLabel>
                  <Input
                    value={formData.nombre || ""}
                    onChange={f("nombre")}
                    placeholder="Nombre"
                    className="bg-secondary/50"
                  />
                </Field>
                <Field>
                  <FieldLabel>Apellido</FieldLabel>
                  <Input
                    value={formData.apellido || ""}
                    onChange={f("apellido")}
                    placeholder="Apellido"
                    className="bg-secondary/50"
                  />
                </Field>
              </div>
              {/* Patente + DNI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Patente</FieldLabel>
                  <Input
                    value={formData.patente || ""}
                    onChange={f("patente")}
                    placeholder="ABC 123"
                    className="bg-secondary/50 uppercase"
                  />
                </Field>
                <Field>
                  <FieldLabel>DNI</FieldLabel>
                  <Input
                    value={formData.dni || ""}
                    onChange={f("dni")}
                    placeholder="Número de DNI"
                    className="bg-secondary/50"
                  />
                </Field>
              </div>
              {/* Celular + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Celular</FieldLabel>
                  <Input
                    value={formData.celular || ""}
                    onChange={f("celular")}
                    placeholder="11 1234-5678"
                    className="bg-secondary/50"
                  />
                </Field>
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <Input
                    type="email"
                    value={formData.email || ""}
                    onChange={f("email")}
                    placeholder="correo@ejemplo.com"
                    className="bg-secondary/50"
                  />
                </Field>
              </div>
              {/* Estado + Fecha contacto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Estado</FieldLabel>
                  <Select
                    value={formData.estado || "NUEVO"}
                    onValueChange={v => setFormData(p => ({ ...p, estado: v as EstadoSeg }))}
                  >
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map(e => (
                        <SelectItem key={e} value={e}>{ESTADO_CONFIG[e].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Fecha de Contacto</FieldLabel>
                  <Input
                    type="date"
                    value={formData.fechaContacto ? String(formData.fechaContacto).substring(0, 10) : ""}
                    onChange={f("fechaContacto")}
                    className="bg-secondary/50"
                  />
                </Field>
              </div>
              {/* Observaciones */}
              <Field>
                <FieldLabel>Observaciones / Notas</FieldLabel>
                <Textarea
                  value={formData.observaciones || ""}
                  onChange={f("observaciones")}
                  placeholder="Notas del seguimiento, acciones realizadas..."
                  rows={3}
                  className="bg-secondary/50"
                />
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50 shrink-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? <><Spinner className="mr-2 h-4 w-4" />Guardando...</> : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar prospecto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminás a <strong>{fullName(selected)}</strong> del seguimiento? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
