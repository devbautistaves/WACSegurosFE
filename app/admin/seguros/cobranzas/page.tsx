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
import { segurosAPI, CobranzaEfectivo, PagoMes, EmailNotificacion } from "@/lib/api"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Banknote, Plus, Search, Edit2, Trash2, X,
  CheckCircle2, Clock, ChevronLeft, ChevronRight,
  Phone, Car, MessageCircle, ChevronDown,
  Mail, BellRing, AlertTriangle, Send, RefreshCw,
  BookOpen, Calendar, User as UserIcon, XCircle, MinusCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Helpers de fecha (timezone-safe) ──────────────────────────────────────────
function localDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function fmtFechaCobro(fecha: string | Date | undefined | null): string {
  if (!fecha) return "—"
  return new Date(fecha).toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

// ── Constants ──────────────────────────────────────────────────────────────────
const ASEGURADORAS = [
  "LA_CAJA", "MERCANTIL_ANDINA", "SAN_CRISTOBAL", "SANCOR", "ALLIANZ",
  "ZURICH", "GALICIA", "LA_PERSEVERANCIA", "ATM", "BERKLEY",
  "RIVADAVIA", "MAPFRE", "NACION", "INTEGRITY", "PROVIDENCIA", "PROF", "OTRA",
]
const ASEG_LABELS: Record<string, string> = {
  LA_CAJA: "La Caja", MERCANTIL_ANDINA: "Mercantil Andina", SAN_CRISTOBAL: "San Cristóbal",
  SANCOR: "Sancor", ALLIANZ: "Allianz", ZURICH: "Zurich", GALICIA: "Galicia",
  LA_PERSEVERANCIA: "La Perseverancia", ATM: "ATM", BERKLEY: "Berkley",
  RIVADAVIA: "Rivadavia", MAPFRE: "Mapfre", NACION: "Nación", INTEGRITY: "Integrity",
  PROVIDENCIA: "Providencia", PROF: "Prof", OTRA: "Otra",
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

type EstadoPago = PagoMes["estado"]

const TODOS_ESTADOS: EstadoPago[] = [
  "COBRADA", "CUPON_ENVIADO", "PENDIENTE",
  "CUOTA_VENCIDA", "COMPROMISO_PAGO", "NO_CORRESPONDE", "ANULADA",
]

const PAGO_CONFIG: Record<EstadoPago, { label: string; color: string; bg: string; ring: string }> = {
  COBRADA:         { label: "Cobrada",           color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15", ring: "ring-emerald-500/30" },
  PENDIENTE:       { label: "Pendiente",          color: "text-amber-600 dark:text-amber-400",    bg: "bg-amber-500/15",   ring: "ring-amber-500/30"   },
  CUPON_ENVIADO:   { label: "Cupón enviado",       color: "text-blue-600 dark:text-blue-400",      bg: "bg-blue-500/15",    ring: "ring-blue-500/30"    },
  CUOTA_VENCIDA:   { label: "Cuota vencida",       color: "text-red-600 dark:text-red-400",        bg: "bg-red-500/15",     ring: "ring-red-500/30"     },
  COMPROMISO_PAGO: { label: "Deudor",                color: "text-orange-600 dark:text-orange-400",  bg: "bg-orange-500/15",  ring: "ring-orange-500/30"  },
  NO_CORRESPONDE:  { label: "No corresponde",      color: "text-gray-500",                          bg: "bg-gray-500/15",    ring: "ring-gray-500/30"    },
  ANULADA:         { label: "Anulada",             color: "text-rose-700 dark:text-rose-400",       bg: "bg-rose-500/15",    ring: "ring-rose-500/30"    },
}


function EstadoDropdown({
  estado, disabled, onSelect,
}: { estado: EstadoPago; disabled?: boolean; onSelect: (e: EstadoPago) => void }) {
  const cfg = PAGO_CONFIG[estado] ?? PAGO_CONFIG.PENDIENTE
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 transition-all select-none",
            cfg.bg, cfg.color, cfg.ring,
            !disabled && "cursor-pointer hover:opacity-80 active:scale-95",
            disabled && "opacity-60 cursor-not-allowed",
          )}
        >
          {estado === "COBRADA" && <CheckCircle2 className="h-3 w-3" />}
          {estado === "PENDIENTE" && <Clock className="h-3 w-3" />}
          {cfg.label}
          {!disabled && <ChevronDown className="h-3 w-3 opacity-60" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        {TODOS_ESTADOS.map(e => {
          const c = PAGO_CONFIG[e]
          return (
            <DropdownMenuItem
              key={e}
              className={cn("gap-2 cursor-pointer", e === estado && "font-semibold")}
              onClick={() => onSelect(e)}
            >
              <span className={cn("w-2 h-2 rounded-full flex-shrink-0", c.bg.replace("/15", ""), c.ring)} />
              <span className={c.color}>{c.label}</span>
              {e === estado && <CheckCircle2 className="h-3 w-3 ml-auto opacity-60" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Empty form ──────────────────────────────────────────────────────────────────
const EMPTY: Partial<CobranzaEfectivo> = {
  nombreApellido: "",
  email: "",
  aseguradora: "",
  patente: "",
  datosRiesgo: "",
  whatsapp: "",
  diaVto: undefined,
  pagos: [],
}

// ── Notification tipo config ─────────────────────────────────────────────────
type NotifTipo = "proximo_vencer" | "vence_hoy" | "vencido"
const NOTIF_CONFIG: Record<NotifTipo, { label: string; shortLabel: string; color: string; bg: string; border: string; accent: string }> = {
  proximo_vencer: {
    label: "Próximos a Vencer",
    shortLabel: "próx.",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    accent: "bg-amber-600 hover:bg-amber-700",
  },
  vence_hoy: {
    label: "Vencen Hoy",
    shortLabel: "hoy",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    accent: "bg-orange-600 hover:bg-orange-700",
  },
  vencido: {
    label: "Vencidos Sin Pago",
    shortLabel: "venc.",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    accent: "bg-red-700 hover:bg-red-800",
  },
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function CobranzasPage() {
  // Data
  const [cobranzas, setCobranzas] = useState<CobranzaEfectivo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Month navigation — defaults to today; will jump to busiest data month on first load
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()) // 0-indexed

  const mesKey   = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`
  const mesLabel = `${MONTH_NAMES[currentMonth]} ${currentYear}`

  // Filters
  const [search, setSearch] = useState("")
  const [aseguradoraFilter, setAseguradoraFilter] = useState("all")
  const [estadoFilter, setEstadoFilter] = useState<EstadoPago | "all">("all")

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<CobranzaEfectivo | null>(null)
  const [formData, setFormData] = useState<Partial<CobranzaEfectivo>>(EMPTY)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Cobro registration dialog
  const [cobroDialog, setCobroDialog] = useState<{
    open: boolean
    cobranza: CobranzaEfectivo | null
    fechaCobro: string
    cobradoPor: string
    numeroCuota: string
    numeroCuotasTotal: string
  }>({ open: false, cobranza: null, fechaCobro: localDateStr(), cobradoPor: "", numeroCuota: "", numeroCuotasTotal: "" })

  // Cuenta corriente dialog (historial de cuotas/pagos)
  const [ctaCteDialog, setCtaCteDialog] = useState<{ open: boolean; cobranza: CobranzaEfectivo | null }>({
    open: false,
    cobranza: null,
  })

  // Updating a pago inline
  const [updatingPago, setUpdatingPago] = useState<string | null>(null)

  // Notification state
  const [notifDialogOpen, setNotifDialogOpen] = useState(false)
  const [sendingNotif, setSendingNotif] = useState<NotifTipo | null>(null)
  const [retryingNotif, setRetryingNotif] = useState<string | null>(null)
  type BatchResult = {
    enviados: { _id: string; nombreApellido: string; email: string }[]
    fallidos: { _id: string; nombreApellido: string; email: string; error: string }[]
    sinEmail: { _id: string; nombreApellido: string }[]
    yaEnviados: { _id: string; nombreApellido: string }[]
  }
  const [notifResults, setNotifResults] = useState<Partial<Record<NotifTipo, BatchResult>>>({})

  const { toast } = useToast()

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    setIsLoading(true)
    try {
      // Sync overdue payments silently before loading
      segurosAPI.syncVencidas(token).catch(() => {})
      const params: Record<string, string> = {}
      if (aseguradoraFilter !== "all") params.aseguradora = aseguradoraFilter
      if (search.trim()) params.search = search.trim()
      const res = await segurosAPI.getCobranzas(token, params)
      setCobranzas(res.cobranzas)
      // Mes inicial = mes actual (no auto-salto a mes con más data)
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar las cobranzas", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [aseguradoraFilter, search, toast])

  useEffect(() => { fetchData() }, [aseguradoraFilter])

  // ── Month navigation ─────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else { setCurrentMonth(m => m - 1) }
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else { setCurrentMonth(m => m + 1) }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getPagoEstado = (c: CobranzaEfectivo): EstadoPago =>
    c.pagos.find(p => p.mes === mesKey)?.estado ?? "PENDIENTE"

  const getPagoData = (c: CobranzaEfectivo): PagoMes | undefined =>
    c.pagos.find(p => p.mes === mesKey)

  // ── Sort by diaVto (asc, nulls last) ────────────────────────────────────────
  const sortedCobranzas = [...cobranzas].sort((a, b) => {
    if (a.diaVto == null && b.diaVto == null) return 0
    if (a.diaVto == null) return 1
    if (b.diaVto == null) return -1
    return a.diaVto - b.diaVto
  })

  // ── Notification eligibility ─────────────────────────────────────────────────
  const todayDay = new Date().getDate()
  const eligibleProximo = cobranzas.filter(c =>
    (typeof c.diaVto === "number" && (c.diaVto === todayDay + 1 || c.diaVto === todayDay + 2)) ||
    getPagoEstado(c) === "PENDIENTE" ||
    getPagoEstado(c) === "COMPROMISO_PAGO"
  )
  const eligibleHoy = cobranzas.filter(c =>
    typeof c.diaVto === "number" && c.diaVto === todayDay
  )
  // "Vencidos sin pago": el cliente no pagó ni el mes seleccionado ni el anterior
  // (estado distinto a COBRADA / NO_CORRESPONDE / ANULADA en ambos meses).
  const _prevDate = new Date(currentYear, currentMonth - 1, 1)
  const mesKeyPrev = `${_prevDate.getFullYear()}-${String(_prevDate.getMonth() + 1).padStart(2, "0")}`
  const NO_DEBE_FE: EstadoPago[] = ["COBRADA", "NO_CORRESPONDE", "ANULADA"]
  const debeEnMes = (c: CobranzaEfectivo, mes: string) => {
    const p = c.pagos.find(x => x.mes === mes)
    return !p || !NO_DEBE_FE.includes(p.estado)
  }
  const eligibleVencidos = cobranzas.filter(c => debeEnMes(c, mesKey) && debeEnMes(c, mesKeyPrev))

  const totalEligible = eligibleProximo.length + eligibleHoy.length + eligibleVencidos.length

  const getNotifForMes = (c: CobranzaEfectivo, tipo: NotifTipo): EmailNotificacion | undefined =>
    c.emailNotificaciones?.filter(n => n.tipo === tipo && n.mes === mesKey)
      .sort((a, b) => new Date(b.enviadoEn).getTime() - new Date(a.enviadoEn).getTime())[0]

  const getSessionStatus = (tipo: NotifTipo, clientId: string): "enviado" | "fallido" | "yaEnviado" | null => {
    const result = notifResults[tipo]
    if (!result) return null
    if (result.enviados.some(e => e._id === clientId)) return "enviado"
    if (result.fallidos.some(f => f._id === clientId)) return "fallido"
    if (result.yaEnviados.some(y => y._id === clientId)) return "yaEnviado"
    return null
  }

  // ── Stats for current month ──────────────────────────────────────────────────
  const visibleCobranzas = estadoFilter === "all"
    ? sortedCobranzas
    : sortedCobranzas.filter(c => getPagoEstado(c) === estadoFilter)

  const cobradas       = cobranzas.filter(c => getPagoEstado(c) === "COBRADA").length
  const pendientes     = cobranzas.filter(c => getPagoEstado(c) === "PENDIENTE").length
  const cuponEnviado   = cobranzas.filter(c => getPagoEstado(c) === "CUPON_ENVIADO").length
  const cuotaVencida   = cobranzas.filter(c => getPagoEstado(c) === "CUOTA_VENCIDA").length
  const compromisoPago = cobranzas.filter(c => getPagoEstado(c) === "COMPROMISO_PAGO").length

  const hasFilters = aseguradoraFilter !== "all" || search.trim() !== "" || estadoFilter !== "all"
  const clearFilters = () => { setAseguradoraFilter("all"); setSearch(""); setEstadoFilter("all") }

  // ── Select payment status from dropdown ─────────────────────────────────────
  const handleSelectEstado = async (c: CobranzaEfectivo, newEstado: EstadoPago) => {
    const token = localStorage.getItem("token")
    if (!token || updatingPago === c._id) return
    if (getPagoEstado(c) === newEstado) return

    // COBRADA requires capturing date + collector name + cuota number
    if (newEstado === "COBRADA") {
      // Sugerir n° de cuota = (último n° cobrado) + 1
      const pagosCobrados = (c.pagos || []).filter(p => p.estado === "COBRADA" && typeof p.numeroCuota === "number")
      const maxCuota = pagosCobrados.reduce((max, p) => Math.max(max, p.numeroCuota || 0), 0)
      const sugerida = maxCuota > 0 ? String(maxCuota + 1) : ""
      setCobroDialog({
        open: true,
        cobranza: c,
        fechaCobro: localDateStr(),
        cobradoPor: "",
        numeroCuota: sugerida,
        numeroCuotasTotal: c.numeroCuotasTotal != null ? String(c.numeroCuotasTotal) : "",
      })
      return
    }

    // Optimistic update
    setUpdatingPago(c._id)
    setCobranzas(prev => prev.map(item => {
      if (item._id !== c._id) return item
      const pi = item.pagos.findIndex(p => p.mes === mesKey)
      if (pi >= 0) {
        const newPagos = [...item.pagos]
        newPagos[pi] = { ...newPagos[pi], estado: newEstado }
        return { ...item, pagos: newPagos }
      }
      return { ...item, pagos: [...item.pagos, { mes: mesKey, mesLabel, estado: newEstado }] }
    }))

    try {
      await segurosAPI.updatePago(token, c._id, mesKey, mesLabel, newEstado)
    } catch {
      toast({ title: "Error", description: "No se pudo actualizar el estado", variant: "destructive" })
      fetchData()
    } finally {
      setUpdatingPago(null)
    }
  }

  // ── Confirm cobro ────────────────────────────────────────────────────────────
  const handleConfirmCobro = async () => {
    const token = localStorage.getItem("token")
    const c = cobroDialog.cobranza
    if (!token || !c) return

    setUpdatingPago(c._id)
    const { fechaCobro, cobradoPor, numeroCuota, numeroCuotasTotal } = cobroDialog
    const cuota = numeroCuota.trim() === "" ? null : Number(numeroCuota)
    const cuotasTotal = numeroCuotasTotal.trim() === "" ? null : Number(numeroCuotasTotal)

    // Optimistic update — incluye numeroCuota y actualiza diaVto al día del cobro
    setCobranzas(prev => prev.map(item => {
      if (item._id !== c._id) return item
      const pi = item.pagos.findIndex(p => p.mes === mesKey)
      const updated: PagoMes = {
        mes: mesKey,
        mesLabel,
        estado: "COBRADA",
        cobradoPor,
        fechaCobro,
        numeroCuota: cuota,
      }
      const newPagos = pi >= 0
        ? item.pagos.map((p, i) => i === pi ? { ...p, ...updated } : p)
        : [...item.pagos, updated]
      return {
        ...item,
        pagos: newPagos,
        ...(cuotasTotal !== null ? { numeroCuotasTotal: cuotasTotal } : {}),
      }
    }))
    setCobroDialog(d => ({ ...d, open: false }))

    try {
      await segurosAPI.updatePago(
        token,
        c._id,
        mesKey,
        mesLabel,
        "COBRADA",
        cobradoPor || undefined,
        fechaCobro || undefined,
        cuota,
        cuotasTotal,
      )
      toast({ title: "Cobro registrado", description: `${c.nombreApellido} — ${mesLabel}` })
    } catch {
      toast({ title: "Error", description: "No se pudo registrar el cobro", variant: "destructive" })
      fetchData()
    } finally {
      setUpdatingPago(null)
    }
  }

  // ── WhatsApp / Email helpers ─────────────────────────────────────────────────
  const openWhatsApp = (c: CobranzaEfectivo, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!c.whatsapp) return
    const num = c.whatsapp.replace(/\D/g, "")
    const msg = encodeURIComponent(
      `Hola ${c.nombreApellido}, le informamos que su cuota de ${mesLabel} está pendiente de pago. ` +
      `Por favor comuníquese para coordinar el pago. Muchas gracias.`
    )
    window.open(`https://wa.me/54${num}?text=${msg}`, "_blank")
  }

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const openCreate = () => { setSelected(null); setFormData(EMPTY); setIsDialogOpen(true) }
  const openEdit   = (c: CobranzaEfectivo) => { setSelected(c); setFormData({ ...c }); setIsDialogOpen(true) }
  const f = (key: keyof CobranzaEfectivo) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, [key]: e.target.value }))

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    if (!formData.nombreApellido?.trim()) {
      toast({ title: "Error", description: "El nombre es requerido", variant: "destructive" }); return
    }
    setIsSubmitting(true)
    try {
      const payload = {
        ...formData,
        diaVto: formData.diaVto ? Number(formData.diaVto) : undefined,
      }
      if (selected) {
        await segurosAPI.updateCobranza(token, selected._id, payload)
        toast({ title: "Cliente actualizado" })
      } else {
        await segurosAPI.createCobranza(token, payload)
        toast({ title: "Cliente creado" })
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
      await segurosAPI.deleteCobranza(token, selected._id)
      toast({ title: "Cliente eliminado" })
      setIsDeleteOpen(false)
      fetchData()
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" })
    }
  }

  // ── Send batch notifications ─────────────────────────────────────────────────
  const handleSendBatch = async (tipo: NotifTipo) => {
    const token = localStorage.getItem("token")
    if (!token) return
    setSendingNotif(tipo)
    try {
      const res = await segurosAPI.enviarNotificacionBatch(token, tipo, mesKey)
      setNotifResults(prev => ({ ...prev, [tipo]: res.results }))
      const { enviados, fallidos } = res.results
      if (enviados.length > 0)
        toast({ title: `✓ ${enviados.length} email${enviados.length > 1 ? "s" : ""} enviado${enviados.length > 1 ? "s" : ""}` })
      if (fallidos.length > 0)
        toast({ title: `${fallidos.length} error${fallidos.length > 1 ? "es" : ""}`, description: "Ver detalle en el panel", variant: "destructive" })
      fetchData()
    } catch {
      toast({ title: "Error", description: "No se pudieron enviar las notificaciones", variant: "destructive" })
    } finally {
      setSendingNotif(null)
    }
  }

  // ── Retry single notification ────────────────────────────────────────────────
  const handleRetryNotif = async (cobranzaId: string, tipo: NotifTipo) => {
    const token = localStorage.getItem("token")
    if (!token) return
    setRetryingNotif(cobranzaId + tipo)
    try {
      await segurosAPI.enviarNotificacionIndividual(token, cobranzaId, tipo, mesKey)
      toast({ title: "Email enviado" })
      setNotifResults(prev => {
        const current = prev[tipo]
        if (!current) return prev
        return { ...prev, [tipo]: { ...current, fallidos: current.fallidos.filter(f => f._id !== cobranzaId) } }
      })
      fetchData()
    } catch {
      toast({ title: "Error", description: "No se pudo enviar el email", variant: "destructive" })
    } finally {
      setRetryingNotif(null)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout requiredRole={["admin", "admin_seguros"]}>
      <div>
        <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Banknote className="h-8 w-8 text-emerald-500" />
              Cobranzas Efectivo
            </h1>
            <p className="text-muted-foreground">{cobranzas.length} clientes registrados</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setNotifDialogOpen(true)}
              className={cn(
                "border-blue-500/30 text-blue-400 hover:bg-blue-500/10",
                totalEligible > 0 && "ring-1 ring-blue-500/40"
              )}
            >
              <BellRing className="mr-2 h-4 w-4" />
              Notificaciones
              {totalEligible > 0 && (
                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center font-bold">
                  {totalEligible}
                </span>
              )}
            </Button>
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </div>
        </div>

        {/* Month navigator */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-4">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="h-9 w-9">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center min-w-[180px]">
                <p className="text-xl font-bold text-foreground">{MONTH_NAMES[currentMonth]}</p>
                <p className="text-sm text-muted-foreground">{currentYear}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={nextMonth} className="h-9 w-9">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Cobradas",          value: cobradas,       color: "text-emerald-500", bg: "bg-emerald-500/10", estado: "COBRADA" as EstadoPago },
            { label: "Pendientes",         value: pendientes,     color: "text-amber-500",   bg: "bg-amber-500/10",   estado: "PENDIENTE" as EstadoPago },
            { label: "Cupón enviado",       value: cuponEnviado,   color: "text-blue-500",    bg: "bg-blue-500/10",    estado: "CUPON_ENVIADO" as EstadoPago },
            { label: "Cuota vencida",       value: cuotaVencida,   color: "text-red-500",     bg: "bg-red-500/10",     estado: "CUOTA_VENCIDA" as EstadoPago },
            { label: "Deudor",               value: compromisoPago, color: "text-orange-500",  bg: "bg-orange-500/10",  estado: "COMPROMISO_PAGO" as EstadoPago },
          ].map(s => (
            <Card
              key={s.label}
              className={cn(
                "border-border/50 bg-card/50 cursor-pointer transition-all hover:ring-1 hover:ring-border",
                estadoFilter === s.estado && "ring-2 ring-primary"
              )}
              onClick={() => setEstadoFilter(prev => prev === s.estado ? "all" : s.estado)}
            >
              <CardContent className="p-4">
                <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
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
                <Input
                  placeholder="Nombre, patente, WhatsApp..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && fetchData()}
                  className="pl-9 bg-secondary/50"
                />
              </div>
              <Select value={aseguradoraFilter} onValueChange={setAseguradoraFilter}>
                <SelectTrigger className="w-full sm:w-[150px] bg-secondary/50">
                  <SelectValue placeholder="Aseguradora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {ASEGURADORAS.map(a => <SelectItem key={a} value={a}>{ASEG_LABELS[a] || a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="default" size="sm" onClick={fetchData} className="bg-emerald-600 hover:bg-emerald-700">
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

        {/* Legend */}
        <div className="flex flex-wrap gap-2 px-1">
          <span className="text-xs text-muted-foreground mr-1">Estados:</span>
          {(Object.entries(PAGO_CONFIG) as [EstadoPago, typeof PAGO_CONFIG[EstadoPago]][]).map(([key, cfg]) => (
            <span key={key} className={cn("text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.color)}>
              {cfg.label}
            </span>
          ))}
          <span className="text-xs text-muted-foreground ml-2 italic">· Click en carta para filtrar por estado</span>
        </div>

        {/* Table */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>
              Clientes — <span className="text-emerald-500">{mesLabel}</span>
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({visibleCobranzas.length}{estadoFilter !== "all" ? ` de ${cobranzas.length}` : ""})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Spinner className="h-8 w-8 text-emerald-500" />
              </div>
            ) : visibleCobranzas.length === 0 ? (
              <div className="py-16 text-center">
                <Banknote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No se encontraron clientes</p>
                {hasFilters && <Button variant="link" onClick={clearFilters}>Limpiar filtros</Button>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-3 px-3 font-medium">Nombre y Apellido</th>
                      <th className="text-left py-3 px-3 font-medium hidden sm:table-cell">Aseguradora</th>
                      <th className="text-left py-3 px-3 font-medium hidden md:table-cell">Patente</th>
                      <th className="text-left py-3 px-3 font-medium hidden lg:table-cell">WhatsApp</th>
                      <th className="text-left py-3 px-3 font-medium hidden lg:table-cell">Día Vto.</th>
                      <th className="text-left py-3 px-3 font-medium">{mesLabel}</th>
                      <th className="text-left py-3 px-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCobranzas.map(c => {
                      const estado = getPagoEstado(c)
                      const pagoData = getPagoData(c)
                      const isUpdating = updatingPago === c._id
                      return (
                        <tr key={c._id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                          {/* Nombre */}
                          <td className="py-3 px-3">
                            <div className="font-medium">{c.nombreApellido}</div>
                            <div className="sm:hidden text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                              {c.aseguradora && <span>{ASEG_LABELS[c.aseguradora] || c.aseguradora}</span>}
                              {c.patente && (
                                <span className="inline-flex items-center gap-1">
                                  <Car className="h-3 w-3" />{c.patente}
                                </span>
                              )}
                            </div>
                            {/* Show cobro info if cobrada */}
                            {estado === "COBRADA" && pagoData?.cobradoPor && (
                              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                                ✓ {pagoData.cobradoPor}
                                {pagoData.fechaCobro && ` — ${fmtFechaCobro(pagoData.fechaCobro)}`}
                              </div>
                            )}
                            {/* Email notification badge */}
                            {(() => {
                              const tipos: NotifTipo[] = ["proximo_vencer", "vence_hoy", "vencido"]
                              const enviadas = tipos.filter(t => getNotifForMes(c, t)?.estado === "enviado")
                              const errores = tipos.filter(t => getNotifForMes(c, t)?.estado === "error")
                              if (enviadas.length === 0 && errores.length === 0) return null
                              return (
                                <div className="flex items-center gap-1 mt-0.5">
                                  {enviadas.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400">
                                      <Mail className="h-3 w-3" />
                                      {enviadas.map(t => NOTIF_CONFIG[t].shortLabel).join(", ")}
                                    </span>
                                  )}
                                  {errores.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-xs text-red-500">
                                      <AlertTriangle className="h-3 w-3" />
                                      error
                                    </span>
                                  )}
                                </div>
                              )
                            })()}
                          </td>
                          {/* Aseguradora */}
                          <td className="py-3 px-3 hidden sm:table-cell">
                            {c.aseguradora ? (ASEG_LABELS[c.aseguradora] || c.aseguradora) : "—"}
                          </td>
                          {/* Patente */}
                          <td className="py-3 px-3 hidden md:table-cell font-mono text-xs uppercase">
                            {c.patente || "—"}
                          </td>
                          {/* WhatsApp */}
                          <td className="py-3 px-3 hidden lg:table-cell">
                            {c.whatsapp ? (
                              <span className="inline-flex items-center gap-1 text-xs">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                {c.whatsapp}
                              </span>
                            ) : "—"}
                          </td>
                          {/* Día Vto */}
                          <td className="py-3 px-3 hidden lg:table-cell text-center">
                            {c.diaVto ? (
                              <span className="text-xs font-mono bg-secondary/60 px-1.5 py-0.5 rounded">
                                {c.diaVto}
                              </span>
                            ) : "—"}
                          </td>
                          {/* Estado del mes — dropdown */}
                          <td className="py-3 px-3">
                            {isUpdating ? (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Spinner className="h-3 w-3" />
                              </span>
                            ) : (
                              <EstadoDropdown
                                estado={estado}
                                onSelect={(e) => handleSelectEstado(c, e)}
                              />
                            )}
                          </td>
                          {/* Actions */}
                          <td className="py-3 px-3">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Cuenta corriente"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-500/10"
                                onClick={(e) => { e.stopPropagation(); setCtaCteDialog({ open: true, cobranza: c }) }}
                              >
                                <BookOpen className="h-4 w-4" />
                              </Button>
                              {c.whatsapp && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Enviar aviso WhatsApp"
                                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                  onClick={(e) => openWhatsApp(c, e)}
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => { setSelected(c); setIsDeleteOpen(true) }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Registrar Cobro Dialog ───────────────────────────────────────────── */}
      <Dialog open={cobroDialog.open} onOpenChange={open => setCobroDialog(d => ({ ...d, open }))}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Registrar Cobro
            </DialogTitle>
            <DialogDescription>
              {cobroDialog.cobranza?.nombreApellido} — {mesLabel}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Fecha de Cobro</FieldLabel>
              <Input
                type="date"
                value={cobroDialog.fechaCobro}
                onChange={e => setCobroDialog(d => ({ ...d, fechaCobro: e.target.value }))}
                className="bg-secondary/50"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>N° de cuota</FieldLabel>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={cobroDialog.numeroCuota}
                  onChange={e => setCobroDialog(d => ({ ...d, numeroCuota: e.target.value }))}
                  placeholder="Ej: 3"
                  className="bg-secondary/50"
                />
              </Field>
              <Field>
                <FieldLabel>Total cuotas</FieldLabel>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={cobroDialog.numeroCuotasTotal}
                  onChange={e => setCobroDialog(d => ({ ...d, numeroCuotasTotal: e.target.value }))}
                  placeholder="Ej: 12"
                  className="bg-secondary/50"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel>Cobrado por</FieldLabel>
              <Input
                value={cobroDialog.cobradoPor}
                onChange={e => setCobroDialog(d => ({ ...d, cobradoPor: e.target.value }))}
                placeholder="Nombre del cobrador (opcional)"
                className="bg-secondary/50"
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCobroDialog(d => ({ ...d, open: false }))}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmCobro} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Confirmar cobro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cuenta Corriente Dialog ──────────────────────────────────────────── */}
      <Dialog open={ctaCteDialog.open} onOpenChange={open => setCtaCteDialog(d => ({ ...d, open }))}>
        <DialogContent className="sm:max-w-[640px] flex flex-col max-h-[92dvh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b">
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              Cuenta corriente
            </DialogTitle>
            <DialogDescription>
              {ctaCteDialog.cobranza?.nombreApellido}
              {ctaCteDialog.cobranza?.aseguradora && ` · ${ASEG_LABELS[ctaCteDialog.cobranza.aseguradora] || ctaCteDialog.cobranza.aseguradora}`}
              {ctaCteDialog.cobranza?.numeroCuotasTotal ? ` · Plan: ${ctaCteDialog.cobranza.numeroCuotasTotal} cuotas` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {(() => {
              const c = ctaCteDialog.cobranza
              if (!c) return null
              const pagosRegistrados = c.pagos || []
              if (pagosRegistrados.length === 0) {
                return <p className="text-sm text-muted-foreground text-center py-8">Sin movimientos registrados.</p>
              }

              // Generar lista completa de meses entre el primer pago registrado y el mes ACTUAL
              const mesesRegistrados = pagosRegistrados.map(p => p.mes).sort()
              const primerMes = mesesRegistrados[0] // YYYY-MM
              const today = new Date()
              const mesActual = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`

              // Iterar mes a mes desde primerMes hasta max(últimoRegistrado, mesActual)
              const ultimoMes = mesActual > mesesRegistrados[mesesRegistrados.length - 1]
                ? mesActual
                : mesesRegistrados[mesesRegistrados.length - 1]
              const todosLosMeses: string[] = []
              const [py, pm] = primerMes.split("-").map(Number)
              const [uy, um] = ultimoMes.split("-").map(Number)
              let y = py, m = pm
              while (y < uy || (y === uy && m <= um)) {
                todosLosMeses.push(`${y}-${String(m).padStart(2, "0")}`)
                m++
                if (m > 12) { m = 1; y++ }
              }

              // Crear array de items con el pago de cada mes (si existe) o fila vacía
              const itemsBase = todosLosMeses.map(mesKey => {
                const pago = pagosRegistrados.find(p => p.mes === mesKey)
                const [yr, mo] = mesKey.split("-").map(Number)
                const labelNormalized = `${MONTH_NAMES[mo - 1]} ${yr}`
                return {
                  mes: mesKey,
                  mesLabelNormalized: labelNormalized,
                  pago,    // PagoMes | undefined
                }
              }).sort((a, b) => b.mes.localeCompare(a.mes)) // desc

              // Inferir Cobrada para meses pasados: si un mes posterior está COBRADA,
              // los meses anteriores sin pago explícito (o con PENDIENTE) se asumen cobrados.
              const lastPaidMes = itemsBase.find(it => it.pago?.estado === "COBRADA")?.mes
              const items = itemsBase.map(it => {
                const explicitNonPending = it.pago && it.pago.estado !== "PENDIENTE"
                const inferredCobrada = !!(lastPaidMes && it.mes < lastPaidMes && !explicitNonPending)
                return { ...it, inferredCobrada }
              })

              const cobrados = items.filter(it => it.pago?.estado === "COBRADA" || it.inferredCobrada).length
              const adeudan = todosLosMeses.length - cobrados

              return (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-4 text-center text-xs">
                    <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/30 px-3 py-2">
                      <p className="text-muted-foreground">Cobradas</p>
                      <p className="font-bold text-lg text-emerald-600">{cobrados}</p>
                    </div>
                    <div className="rounded-lg border bg-amber-500/5 border-amber-500/30 px-3 py-2">
                      <p className="text-muted-foreground">Adeudan / pendientes</p>
                      <p className="font-bold text-lg text-amber-600">{adeudan}</p>
                    </div>
                    <div className="rounded-lg border bg-slate-500/5 border-slate-500/30 px-3 py-2">
                      <p className="text-muted-foreground">Total meses</p>
                      <p className="font-bold text-lg">{todosLosMeses.length}</p>
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs uppercase text-muted-foreground">
                        <th className="py-2 px-2 text-left font-medium">Mes</th>
                        <th className="py-2 px-2 text-left font-medium">Cuota</th>
                        <th className="py-2 px-2 text-left font-medium">Estado</th>
                        <th className="py-2 px-2 text-left font-medium">Fecha cobro</th>
                        <th className="py-2 px-2 text-left font-medium">Por</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(it => {
                        const p = it.pago
                        const estado: EstadoPago = it.inferredCobrada ? "COBRADA" : (p?.estado || "PENDIENTE")
                        const cfg = PAGO_CONFIG[estado]
                        const fecha = fmtFechaCobro(p?.fechaCobro)
                        const cuotaTxt = p?.numeroCuota != null
                          ? (c.numeroCuotasTotal ? `${p.numeroCuota} / ${c.numeroCuotasTotal}` : String(p.numeroCuota))
                          : "—"
                        return (
                          <tr key={it.mes} className={cn("border-b last:border-0 hover:bg-secondary/30", !p && !it.inferredCobrada && "opacity-60")}>
                            <td className="py-2 px-2 font-medium">{it.mesLabelNormalized}</td>
                            <td className="py-2 px-2 text-muted-foreground">{cuotaTxt}</td>
                            <td className="py-2 px-2">
                              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", cfg?.bg, cfg?.color)}>
                                {cfg?.label || estado}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-muted-foreground">{fecha}</td>
                            <td className="py-2 px-2 text-muted-foreground">{p?.cobradoPor || "—"}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </>
              )
            })()}
          </div>
          <DialogFooter className="px-6 py-3 border-t shrink-0">
            <Button variant="outline" onClick={() => setCtaCteDialog({ open: false, cobranza: null })}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[520px] flex flex-col max-h-[92dvh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>{selected ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
            <DialogDescription>Datos del cliente de cobranza efectivo</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-2">
            <FieldGroup>
              <Field>
                <FieldLabel>Nombre y Apellido *</FieldLabel>
                <Input
                  value={formData.nombreApellido || ""}
                  onChange={f("nombreApellido")}
                  placeholder="APELLIDO NOMBRE"
                  className="bg-secondary/50"
                />
              </Field>
              <Field>
                <FieldLabel className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-blue-400" />
                  Email (para notificaciones)
                </FieldLabel>
                <Input
                  type="email"
                  value={formData.email || ""}
                  onChange={f("email")}
                  placeholder="cliente@email.com"
                  className="bg-secondary/50"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>WhatsApp</FieldLabel>
                  <Input
                    value={formData.whatsapp || ""}
                    onChange={f("whatsapp")}
                    placeholder="11 1234-5678"
                    className="bg-secondary/50"
                  />
                </Field>
                <Field>
                  <FieldLabel>Día de Vencimiento</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={formData.diaVto ?? ""}
                    onChange={f("diaVto")}
                    placeholder="Ej: 10"
                    className="bg-secondary/50"
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel>Descripción / Datos del riesgo</FieldLabel>
                <Input
                  value={formData.datosRiesgo || ""}
                  onChange={f("datosRiesgo")}
                  placeholder="Ej: Toyota Corolla 2020, Vivienda Av. San Martín 123..."
                  className="bg-secondary/50"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Aseguradora</FieldLabel>
                  <Select
                    value={formData.aseguradora || ""}
                    onValueChange={v => setFormData(p => ({ ...p, aseguradora: v }))}
                  >
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ASEGURADORAS.map(a => (
                        <SelectItem key={a} value={a}>{ASEG_LABELS[a] || a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Patente / Ramo</FieldLabel>
                  <Input
                    value={formData.patente || ""}
                    onChange={f("patente")}
                    placeholder="ABC 123 o HOGAR"
                    className="bg-secondary/50 uppercase"
                  />
                </Field>
              </div>
            </FieldGroup>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50 shrink-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? <><Spinner className="mr-2 h-4 w-4" />Guardando...</> : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminás a <strong>{selected?.nombreApellido}</strong> y todo su historial de pagos?
              Esta acción no se puede deshacer.
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

      {/* ── Notificaciones por Email Dialog ─────────────────────────────────── */}
      <Dialog open={notifDialogOpen} onOpenChange={setNotifDialogOpen}>
        <DialogContent className="sm:max-w-[700px] flex flex-col max-h-[92dvh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-border/50">
            <DialogTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-blue-400" />
              Notificaciones por Email
            </DialogTitle>
            <DialogDescription>
              Envíos del mes <strong>{mesLabel}</strong> · Hoy: día {todayDay}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {(["proximo_vencer", "vence_hoy", "vencido"] as NotifTipo[]).map(tipo => {
              const cfg = NOTIF_CONFIG[tipo]
              const eligible = tipo === "proximo_vencer" ? eligibleProximo
                : tipo === "vence_hoy" ? eligibleHoy
                : eligibleVencidos
              const withEmail = eligible.filter(c => c.email)
              const isSending = sendingNotif === tipo

              return (
                <div key={tipo} className={cn("rounded-lg border overflow-hidden", cfg.border)}>
                  {/* Section header */}
                  <div className={cn("px-4 py-3 flex items-center justify-between gap-2 flex-wrap", cfg.bg)}>
                    <div>
                      <p className={cn("font-semibold text-sm", cfg.color)}>{cfg.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {eligible.length === 0
                          ? "Sin clientes elegibles hoy"
                          : `${eligible.length} elegible${eligible.length !== 1 ? "s" : ""}${withEmail.length > 0 ? ` · ${withEmail.length} con email` : ""}`}
                      </p>
                    </div>
                    {withEmail.length > 0 && (
                      <Button
                        size="sm"
                        disabled={isSending}
                        onClick={() => handleSendBatch(tipo)}
                        className={cn("text-white shrink-0", cfg.accent)}
                      >
                        {isSending
                          ? <><Spinner className="mr-1.5 h-3.5 w-3.5" />Enviando...</>
                          : <><Send className="mr-1.5 h-3.5 w-3.5" />Enviar a todos ({withEmail.length})</>
                        }
                      </Button>
                    )}
                  </div>

                  {/* Client list */}
                  {eligible.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-muted-foreground italic">
                      {tipo === "proximo_vencer" && `No hay clientes con vto. días ${todayDay + 1} o ${todayDay + 2}`}
                      {tipo === "vence_hoy" && `No hay clientes con vto. día ${todayDay}`}
                      {tipo === "vencido" && "No hay clientes adeudando este mes y el anterior"}
                    </p>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {eligible.map(c => {
                        const dbNotif = getNotifForMes(c, tipo)
                        const sessionStatus = getSessionStatus(tipo, c._id)
                        const isRetrying = retryingNotif === c._id + tipo

                        // Determine final status (session overrides DB for immediate feedback)
                        const effectiveStatus: "enviado" | "error" | "yaEnviado" | null =
                          sessionStatus === "enviado" ? "enviado"
                          : sessionStatus === "fallido" ? "error"
                          : sessionStatus === "yaEnviado" ? "yaEnviado"
                          : dbNotif?.estado === "enviado" ? "enviado"
                          : dbNotif?.estado === "error" ? "error"
                          : null

                        const sentDate = effectiveStatus === "enviado" && dbNotif?.estado === "enviado" && sessionStatus !== "enviado"
                          ? new Date(dbNotif.enviadoEn).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
                          : effectiveStatus === "enviado"
                          ? new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
                          : null

                        return (
                          <div key={c._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/20 transition-colors">
                            {/* Client info */}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-tight truncate">{c.nombreApellido}</p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {c.email
                                  ? <><span className="text-blue-400/70">{c.email}</span></>
                                  : <span className="italic">Sin email</span>
                                }
                                {c.diaVto != null && (
                                  <span className="ml-2 text-muted-foreground/50">· vto. día {c.diaVto}</span>
                                )}
                              </p>
                            </div>

                            {/* Status badge */}
                            <div className="shrink-0 flex items-center gap-2">
                              {effectiveStatus === "enviado" && (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  {sentDate}
                                </span>
                              )}
                              {effectiveStatus === "error" && (
                                <span className="inline-flex items-center gap-1 text-xs text-red-500">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Error
                                </span>
                              )}
                              {effectiveStatus === "yaEnviado" && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Mail className="h-3.5 w-3.5" />
                                  Ya enviado
                                </span>
                              )}
                              {!c.email && (
                                <span className="text-xs text-muted-foreground/50 italic">Sin email</span>
                              )}

                              {/* Action button */}
                              {c.email && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isRetrying}
                                  onClick={() => handleRetryNotif(c._id, tipo)}
                                  className={cn(
                                    "h-7 px-2.5 text-xs shrink-0",
                                    effectiveStatus === "enviado" || effectiveStatus === "yaEnviado"
                                      ? "text-muted-foreground hover:text-foreground"
                                      : effectiveStatus === "error"
                                      ? "text-red-400 hover:bg-red-500/10"
                                      : cfg.color
                                  )}
                                >
                                  {isRetrying
                                    ? <Spinner className="h-3 w-3" />
                                    : effectiveStatus === "enviado" || effectiveStatus === "yaEnviado"
                                    ? <><RefreshCw className="h-3 w-3 mr-1" />Reenviar</>
                                    : <><Send className="h-3 w-3 mr-1" />Enviar</>
                                  }
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="px-6 py-4 border-t border-border/50 shrink-0">
            <Button variant="outline" onClick={() => setNotifDialogOpen(false)} className="w-full">
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  )
}
