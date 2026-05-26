"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, TrendingUp, TrendingDown, DollarSign, Filter, ArrowUpRight, ArrowDownRight, Trash2, Zap, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { transactionsAPI, Transaction, TransactionType, clientsAPI, tpyTransactionsAPI, TPY_Transaction, tpyClientsAPI, TPY_Client } from "@/lib/api"
import { useCompany } from "@/lib/company-context"
import { StatCard } from "@/components/dashboard/stat-card"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Spinner } from "@/components/ui/spinner"

const CATEGORIES = {
  ingreso: [
    "Pago mensualidad",
    "Pago setup",
    "Servicio adicional",
    "Renovacion",
    "Otro ingreso",
  ],
  egreso: [
    "Liquidacion vendedor",
    "Hosting/Dominio",
    "Publicidad",
    "Herramientas",
    "Servicios profesionales",
    "Gastos operativos",
    "Otro egreso",
  ],
}

export default function TransactionsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { currentCompany } = useCompany()
  
  const [transactions, setTransactions] = useState<TPY_Transaction[]>([])
  const [summary, setSummary] = useState<{ ingresos: number; egresos: number; balance: number } | null>(null)
  const [activationTotal, setActivationTotal] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<TPY_Transaction | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [clients, setClients] = useState<TPY_Client[]>([])
  
  const [formData, setFormData] = useState({
    type: "ingreso" as TransactionType,
    category: "",
    amount: 0,
    description: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
    clientId: "",
  })

  useEffect(() => {
    if (currentCompany.id !== "tupaginaya" && currentCompany.id !== "paginas") {
      router.push("/admin")
      return
    }
    
    fetchData()
  }, [currentCompany, selectedMonth, typeFilter])

  const fetchData = async () => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    try {
      setIsLoading(true)
      const filters: { type?: string; month?: string } = {}
      if (selectedMonth !== "all") filters.month = selectedMonth
      if (typeFilter !== "all") filters.type = typeFilter
      
      // Usar nueva API TPY - cargar transacciones y clientes en paralelo
      const [transactionsRes, clientsRes] = await Promise.all([
        tpyTransactionsAPI.getAll(token, filters),
        tpyClientsAPI.getAll(token),
      ])
      
      setTransactions(transactionsRes.transactions || [])
      setSummary(transactionsRes.totals)
      setClients(clientsRes.clients || [])
      
      // Calcular activaciones del mes desde transacciones de tipo "activacion"
      const activaciones = (transactionsRes.transactions || [])
        .filter((t: TPY_Transaction) => t.type === "ingreso" && t.category === "activacion")
        .reduce((sum: number, t: TPY_Transaction) => sum + t.amount, 0)
      
      setActivationTotal(activaciones)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las transacciones",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete) return
    
    const token = localStorage.getItem("token")
    if (!token) return
    
    try {
      setIsDeleting(true)
      await tpyTransactionsAPI.delete(token, transactionToDelete._id)
      toast({
        title: "Transaccion eliminada",
        description: "La transaccion fue eliminada correctamente",
      })
      setDeleteDialogOpen(false)
      setTransactionToDelete(null)
      fetchData()
    } catch (error) {
      console.error("Error deleting transaction:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la transaccion",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCreateTransaction = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    if (!formData.category || !formData.amount || !formData.description) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    try {
      // Mapear los campos del formulario al schema del backend
      // El backend usa "concept" en lugar de "description"
      const selectedClient = clients.find(c => c._id === formData.clientId)
      const transactionData = {
        type: formData.type,
        category: formData.category,
        concept: formData.description, // Mapear description -> concept
        amount: formData.amount,
        date: formData.date,
        notes: formData.notes,
        clientId: formData.clientId || undefined,
        clientName: selectedClient?.name || undefined,
      }
      
      await tpyTransactionsAPI.create(token, transactionData as any)
      toast({
        title: "Transaccion creada",
        description: `Se registro el ${formData.type} correctamente`,
      })
      setIsDialogOpen(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error("Error creating transaction:", error)
      toast({
        title: "Error",
        description: "No se pudo crear la transaccion",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      type: "ingreso",
      category: "",
      amount: 0,
      description: "",
      date: new Date().toISOString().slice(0, 10),
      notes: "",
      clientId: "",
    })
  }

  if (isLoading) {
    return (
      <DashboardLayout requiredRole="admin">
        <div className="flex items-center justify-center h-64">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ingresos y Egresos</h1>
          <p className="text-muted-foreground">
            {selectedMonth === "all" 
              ? "Vista general - Todos los movimientos" 
              : `Movimientos de ${new Date(selectedMonth + "-01").toLocaleDateString("es-AR", { month: "long", year: "numeric" })}`
            }
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Transaccion
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-emerald-500">
                {selectedMonth === "all" ? "Total Ingresos" : "Ingresos del Mes"}
              </CardTitle>
              <ArrowUpRight className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-500">
                ${summary.ingresos.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-red-500/30 bg-red-500/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-red-500">
                {selectedMonth === "all" ? "Total Egresos" : "Egresos del Mes"}
              </CardTitle>
              <ArrowDownRight className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-500">
                ${summary.egresos.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          
          <Card className={`${summary.balance >= 0 ? "border-blue-500/30 bg-blue-500/5" : "border-orange-500/30 bg-orange-500/5"}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className={`text-sm font-medium ${summary.balance >= 0 ? "text-blue-500" : "text-orange-500"}`}>
                {selectedMonth === "all" ? "Balance General" : "Balance del Mes"}
              </CardTitle>
              <DollarSign className={`h-5 w-5 ${summary.balance >= 0 ? "text-blue-500" : "text-orange-500"}`} />
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${summary.balance >= 0 ? "text-blue-500" : "text-orange-500"}`}>
                ${summary.balance.toLocaleString()}
              </p>
              {selectedMonth === "all" && (
                <p className="text-xs text-muted-foreground mt-1">Acumulado historico</p>
              )}
            </CardContent>
          </Card>
          
          <Card className="border-purple-500/30 bg-purple-500/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-purple-500">
                {selectedMonth === "all" ? "Total Activaciones" : "Activaciones del Mes"}
              </CardTitle>
              <Zap className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-500">
                ${activationTotal.toLocaleString()}
              </p>
              <p className="text-xs text-purple-400 mt-1">
                Monto de setups cobrados
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="space-y-2">
              <Label>Mes</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Seleccionar mes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los meses</SelectItem>
                  <SelectItem value="2026-05">Mayo 2026</SelectItem>
                  <SelectItem value="2026-04">Abril 2026</SelectItem>
                  <SelectItem value="2026-03">Marzo 2026</SelectItem>
                  <SelectItem value="2026-02">Febrero 2026</SelectItem>
                  <SelectItem value="2026-01">Enero 2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ingreso">Solo Ingresos</SelectItem>
                  <SelectItem value="egreso">Solo Egresos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dual Column View - Like Excel CAJA */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* INGRESOS Column */}
        <Card className="border-emerald-500/30">
          <CardHeader className="bg-emerald-500/10 border-b border-emerald-500/20">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-emerald-500">
                <TrendingUp className="h-5 w-5" />
                INGRESOS
              </span>
              <span className="text-xl text-emerald-400">
                ${summary?.ingresos.toLocaleString() || 0}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.filter(t => t.type === "ingreso").length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      {selectedMonth === "all" ? "Sin ingresos registrados" : "Sin ingresos este mes"}
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.filter(t => t.type === "ingreso").map((transaction) => (
                    <TableRow key={transaction._id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(transaction.date).toLocaleDateString("es-AR", { day: "numeric", month: "numeric" })}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {transaction.concept}
                      </TableCell>
                      <TableCell className="text-right font-medium text-emerald-500">
                        ${transaction.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => {
                            setTransactionToDelete(transaction)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* EGRESOS Column */}
        <Card className="border-red-500/30">
          <CardHeader className="bg-red-500/10 border-b border-red-500/20">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-red-500">
                <TrendingDown className="h-5 w-5" />
                EGRESOS
              </span>
              <span className="text-xl text-red-400">
                ${summary?.egresos.toLocaleString() || 0}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.filter(t => t.type === "egreso").length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      {selectedMonth === "all" ? "Sin egresos registrados" : "Sin egresos este mes"}
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.filter(t => t.type === "egreso").map((transaction) => (
                    <TableRow key={transaction._id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(transaction.date).toLocaleDateString("es-AR", { day: "numeric", month: "numeric" })}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {transaction.concept}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-500">
                        ${transaction.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => {
                            setTransactionToDelete(transaction)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table - Full Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Transacciones ({transactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descripcion</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay transacciones en este periodo
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction._id}>
                    <TableCell>
                      {new Date(transaction.date).toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell>
                      <Badge className={transaction.type === "ingreso" ? "bg-emerald-500" : "bg-red-500"}>
                        {transaction.type === "ingreso" ? (
                          <TrendingUp className="mr-1 h-3 w-3" />
                        ) : (
                          <TrendingDown className="mr-1 h-3 w-3" />
                        )}
                        {transaction.type === "ingreso" ? "Ingreso" : "Egreso"}
                      </Badge>
                    </TableCell>
                    <TableCell>{transaction.category}</TableCell>
                    <TableCell className="max-w-xs truncate">{transaction.concept}</TableCell>
                    <TableCell>
                      {typeof transaction.clientId === "object" 
                        ? transaction.clientId?.name || transaction.clientId?.businessName || "-"
                        : "-"
                      }
                    </TableCell>
                    <TableCell className={`text-right font-bold ${transaction.type === "ingreso" ? "text-emerald-500" : "text-red-500"}`}>
                      {transaction.type === "ingreso" ? "+" : "-"}${transaction.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => {
                          setTransactionToDelete(transaction)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Transaction Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Transaccion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData({ ...formData, type: v as TransactionType, category: "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ingreso">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      Ingreso
                    </span>
                  </SelectItem>
                  <SelectItem value="egreso">
                    <span className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      Egreso
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES[formData.type].map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Monto *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  placeholder="10000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descripcion *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripcion de la transaccion"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notas adicionales</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas opcionales..."
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Asignar a Cliente (opcional)</Label>
              <Select 
                value={formData.clientId || "none"} 
                onValueChange={(v) => setFormData({ ...formData, clientId: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin cliente asignado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cliente asignado</SelectItem>
                  {clients
                    .filter(c => c.status === "web_activada")
                    .map((client) => (
                      <SelectItem key={client._id} value={client._id}>
                        {client.name} - {client.webName || client.domain || "Sin web"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Solo se muestran clientes con web activada
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setIsDialogOpen(false)
              resetForm()
            }}>
              Cancelar
            </Button>
          <Button onClick={handleCreateTransaction}>
            Crear Transaccion
          </Button>
        </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Transaccion</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente la transaccion:
              <br />
              <strong className={transactionToDelete?.type === "ingreso" ? "text-emerald-500" : "text-red-500"}>
                {transactionToDelete?.type === "ingreso" ? "Ingreso" : "Egreso"}: ${transactionToDelete?.amount.toLocaleString()}
              </strong>
              <br />
              {transactionToDelete?.concept}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTransaction}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
