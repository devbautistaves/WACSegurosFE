"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Mail, Send, AlertTriangle, Clock, DollarSign, CheckCircle, Users, CreditCard, 
  Calendar, Eye, Phone, Globe, X, ChevronDown, ChevronUp, History, Bell, RefreshCw, Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  DialogDescription,
  DialogFooter,
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { tpyCollectionsAPI, TPY_Collection } from "@/lib/api"
import { useCompany } from "@/lib/company-context"
import { StatCard } from "@/components/dashboard/stat-card"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Spinner } from "@/components/ui/spinner"

export default function CollectionsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { currentCompany } = useCompany()
  
  const [collections, setCollections] = useState<TPY_Collection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  
  // Dialogs
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false)
  const [selectedCollection, setSelectedCollection] = useState<TPY_Collection | null>(null)
  
  // Form states
  const [paymentData, setPaymentData] = useState({
    month: new Date().toISOString().slice(0, 7),
    amount: 0,
    paymentMethod: "transferencia",
    notes: "",
  })
  const [reminderType, setReminderType] = useState<"5_dias" | "15_dias" | "30_dias" | "manual">("manual")
  const [reminderNotes, setReminderNotes] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [collectionToDelete, setCollectionToDelete] = useState<TPY_Collection | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Estadisticas
  const [stats, setStats] = useState({
    total: 0,
    alDia: 0,
    pendiente: 0,
    atrasado: 0,
    critico: 0,
    montoMensualTotal: 0,
  })

  useEffect(() => {
    if (currentCompany.id !== "paginas" && currentCompany.id !== "seguros") {
      router.push("/admin")
      return
    }
    
    fetchCollections()
  }, [currentCompany])

  const fetchCollections = async () => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    try {
      setIsLoading(true)
      const response = await tpyCollectionsAPI.getAll(token)
      setCollections(response.collections || [])
      setStats(response.stats || {
        total: 0,
        alDia: 0,
        pendiente: 0,
        atrasado: 0,
        critico: 0,
        montoMensualTotal: 0,
      })
    } catch (error) {
      console.error("Error fetching collections:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las cobranzas",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSync = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      setIsSyncing(true)
      const response = await tpyCollectionsAPI.sync(token)
      toast({
        title: "Sincronizacion completada",
        description: response.message,
      })
      await fetchCollections()
    } catch (error) {
      console.error("Error syncing:", error)
      toast({
        title: "Error",
        description: "No se pudo sincronizar",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const [isAddingWithTransaction, setIsAddingWithTransaction] = useState(false)

  const handleAddPayment = async (withTransaction: boolean) => {
    if (!selectedCollection) return
    
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      setIsSending(true)
      setIsAddingWithTransaction(withTransaction)
      const response = await tpyCollectionsAPI.addPayment(token, selectedCollection._id, {
        ...paymentData,
        createTransaction: withTransaction,
      })
      
      toast({
        title: withTransaction ? "Pago registrado + Ingreso creado" : "Marcado como cobrado",
        description: withTransaction 
          ? `Se registro el pago y se creo la transaccion de ingreso` 
          : `Se marco como cobrado sin crear transaccion`,
      })
      
      setIsPaymentDialogOpen(false)
      setSelectedCollection(null)
      setPaymentData({
        month: new Date().toISOString().slice(0, 7),
        amount: 0,
        paymentMethod: "transferencia",
        notes: "",
      })
      fetchCollections()
    } catch (error) {
      console.error("Error registering payment:", error)
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
      setIsAddingWithTransaction(false)
    }
  }

  const handleSendReminder = async () => {
    if (!selectedCollection) return
    
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      setIsSending(true)
      const response = await tpyCollectionsAPI.sendReminder(token, selectedCollection._id, reminderType, reminderNotes)
      
      toast({
        title: response.emailSent ? "Recordatorio enviado" : "Recordatorio registrado",
        description: response.message,
      })
      
      setIsReminderDialogOpen(false)
      setSelectedCollection(null)
      setReminderType("manual")
      setReminderNotes("")
      fetchCollections()
    } catch (error) {
      console.error("Error sending reminder:", error)
      toast({
        title: "Error",
        description: "No se pudo enviar el recordatorio",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleDeleteCollection = async () => {
    if (!collectionToDelete) return
    
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      setIsDeleting(true)
      const response = await tpyCollectionsAPI.delete(token, collectionToDelete._id)
      
      toast({
        title: "Cliente eliminado",
        description: response.message,
      })
      
      setDeleteDialogOpen(false)
      setCollectionToDelete(null)
      fetchCollections()
    } catch (error) {
      console.error("Error deleting collection:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente de cobranzas",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeletePayment = async (collectionId: string, paymentId: string) => {
    const token = localStorage.getItem("token")
    if (!token) return

    if (!confirm("¿Estas seguro de eliminar este pago?")) return

    try {
      const response = await tpyCollectionsAPI.deletePayment(token, collectionId, paymentId)
      
      toast({
        title: "Pago eliminado",
        description: response.message,
      })
      
      // Actualizar la coleccion seleccionada con los nuevos datos
      setSelectedCollection(response.collection)
      fetchCollections()
    } catch (error) {
      console.error("Error deleting payment:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el pago",
        variant: "destructive",
      })
    }
  }

  const openDetailDialog = (collection: TPY_Collection) => {
    setSelectedCollection(collection)
    setIsDetailDialogOpen(true)
  }

  const openPaymentDialog = (collection: TPY_Collection) => {
    setSelectedCollection(collection)
    setPaymentData({
      month: new Date().toISOString().slice(0, 7),
      amount: collection.monthlyAmount || 15000,
      paymentMethod: "transferencia",
      notes: "",
    })
    setIsPaymentDialogOpen(true)
  }

  const openReminderDialog = (collection: TPY_Collection) => {
    setSelectedCollection(collection)
    // Sugerir tipo de recordatorio basado en dias
    const days = collection.daysSinceLastPayment || 0
    if (days >= 30) {
      setReminderType("30_dias")
    } else if (days >= 15) {
      setReminderType("15_dias")
    } else if (days >= 5) {
      setReminderType("5_dias")
    } else {
      setReminderType("manual")
    }
    setIsReminderDialogOpen(true)
  }

  const getStatusBadge = (status: string, days?: number) => {
    switch (status) {
      case "al_dia":
        return <Badge className="bg-green-500/20 text-green-500">Al dia</Badge>
      case "pendiente":
        return <Badge className="bg-yellow-500/20 text-yellow-600">Pendiente</Badge>
      case "atrasado":
        return <Badge className="bg-orange-500/20 text-orange-500">Atrasado</Badge>
      case "critico":
        return <Badge variant="destructive">Critico</Badge>
      case "pausado":
        return <Badge variant="secondary">Pausado</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getDaysColor = (days: number) => {
    if (days >= 30) return "text-red-500"
    if (days >= 15) return "text-orange-500"
    if (days >= 5) return "text-yellow-500"
    return "text-green-500"
  }

  // Filtrar colecciones
  const filteredCollections = collections.filter(c => {
    // Filtro por estado
    if (statusFilter !== "all" && c.status !== statusFilter) return false
    
    // Filtro por busqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        c.clientName?.toLowerCase().includes(query) ||
        c.webName?.toLowerCase().includes(query) ||
        c.domain?.toLowerCase().includes(query) ||
        c.clientEmail?.toLowerCase().includes(query)
      )
    }
    return true
  })

  // Ordenar: primero los que necesitan recordatorio (15+ dias)
  const sortedCollections = [...filteredCollections].sort((a, b) => {
    // Primero los criticos, luego atrasados, etc
    const statusOrder: Record<string, number> = { critico: 0, atrasado: 1, pendiente: 2, al_dia: 3, pausado: 4 }
    return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99)
  })

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Panel de Cobranzas</h1>
            <p className="text-muted-foreground">Gestiona los pagos de clientes activos</p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleSync} 
            disabled={isSyncing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Sincronizando..." : "Sincronizar Clientes"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            title="Total Clientes"
            value={stats.total}
            icon={Users}
          />
          <StatCard
            title="Al Dia"
            value={stats.alDia}
            icon={CheckCircle}
            className="border-green-500/50"
          />
          <StatCard
            title="Pendientes (15-30)"
            value={stats.pendiente}
            icon={Clock}
            className="border-yellow-500/50"
          />
          <StatCard
            title="Atrasados (30-45)"
            value={stats.atrasado}
            icon={AlertTriangle}
            className="border-orange-500/50"
          />
          <StatCard
            title="Criticos (+45)"
            value={stats.critico}
            icon={AlertTriangle}
            className="border-red-500/50"
          />
          <StatCard
            title="Monto Mensual"
            value={`$${stats.montoMensualTotal?.toLocaleString() || 0}`}
            icon={DollarSign}
            className="border-blue-500/50"
          />
        </div>

        {/* Alerta de clientes que necesitan recordatorio */}
        {collections.filter(c => c.needsReminder).length > 0 && (
          <Card className="border-orange-500/50 bg-orange-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-medium text-orange-500">
                    {collections.filter(c => c.needsReminder).length} clientes necesitan recordatorio
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Han pasado mas de 15 dias desde su ultimo pago
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Input
                  placeholder="Buscar por nombre, web, dominio o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-secondary/50">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="al_dia">Al dia</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                  <SelectItem value="atrasado">Atrasados</SelectItem>
                  <SelectItem value="critico">Criticos</SelectItem>
                  <SelectItem value="pausado">Pausados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Cobranzas */}
        <Card className="overflow-hidden">
          <CardHeader className="px-3 sm:px-6">
            <CardTitle className="text-base sm:text-lg">Clientes ({sortedCollections.length})</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Ordenados por urgencia de cobro
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Cliente</TableHead>
                    <TableHead className="text-xs sm:text-sm">Web / Dominio</TableHead>
                    <TableHead className="text-xs sm:text-sm">Monto Mensual</TableHead>
                      <TableHead className="text-xs sm:text-sm">Ultimo Mes</TableHead>
                    <TableHead className="text-xs sm:text-sm">Dias</TableHead>
                    <TableHead className="text-xs sm:text-sm">Estado</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCollections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No hay clientes para mostrar
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedCollections.map((collection) => (
                      <TableRow 
                        key={collection._id}
                        className={collection.needsReminder ? "bg-orange-500/5" : ""}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{collection.clientName}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {collection.clientPhone || "-"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{collection.webName}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {collection.domain || "-"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${collection.monthlyAmount?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell>
                          {collection.lastPaidMonth ? (
                            <div>
                              <p className="font-medium">{collection.lastPaidMonth}</p>
                              <p className="text-sm text-muted-foreground">
                                ${collection.lastPaymentAmount?.toLocaleString() || 0}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Sin pagos</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`font-bold ${getDaysColor(collection.daysSinceLastPayment || 0)}`}>
                            {collection.daysSinceLastPayment || "?"} dias
                          </span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(collection.status, collection.daysSinceLastPayment)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openDetailDialog(collection)}
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openReminderDialog(collection)}
                              disabled={!collection.clientEmail}
                              title={collection.clientEmail ? "Enviar recordatorio" : "Sin email"}
                              className={collection.needsReminder ? "border-orange-500 text-orange-500" : ""}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => openPaymentDialog(collection)}
                              title="Registrar pago"
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCollectionToDelete(collection)
                                setDeleteDialogOpen(true)
                              }}
                              title="Eliminar de cobranzas"
                              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            >
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

        {/* Dialog de Detalles */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalles de Cobranza</DialogTitle>
              <DialogDescription>
                {selectedCollection?.clientName} - {selectedCollection?.webName}
              </DialogDescription>
            </DialogHeader>
            
            {selectedCollection && (
              <div className="space-y-6">
                {/* Info del cliente */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Cliente</Label>
                    <p className="font-medium">{selectedCollection.clientName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Telefono</Label>
                    <p className="font-medium">{selectedCollection.clientPhone || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedCollection.clientEmail || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Dominio</Label>
                    <p className="font-medium">{selectedCollection.domain || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Monto Mensual</Label>
                    <p className="font-medium">${selectedCollection.monthlyAmount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Estado</Label>
                    <div className="mt-1">{getStatusBadge(selectedCollection.status)}</div>
                  </div>
                </div>

                {/* Ultimo pago */}
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Label>Ultimo Mes Pagado</Label>
                  </div>
                  {selectedCollection.lastPaidMonth ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-lg">
                          {selectedCollection.lastPaidMonth}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Monto: ${selectedCollection.lastPaymentAmount?.toLocaleString()}
                        </p>
                      </div>
                      <div className={`text-2xl font-bold ${getDaysColor(selectedCollection.daysSinceLastPayment || 0)}`}>
                        {selectedCollection.daysSinceLastPayment === 0 ? "Al dia" : `${selectedCollection.daysSinceLastPayment} dias`}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Sin pagos registrados</p>
                  )}
                </div>

                {/* Historial de pagos */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <Label>Historial de Pagos ({selectedCollection.payments?.length || 0})</Label>
                  </div>
                  {selectedCollection.payments && selectedCollection.payments.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedCollection.payments.slice().reverse().map((payment, idx) => (
                        <div key={payment._id || idx} className="flex items-center justify-between p-3 bg-secondary/20 rounded group">
                          <div>
                            <p className="font-medium">{payment.month}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(payment.paymentDate).toLocaleDateString("es-AR")} - {payment.paymentMethod}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-green-500">
                              ${payment.amount.toLocaleString()}
                            </span>
                            {payment._id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeletePayment(selectedCollection._id, payment._id!)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No hay pagos registrados</p>
                  )}
                </div>

                {/* Historial de recordatorios */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <Label>Recordatorios Enviados ({selectedCollection.reminders?.length || 0})</Label>
                  </div>
                  {selectedCollection.reminders && selectedCollection.reminders.length > 0 ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {selectedCollection.reminders.slice().reverse().map((reminder, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-secondary/20 rounded">
                          <div>
                            <p className="font-medium capitalize">{reminder.type.replace("_", " ")}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(reminder.sentAt).toLocaleDateString("es-AR")}
                            </p>
                          </div>
                          <Badge variant={reminder.emailSent ? "default" : "secondary"}>
                            {reminder.emailSent ? "Email enviado" : "Sin email"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No hay recordatorios</p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                Cerrar
              </Button>
              <Button onClick={() => {
                setIsDetailDialogOpen(false)
                if (selectedCollection) openPaymentDialog(selectedCollection)
              }}>
                <CreditCard className="mr-2 h-4 w-4" />
                Registrar Pago
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Pago */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Registrar Pago
              </DialogTitle>
              <DialogDescription>
                {selectedCollection?.clientName}
              </DialogDescription>
            </DialogHeader>
            
            {/* Info del cliente */}
            <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedCollection?.webName}</p>
                  <p className="text-sm text-muted-foreground">{selectedCollection?.domain}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Monto mensual</p>
                  <p className="text-lg font-bold text-primary">
                    ${selectedCollection?.monthlyAmount?.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-month">Periodo</Label>
                <Input
                  id="payment-month"
                  type="month"
                  value={paymentData.month}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, month: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Monto</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                  <Input
                    id="payment-amount"
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="payment-method">Metodo de pago</Label>
              <Select 
                value={paymentData.paymentMethod} 
                onValueChange={(v) => setPaymentData(prev => ({ ...prev, paymentMethod: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia bancaria</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="mercadopago">MercadoPago</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="payment-notes">Notas (opcional)</Label>
              <Textarea
                id="payment-notes"
                value={paymentData.notes}
                onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>

            {/* Botones de accion */}
            <div className="flex flex-col gap-2 pt-2">
              <Button 
                onClick={() => handleAddPayment(true)} 
                disabled={isSending || !paymentData.amount}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {isSending && isAddingWithTransaction ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Cobrar y Registrar Ingreso
                  </>
                )}
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsPaymentDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  variant="secondary"
                  onClick={() => handleAddPayment(false)} 
                  disabled={isSending || !paymentData.amount}
                  className="flex-1"
                >
                  {isSending && !isAddingWithTransaction ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Marcando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Solo Marcar Cobrado
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Recordatorio */}
        <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Recordatorio de Cobro</DialogTitle>
              <DialogDescription>
                {selectedCollection?.clientName} - {selectedCollection?.clientEmail || "Sin email"}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-4 bg-secondary/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Dias desde ultimo pago</p>
                <p className={`text-2xl font-bold ${getDaysColor(selectedCollection?.daysSinceLastPayment || 0)}`}>
                  {selectedCollection?.daysSinceLastPayment || "?"} dias
                </p>
              </div>

              <div>
                <Label htmlFor="reminder-type">Tipo de recordatorio</Label>
                <Select value={reminderType} onValueChange={(v: any) => setReminderType(v)}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5_dias">5 dias - Recordatorio amable</SelectItem>
                    <SelectItem value="15_dias">15 dias - Recordatorio urgente</SelectItem>
                    <SelectItem value="30_dias">30 dias - Aviso de suspension</SelectItem>
                    <SelectItem value="manual">Manual - Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reminder-notes">Notas adicionales (opcional)</Label>
                <Textarea
                  id="reminder-notes"
                  value={reminderNotes}
                  onChange={(e) => setReminderNotes(e.target.value)}
                  placeholder="Mensaje adicional para el recordatorio..."
                  className="bg-secondary/50"
                />
              </div>

              {!selectedCollection?.clientEmail && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm text-yellow-600">
                    Este cliente no tiene email registrado. El recordatorio se guardara pero no se enviara email.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReminderDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSendReminder} disabled={isSending}>
                {isSending ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {selectedCollection?.clientEmail ? "Enviar Recordatorio" : "Registrar Recordatorio"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AlertDialog de Confirmacion para Eliminar */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar Cliente de Cobranzas</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estas seguro de eliminar a <strong>{collectionToDelete?.clientName}</strong> ({collectionToDelete?.webName}) del panel de cobranzas?
                <br /><br />
                Esta accion eliminara el perfil de cobranza incluyendo todo el historial de pagos y recordatorios. El cliente seguira existiendo en el sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCollection}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeleting ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Eliminando...
                  </>
                ) : (
                  "Eliminar"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
