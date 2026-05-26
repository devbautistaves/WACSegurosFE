"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
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
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { tpySoftwareAPI, TPY_SoftwareClient, TPY_SoftwareTransaction } from "@/lib/api"
import { useCompany } from "@/lib/company-context"
import {
  Monitor,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Edit2,
  Trash2,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Github,
  Globe,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "clientes" | "caja"
type ClientStatus = "activo" | "inactivo" | "moroso"

const STATUS_CONFIG: Record<ClientStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  activo: { label: "Activo", color: "bg-green-500/10 text-green-500 border-green-500/20", icon: CheckCircle2 },
  moroso: { label: "Moroso", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle },
  inactivo: { label: "Inactivo", color: "bg-gray-500/10 text-gray-400 border-gray-500/20", icon: Clock },
}

const TX_CATEGORIES_INGRESO = ["Mensualidad CRM", "Soporte", "Implementacion", "Actualizacion", "Otro ingreso"]
const TX_CATEGORIES_EGRESO = ["Infraestructura", "Dominio/Hosting", "Herramientas", "Marketing", "Personal", "Otro egreso"]
const PAYMENT_METHODS = ["transferencia", "efectivo", "mercadopago", "cheque", "otro"]

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n)
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function formatMonth(m: string) {
  const [y, mo] = m.split("-")
  const d = new Date(Number(y), Number(mo) - 1, 1)
  return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" }).replace(/^\w/, c => c.toUpperCase())
}

function prevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number)
  const d = new Date(y, mo - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function nextMonth(m: string) {
  const [y, mo] = m.split("-").map(Number)
  const d = new Date(y, mo, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SoftwareBillingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { currentCompany } = useCompany()

  const [userRole, setUserRole] = useState<string>("")
  const isAdminTpy = userRole === "admin_tpy"

  // Guard: solo TPY y no admin_tpy
  useEffect(() => {
    let role = ""
    try {
      const u = localStorage.getItem("user")
      if (u) { role = JSON.parse(u).role || ""; setUserRole(role) }
    } catch {}
    if (currentCompany.id !== "tupaginaya" && currentCompany.id !== "paginas" || role === "admin_tpy") {
      router.replace("/admin")
    }
  }, [currentCompany.id])

  const [tab, setTab] = useState<Tab>("clientes")
  const [isLoading, setIsLoading] = useState(true)

  // ── Clients state ──────────────────────────────────────────────────────────
  const [clients, setClients] = useState<TPY_SoftwareClient[]>([])
  const [stats, setStats] = useState({ total: 0, activos: 0, morosos: 0, inactivos: 0, paidThisMonth: 0, monthlyTotal: 0 })
  const [clientSearch, setClientSearch] = useState("")
  const [clientStatusFilter, setClientStatusFilter] = useState<"all" | ClientStatus>("all")

  // ── Transactions state ─────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<TPY_SoftwareTransaction[]>([])
  const [totals, setTotals] = useState({ ingresos: 0, egresos: 0, balance: 0 })
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  // ── Client modal state ─────────────────────────────────────────────────────
  const [clientModal, setClientModal] = useState<{ open: boolean; editing: TPY_SoftwareClient | null }>({ open: false, editing: null })
  const [clientForm, setClientForm] = useState({
    name: "", email: "", phone: "", whatsapp: "",
    crmName: "", plan: "", monthlyAmount: "", billingDay: "1",
    status: "activo" as ClientStatus, notes: "",
  })
  const [isSavingClient, setIsSavingClient] = useState(false)

  // ── Payment modal state ────────────────────────────────────────────────────
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; client: TPY_SoftwareClient | null }>({ open: false, client: null })
  const [paymentForm, setPaymentForm] = useState({
    month: currentMonth(),
    amount: "",
    paymentMethod: "transferencia",
    notes: "",
    createTransaction: true,
  })
  const [isSavingPayment, setIsSavingPayment] = useState(false)

  // ── Transaction modal state ────────────────────────────────────────────────
  const [txModal, setTxModal] = useState(false)
  const [txForm, setTxForm] = useState({
    type: "ingreso" as "ingreso" | "egreso",
    category: "",
    concept: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    month: currentMonth(),
    clientId: "",
    clientName: "",
    paymentMethod: "transferencia",
    notes: "",
  })
  const [isSavingTx, setIsSavingTx] = useState(false)

  // ── Delete confirm ─────────────────────────────────────────────────────────
  const [deleteClient, setDeleteClient] = useState<TPY_SoftwareClient | null>(null)
  const [deleteTx, setDeleteTx] = useState<TPY_SoftwareTransaction | null>(null)

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadClients()
  }, [])

  useEffect(() => {
    loadTransactions()
  }, [selectedMonth])

  const loadClients = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    setIsLoading(true)
    try {
      const res = await tpySoftwareAPI.getClients(token)
      if (res.success) {
        setClients(res.clients)
        setStats(res.stats)
      }
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los clientes", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const loadTransactions = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    try {
      const res = await tpySoftwareAPI.getTransactions(token, { month: selectedMonth })
      if (res.success) {
        setTransactions(res.transactions)
        setTotals(res.totals)
      }
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar las transacciones", variant: "destructive" })
    }
  }

  // ── Filtered clients ───────────────────────────────────────────────────────
  const filteredClients = useMemo(() => {
    let list = [...clients]
    if (clientStatusFilter !== "all") list = list.filter(c => c.status === clientStatusFilter)
    if (clientSearch.trim()) {
      const q = clientSearch.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.crmName?.toLowerCase().includes(q)
      )
    }
    return list
  }, [clients, clientStatusFilter, clientSearch])

  // ── Client CRUD ────────────────────────────────────────────────────────────
  const openNewClient = () => {
    setClientForm({ name: "", email: "", phone: "", whatsapp: "", crmName: "", plan: "", monthlyAmount: "", billingDay: "1", status: "activo", notes: "" })
    setClientModal({ open: true, editing: null })
  }

  const openEditClient = (c: TPY_SoftwareClient) => {
    setClientForm({
      name: c.name, email: c.email || "", phone: c.phone || "", whatsapp: c.whatsapp || "",
      crmName: c.crmName || "", plan: c.plan || "", monthlyAmount: String(c.monthlyAmount),
      billingDay: String(c.billingDay), status: c.status, notes: c.notes || "",
    })
    setClientModal({ open: true, editing: c })
  }

  const saveClient = async () => {
    if (!clientForm.name || !clientForm.monthlyAmount) {
      toast({ title: "Error", description: "Nombre y monto mensual son requeridos", variant: "destructive" })
      return
    }
    const token = localStorage.getItem("token")
    if (!token) return
    setIsSavingClient(true)
    try {
      const data = {
        ...clientForm,
        monthlyAmount: Number(clientForm.monthlyAmount),
        billingDay: Number(clientForm.billingDay),
      }
      if (clientModal.editing) {
        await tpySoftwareAPI.updateClient(token, clientModal.editing._id, data)
        toast({ title: "Cliente actualizado" })
      } else {
        await tpySoftwareAPI.createClient(token, data)
        toast({ title: "Cliente creado" })
      }
      setClientModal({ open: false, editing: null })
      loadClients()
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "No se pudo guardar", variant: "destructive" })
    } finally {
      setIsSavingClient(false)
    }
  }

  const confirmDeleteClient = async () => {
    if (!deleteClient) return
    const token = localStorage.getItem("token")
    if (!token) return
    try {
      await tpySoftwareAPI.deleteClient(token, deleteClient._id)
      toast({ title: "Cliente eliminado" })
      setDeleteClient(null)
      loadClients()
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" })
    }
  }

  // ── Payment ────────────────────────────────────────────────────────────────
  const openPayment = (c: TPY_SoftwareClient) => {
    setPaymentForm({
      month: currentMonth(),
      amount: String(c.monthlyAmount),
      paymentMethod: "transferencia",
      notes: "",
      createTransaction: true,
    })
    setPaymentModal({ open: true, client: c })
  }

  const savePayment = async () => {
    const { client } = paymentModal
    if (!client || !paymentForm.month || !paymentForm.amount) {
      toast({ title: "Error", description: "Completa mes y monto", variant: "destructive" })
      return
    }
    const token = localStorage.getItem("token")
    if (!token) return
    setIsSavingPayment(true)
    try {
      await tpySoftwareAPI.addPayment(token, client._id, {
        month: paymentForm.month,
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        notes: paymentForm.notes,
        createTransaction: paymentForm.createTransaction,
      })
      toast({ title: "Pago registrado", description: paymentForm.createTransaction ? "Se creó también una transacción de ingreso" : undefined })
      setPaymentModal({ open: false, client: null })
      loadClients()
      if (paymentForm.createTransaction) loadTransactions()
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "No se pudo registrar", variant: "destructive" })
    } finally {
      setIsSavingPayment(false)
    }
  }

  // ── Transaction CRUD ───────────────────────────────────────────────────────
  const saveTx = async () => {
    if (!txForm.category || !txForm.concept || !txForm.amount) {
      toast({ title: "Error", description: "Completa categoría, concepto y monto", variant: "destructive" })
      return
    }
    const token = localStorage.getItem("token")
    if (!token) return
    setIsSavingTx(true)
    try {
      await tpySoftwareAPI.createTransaction(token, {
        ...txForm,
        amount: Number(txForm.amount),
        month: txForm.date.substring(0, 7),
      })
      toast({ title: "Transacción creada" })
      setTxModal(false)
      setTxForm({ type: "ingreso", category: "", concept: "", amount: "", date: new Date().toISOString().split("T")[0], month: currentMonth(), clientId: "", clientName: "", paymentMethod: "transferencia", notes: "" })
      loadTransactions()
    } catch {
      toast({ title: "Error", description: "No se pudo crear la transacción", variant: "destructive" })
    } finally {
      setIsSavingTx(false)
    }
  }

  const confirmDeleteTx = async () => {
    if (!deleteTx) return
    const token = localStorage.getItem("token")
    if (!token) return
    try {
      await tpySoftwareAPI.deleteTransaction(token, deleteTx._id)
      toast({ title: "Transacción eliminada" })
      setDeleteTx(null)
      loadTransactions()
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" })
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <DashboardLayout requiredRole="admin">
        <div className="flex items-center justify-center h-[60vh]">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="admin">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Monitor className="h-6 w-6 text-primary" />
              Cobranzas CRM
            </h1>
            <p className="text-muted-foreground">Gestión de clientes y finanzas del negocio de software</p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total clientes</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Activos</p>
              <p className="text-2xl font-bold text-green-500">{stats.activos}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Morosos</p>
              <p className="text-2xl font-bold text-red-500">{stats.morosos}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Pagaron este mes</p>
              <p className="text-2xl font-bold text-blue-500">{stats.paidThisMonth}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 col-span-2">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Facturación mensual</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(stats.monthlyTotal)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs — admin_tpy solo ve Clientes */}
        {!isAdminTpy && (
          <div className="flex gap-1 border-b border-border">
            {(["clientes", "caja"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-5 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px",
                  tab === t
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t === "clientes" ? "Clientes CRM" : "Caja"}
              </button>
            ))}
          </div>
        )}

        {/* ── TAB CLIENTES ── */}
        {tab === "clientes" && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email o CRM..."
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={clientStatusFilter} onValueChange={v => setClientStatusFilter(v as typeof clientStatusFilter)}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="activo">Activos</SelectItem>
                  <SelectItem value="moroso">Morosos</SelectItem>
                  <SelectItem value="inactivo">Inactivos</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={openNewClient}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Cliente
              </Button>
            </div>

            {/* Table */}
            <Card className="border-border/50">
              <CardContent className="p-0">
                {filteredClients.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Monitor className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No hay clientes CRM registrados</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border/50 bg-secondary/20">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">CRM / Plan</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Mensualidad</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Último pago</th>
                          <th className="text-center px-4 py-3 font-medium text-muted-foreground">Estado</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {filteredClients.map(c => {
                          const statusCfg = STATUS_CONFIG[c.status]
                          const StatusIcon = statusCfg.icon
                          const daysSince = c.daysSinceLastPayment
                          return (
                            <tr key={c._id} className="hover:bg-secondary/10 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-medium">{c.name}</p>
                                {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                                {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell">
                                {c.crmName && <p className="font-medium">{c.crmName}</p>}
                                {c.plan && <p className="text-xs text-muted-foreground">{c.plan}</p>}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <p className="font-semibold text-primary">{formatCurrency(c.monthlyAmount)}</p>
                                <p className="text-xs text-muted-foreground">día {c.billingDay}</p>
                              </td>
                              <td className="px-4 py-3 hidden lg:table-cell">
                                {c.lastPayment ? (
                                  <>
                                    <p className="text-sm">{formatMonth(c.lastPayment.month)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {daysSince !== null && daysSince !== undefined ? `Hace ${daysSince} días` : ""}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-xs text-muted-foreground">Sin pagos</p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge className={cn("gap-1 border text-xs", statusCfg.color)}>
                                  <StatusIcon className="h-3 w-3" />
                                  {statusCfg.label}
                                </Badge>
                                {c.paidThisMonth && (
                                  <p className="text-xs text-green-500 mt-1">✓ Pagó este mes</p>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openPayment(c)}
                                    title="Registrar pago"
                                  >
                                    <CreditCard className="h-3.5 w-3.5 mr-1" />
                                    Cobrar
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => openEditClient(c)}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setDeleteClient(c)}
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
        )}

        {/* ── TAB CAJA ── */}
        {tab === "caja" && !isAdminTpy && (
          <div className="space-y-4">
            {/* Month Navigator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setSelectedMonth(prevMonth(selectedMonth))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold min-w-40 text-center">{formatMonth(selectedMonth)}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedMonth(nextMonth(selectedMonth))}
                  disabled={selectedMonth >= currentMonth()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={() => setTxModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Transacción
              </Button>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-green-500/20 bg-green-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <p className="text-xs text-muted-foreground">Ingresos</p>
                  </div>
                  <p className="text-xl font-bold text-green-500">{formatCurrency(totals.ingresos)}</p>
                </CardContent>
              </Card>
              <Card className="border-red-500/20 bg-red-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <p className="text-xs text-muted-foreground">Egresos</p>
                  </div>
                  <p className="text-xl font-bold text-red-500">{formatCurrency(totals.egresos)}</p>
                </CardContent>
              </Card>
              <Card className={cn("border-border/50", totals.balance >= 0 ? "bg-primary/5 border-primary/20" : "bg-red-500/5 border-red-500/20")}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <p className="text-xs text-muted-foreground">Balance</p>
                  </div>
                  <p className={cn("text-xl font-bold", totals.balance >= 0 ? "text-primary" : "text-red-500")}>
                    {formatCurrency(totals.balance)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Transactions table */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{transactions.length} transacciones</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Sin transacciones este mes</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border/50 bg-secondary/20">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Concepto</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Cliente</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Categoría</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Monto</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {transactions.map(tx => {
                          const isIngreso = tx.type === "ingreso"
                          const clientObj = typeof tx.clientId === "object" ? tx.clientId : null
                          return (
                            <tr key={tx._id} className="hover:bg-secondary/10 transition-colors">
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                {new Date(tx.date).toLocaleDateString("es-AR")}
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-medium">{tx.concept}</p>
                                {tx.notes && <p className="text-xs text-muted-foreground">{tx.notes}</p>}
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                                {clientObj?.name || tx.clientName || "-"}
                              </td>
                              <td className="px-4 py-3 hidden sm:table-cell">
                                <Badge variant="secondary" className="text-xs">{tx.category}</Badge>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={cn("font-semibold", isIngreso ? "text-green-500" : "text-red-500")}>
                                  {isIngreso ? "+" : "-"}{formatCurrency(tx.amount)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive h-7 w-7"
                                  onClick={() => setDeleteTx(tx)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
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
        )}
      </div>

      {/* ── Modal: Client ─────────────────────────────────────────────────────── */}
      <Dialog open={clientModal.open} onOpenChange={open => setClientModal(s => ({ ...s, open }))}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{clientModal.editing ? "Editar Cliente CRM" : "Nuevo Cliente CRM"}</DialogTitle>
            <DialogDescription>Completa los datos del cliente suscriptor al CRM</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Nombre *</Label>
                <Input value={clientForm.name} onChange={e => setClientForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre del cliente" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={clientForm.email} onChange={e => setClientForm(p => ({ ...p, email: e.target.value }))} placeholder="email@ejemplo.com" type="email" />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input value={clientForm.phone} onChange={e => setClientForm(p => ({ ...p, phone: e.target.value }))} placeholder="11 1234-5678" />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp</Label>
                <Input value={clientForm.whatsapp} onChange={e => setClientForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="11 1234-5678" />
              </div>
              <div className="space-y-1.5">
                <Label>Nombre del CRM</Label>
                <Input value={clientForm.crmName} onChange={e => setClientForm(p => ({ ...p, crmName: e.target.value }))} placeholder="Ej: CRM Empresa SRL" />
              </div>
              <div className="space-y-1.5">
                <Label>Plan</Label>
                <Input value={clientForm.plan} onChange={e => setClientForm(p => ({ ...p, plan: e.target.value }))} placeholder="Ej: Premium, Básico..." />
              </div>
              <div className="space-y-1.5">
                <Label>Monto Mensual *</Label>
                <Input value={clientForm.monthlyAmount} onChange={e => setClientForm(p => ({ ...p, monthlyAmount: e.target.value }))} placeholder="15000" type="number" min="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Día de corte</Label>
                <Input value={clientForm.billingDay} onChange={e => setClientForm(p => ({ ...p, billingDay: e.target.value }))} placeholder="1-28" type="number" min="1" max="28" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Estado</Label>
                <Select value={clientForm.status} onValueChange={v => setClientForm(p => ({ ...p, status: v as ClientStatus }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="moroso">Moroso</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Notas</Label>
                <Textarea value={clientForm.notes} onChange={e => setClientForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notas adicionales..." rows={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientModal(s => ({ ...s, open: false }))}>Cancelar</Button>
            <Button onClick={saveClient} disabled={isSavingClient}>
              {isSavingClient ? <><Spinner className="h-4 w-4 mr-2" />Guardando...</> : clientModal.editing ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Payment ────────────────────────────────────────────────────── */}
      <Dialog open={paymentModal.open} onOpenChange={open => setPaymentModal(s => ({ ...s, open }))}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              {paymentModal.client?.name} — mensualidad {formatCurrency(paymentModal.client?.monthlyAmount || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Mes *</Label>
              <Input value={paymentForm.month} onChange={e => setPaymentForm(p => ({ ...p, month: e.target.value }))} type="month" />
            </div>
            <div className="space-y-1.5">
              <Label>Monto *</Label>
              <Input value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} type="number" min="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Método de pago</Label>
              <Select value={paymentForm.paymentMethod} onValueChange={v => setPaymentForm(p => ({ ...p, paymentMethod: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Input value={paymentForm.notes} onChange={e => setPaymentForm(p => ({ ...p, notes: e.target.value }))} placeholder="Opcional" />
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <input
                type="checkbox"
                id="createTx"
                checked={paymentForm.createTransaction}
                onChange={e => setPaymentForm(p => ({ ...p, createTransaction: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="createTx" className="text-sm cursor-pointer">
                Registrar como ingreso en Caja
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModal(s => ({ ...s, open: false }))}>Cancelar</Button>
            <Button onClick={savePayment} disabled={isSavingPayment}>
              {isSavingPayment ? <><Spinner className="h-4 w-4 mr-2" />Registrando...</> : "Registrar pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: New Transaction ─────────────────────────────────────────────── */}
      <Dialog open={txModal} onOpenChange={setTxModal}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Transacción</DialogTitle>
            <DialogDescription>Registrar ingreso o egreso del CRM</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-2">
              {(["ingreso", "egreso"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTxForm(p => ({ ...p, type: t, category: "" }))}
                  className={cn(
                    "py-2.5 rounded-lg text-sm font-medium border transition-colors capitalize",
                    txForm.type === t
                      ? t === "ingreso" ? "bg-green-500/10 border-green-500/40 text-green-500" : "bg-red-500/10 border-red-500/40 text-red-500"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  )}
                >
                  {t === "ingreso" ? "↑ Ingreso" : "↓ Egreso"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoría *</Label>
                <Select value={txForm.category} onValueChange={v => setTxForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {(txForm.type === "ingreso" ? TX_CATEGORIES_INGRESO : TX_CATEGORIES_EGRESO).map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fecha *</Label>
                <Input value={txForm.date} onChange={e => setTxForm(p => ({ ...p, date: e.target.value }))} type="date" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Concepto *</Label>
                <Input value={txForm.concept} onChange={e => setTxForm(p => ({ ...p, concept: e.target.value }))} placeholder="Descripción del movimiento" />
              </div>
              <div className="space-y-1.5">
                <Label>Monto *</Label>
                <Input value={txForm.amount} onChange={e => setTxForm(p => ({ ...p, amount: e.target.value }))} type="number" min="0" placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Método de pago</Label>
                <Select value={txForm.paymentMethod} onValueChange={v => setTxForm(p => ({ ...p, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Cliente (opcional)</Label>
                <Select value={txForm.clientId} onValueChange={v => {
                  const c = clients.find(cl => cl._id === v)
                  setTxForm(p => ({ ...p, clientId: v, clientName: c?.name || "" }))
                }}>
                  <SelectTrigger><SelectValue placeholder="Sin cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin cliente</SelectItem>
                    {clients.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Notas</Label>
                <Textarea value={txForm.notes} onChange={e => setTxForm(p => ({ ...p, notes: e.target.value }))} placeholder="Opcional" rows={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxModal(false)}>Cancelar</Button>
            <Button onClick={saveTx} disabled={isSavingTx}>
              {isSavingTx ? <><Spinner className="h-4 w-4 mr-2" />Guardando...</> : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirms ───────────────────────────────────────────────────── */}
      <Dialog open={!!deleteClient} onOpenChange={open => !open && setDeleteClient(null)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Eliminar cliente</DialogTitle>
            <DialogDescription>
              ¿Eliminar a <strong>{deleteClient?.name}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteClient(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDeleteClient}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTx} onOpenChange={open => !open && setDeleteTx(null)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Eliminar transacción</DialogTitle>
            <DialogDescription>
              ¿Eliminar <strong>{deleteTx?.concept}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTx(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDeleteTx}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
