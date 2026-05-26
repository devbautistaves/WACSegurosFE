"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, Send, AlertTriangle, Clock, DollarSign, CheckCircle, Users, CreditCard } from "lucide-react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { collectionsAPI, clientsAPI, CollectionItem, Payment } from "@/lib/api"
import { useCompany } from "@/lib/company-context"
import { StatCard } from "@/components/dashboard/stat-card"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Spinner } from "@/components/ui/spinner"

export default function CollectionsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { currentCompany } = useCompany()
  
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [selectedCollection, setSelectedCollection] = useState<CollectionItem | null>(null)
  const [reminderType, setReminderType] = useState<"5_dias" | "15_dias" | "30_dias" | "manual">("manual")
  const [isSending, setIsSending] = useState(false)
  
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    period: new Date().toISOString().slice(0, 7), // YYYY-MM
    paymentMethod: "transferencia",
  })

  useEffect(() => {
    if (currentCompany.id !== "tupaginaya") {
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
      const response = await collectionsAPI.getAll(token)
      setCollections(response.collections)
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

  const handleSendReminder = async () => {
    if (!selectedCollection) return
    
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      setIsSending(true)
      const response = await collectionsAPI.sendReminder(token, selectedCollection.client._id, reminderType)
      
      if (response.emailSent) {
        toast({
          title: "Recordatorio enviado",
          description: `Se envio el recordatorio a ${selectedCollection.client.email}`,
        })
      } else {
        toast({
          title: "Recordatorio registrado",
          description: "El recordatorio se registro pero no se pudo enviar el email",
          variant: "destructive",
        })
      }
      
      setIsReminderDialogOpen(false)
      setSelectedCollection(null)
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

  const handleRegisterPayment = async () => {
    if (!selectedCollection) return
    
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      await clientsAPI.addPayment(token, selectedCollection.client._id, paymentData)
      
      toast({
        title: "Pago registrado",
        description: `Se registro el pago de $${paymentData.amount} para ${selectedCollection.client.name}`,
      })
      
      setIsPaymentDialogOpen(false)
      setSelectedCollection(null)
      setPaymentData({
        amount: 0,
        period: new Date().toISOString().slice(0, 7),
        paymentMethod: "transferencia",
      })
      fetchCollections()
    } catch (error) {
      console.error("Error registering payment:", error)
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive",
      })
    }
  }

  const openReminderDialog = (collection: CollectionItem) => {
    setSelectedCollection(collection)
    
    // Sugerir tipo de recordatorio basado en dias de mora
    if (collection.daysOverdue >= 30) {
      setReminderType("30_dias")
    } else if (collection.daysOverdue >= 15) {
      setReminderType("15_dias")
    } else if (collection.daysOverdue >= 5) {
      setReminderType("5_dias")
    } else {
      setReminderType("manual")
    }
    
    setIsReminderDialogOpen(true)
  }

  const openPaymentDialog = (collection: CollectionItem) => {
    setSelectedCollection(collection)
    setPaymentData({
      amount: collection.amountDue,
      period: new Date().toISOString().slice(0, 7),
      paymentMethod: "transferencia",
    })
    setIsPaymentDialogOpen(true)
  }

  const getOverdueColor = (days: number) => {
    if (days >= 30) return "text-red-500"
    if (days >= 15) return "text-orange-500"
    if (days >= 5) return "text-yellow-500"
    return "text-muted-foreground"
  }

  const getOverdueBadge = (days: number) => {
    if (days >= 30) return <Badge variant="destructive">Critico</Badge>
    if (days >= 15) return <Badge className="bg-orange-500">Urgente</Badge>
    if (days >= 5) return <Badge className="bg-yellow-500 text-black">Pendiente</Badge>
    return <Badge variant="secondary">Al dia</Badge>
  }

  // Calcular estadisticas
  const stats = {
    total: collections.length,
    critico: collections.filter(c => c.daysOverdue >= 30).length,
    urgente: collections.filter(c => c.daysOverdue >= 15 && c.daysOverdue < 30).length,
    pendiente: collections.filter(c => c.daysOverdue >= 5 && c.daysOverdue < 15).length,
    totalMonto: collections.reduce((sum, c) => sum + c.amountDue, 0),
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
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel de Cobranzas</h1>
        <p className="text-muted-foreground">Gestiona los pagos pendientes de clientes activos</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Clientes"
          value={stats.total}
          icon={Users}
        />
        <StatCard
          title="Criticos (+30 dias)"
          value={stats.critico}
          icon={AlertTriangle}
          className="border-red-500/50"
        />
        <StatCard
          title="Urgentes (15-30)"
          value={stats.urgente}
          icon={Clock}
          className="border-orange-500/50"
        />
        <StatCard
          title="Pendientes (5-15)"
          value={stats.pendiente}
          icon={Clock}
          className="border-yellow-500/50"
        />
        <StatCard
          title="Monto Total"
          value={`$${stats.totalMonto.toLocaleString()}`}
          icon={DollarSign}
          className="border-blue-500/50"
        />
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-4 w-4" />
              Clientes Criticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.critico}</p>
            <p className="text-xs text-muted-foreground">Mas de 30 dias sin pagar</p>
          </CardContent>
        </Card>
        
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-500">
              <Mail className="h-4 w-4" />
              Recordatorios Sugeridos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.critico + stats.urgente}</p>
            <p className="text-xs text-muted-foreground">Clientes que necesitan seguimiento</p>
          </CardContent>
        </Card>
        
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-500">
              <CheckCircle className="h-4 w-4" />
              Al Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total - stats.critico - stats.urgente - stats.pendiente}</p>
            <p className="text-xs text-muted-foreground">Clientes con pagos al dia</p>
          </CardContent>
        </Card>
      </div>

      {/* Collections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes Activos</CardTitle>
          <CardDescription>
            Lista de clientes con webs activas ordenados por dias de mora
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Negocio/Dominio</TableHead>
                <TableHead>Monto Mensual</TableHead>
                <TableHead>Ultimo Corte</TableHead>
                <TableHead>Dias de Mora</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay clientes activos para mostrar
                  </TableCell>
                </TableRow>
              ) : (
                collections.map((collection) => (
                  <TableRow key={collection.client._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{collection.client.name}</p>
                        <p className="text-sm text-muted-foreground">{collection.client.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{collection.client.businessName || "-"}</p>
                        <p className="text-sm text-muted-foreground">{collection.client.domain || "-"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${collection.amountDue.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(collection.lastBillingDate).toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell>
                      <span className={`font-bold ${getOverdueColor(collection.daysOverdue)}`}>
                        {collection.daysOverdue} dias
                      </span>
                    </TableCell>
                    <TableCell>
                      {getOverdueBadge(collection.daysOverdue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openReminderDialog(collection)}
                          disabled={!collection.client.email}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Recordar
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => openPaymentDialog(collection)}
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          Pago
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reminder Dialog */}
      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Recordatorio de Pago</DialogTitle>
            <DialogDescription>
              Se enviara un email a {selectedCollection?.client.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-secondary rounded-lg">
              <p className="font-medium">{selectedCollection?.client.name}</p>
              <p className="text-sm text-muted-foreground">{selectedCollection?.client.businessName}</p>
              <p className="text-sm mt-2">
                <span className="text-muted-foreground">Monto pendiente:</span>{" "}
                <span className="font-bold">${selectedCollection?.amountDue.toLocaleString()}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Dias de mora:</span>{" "}
                <span className={`font-bold ${getOverdueColor(selectedCollection?.daysOverdue || 0)}`}>
                  {selectedCollection?.daysOverdue} dias
                </span>
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de Recordatorio</Label>
              <Select value={reminderType} onValueChange={(v) => setReminderType(v as typeof reminderType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5_dias">Recordatorio 5 dias</SelectItem>
                  <SelectItem value="15_dias">Recordatorio 15 dias</SelectItem>
                  <SelectItem value="30_dias">Recordatorio 30 dias (Urgente)</SelectItem>
                  <SelectItem value="manual">Recordatorio Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReminderDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendReminder} disabled={isSending}>
              {isSending ? "Enviando..." : "Enviar Recordatorio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Registrar pago de {selectedCollection?.client.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto</Label>
              <Input
                id="amount"
                type="number"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="period">Periodo (Mes)</Label>
              <Input
                id="period"
                type="month"
                value={paymentData.period}
                onChange={(e) => setPaymentData({ ...paymentData, period: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Metodo de Pago</Label>
              <Select 
                value={paymentData.paymentMethod} 
                onValueChange={(v) => setPaymentData({ ...paymentData, paymentMethod: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="mercadopago">MercadoPago</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegisterPayment}>
              Registrar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  )
}
