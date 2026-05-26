"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, DollarSign, CheckCircle, Clock, Users, Wallet } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { liquidationsAPI, usersAPI, Liquidation, User } from "@/lib/api"
import { useCompany } from "@/lib/company-context"
import { StatCard } from "@/components/dashboard/stat-card"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Spinner } from "@/components/ui/spinner"

const statusConfig: Record<string, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "bg-yellow-500" },
  pagado: { label: "Pagado", color: "bg-emerald-500" },
  anulado: { label: "Anulado", color: "bg-red-500" },
}

export default function LiquidationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { currentCompany } = useCompany()
  
  const [liquidations, setLiquidations] = useState<Liquidation[]>([])
  const [sellers, setSellers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false)
  const [selectedLiquidation, setSelectedLiquidation] = useState<Liquidation | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [statusFilter, setStatusFilter] = useState<string>("all")
  
  const [formData, setFormData] = useState({
    userId: "",
    period: new Date().toISOString().slice(0, 7),
    totalAmount: 0,
    notes: "",
  })
  
  const [paymentMethod, setPaymentMethod] = useState("transferencia")

  useEffect(() => {
    if (currentCompany.id !== "tupaginaya") {
      router.push("/admin")
      return
    }
    
    fetchData()
  }, [currentCompany, selectedMonth, statusFilter])

  const fetchData = async () => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    try {
      setIsLoading(true)
      const filters: { period?: string; status?: string } = {}
      if (selectedMonth) filters.period = selectedMonth
      if (statusFilter !== "all") filters.status = statusFilter
      
      const [liquidationsRes, usersRes] = await Promise.all([
        liquidationsAPI.getAll(token, filters),
        usersAPI.getAll(token),
      ])
      
      setLiquidations(liquidationsRes.liquidations)
      setSellers(usersRes.users.filter(u => u.role === "seller" || u.role === "supervisor"))
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las liquidaciones",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateLiquidation = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    if (!formData.userId || !formData.totalAmount) {
      toast({
        title: "Error",
        description: "Por favor selecciona un usuario y monto",
        variant: "destructive",
      })
      return
    }

    try {
      await liquidationsAPI.create(token, formData)
      toast({
        title: "Liquidacion creada",
        description: "La liquidacion se creo correctamente",
      })
      setIsCreateDialogOpen(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error("Error creating liquidation:", error)
      toast({
        title: "Error",
        description: "No se pudo crear la liquidacion",
        variant: "destructive",
      })
    }
  }

  const handlePayLiquidation = async () => {
    if (!selectedLiquidation) return
    
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      await liquidationsAPI.pay(token, selectedLiquidation._id, { paymentMethod })
      toast({
        title: "Liquidacion pagada",
        description: "La liquidacion se marco como pagada",
      })
      setIsPayDialogOpen(false)
      setSelectedLiquidation(null)
      fetchData()
    } catch (error) {
      console.error("Error paying liquidation:", error)
      toast({
        title: "Error",
        description: "No se pudo pagar la liquidacion",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      userId: "",
      period: new Date().toISOString().slice(0, 7),
      totalAmount: 0,
      notes: "",
    })
  }

  // Stats
  const stats = {
    total: liquidations.length,
    pendientes: liquidations.filter(l => l.status === "pendiente").length,
    pagadas: liquidations.filter(l => l.status === "pagado").length,
    montoPendiente: liquidations.filter(l => l.status === "pendiente").reduce((sum, l) => sum + l.totalAmount, 0),
    montoPagado: liquidations.filter(l => l.status === "pagado").reduce((sum, l) => sum + l.totalAmount, 0),
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
            <h1 className="text-2xl font-bold text-foreground">Liquidaciones</h1>
          <p className="text-muted-foreground">Gestion de pagos a vendedores</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Liquidacion
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Liquidaciones"
          value={stats.total}
          icon={Wallet}
        />
        <StatCard
          title="Pendientes"
          value={stats.pendientes}
          icon={Clock}
          className="border-yellow-500/50"
        />
        <StatCard
          title="Monto Pendiente"
          value={`$${stats.montoPendiente.toLocaleString()}`}
          icon={DollarSign}
          className="border-orange-500/50"
        />
        <StatCard
          title="Monto Pagado"
          value={`$${stats.montoPagado.toLocaleString()}`}
          icon={CheckCircle}
          className="border-emerald-500/50"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="space-y-2">
              <Label>Periodo</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full md:w-48"
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                  <SelectItem value="pagado">Pagadas</SelectItem>
                  <SelectItem value="anulado">Anuladas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liquidations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liquidaciones ({liquidations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Pago</TableHead>
                <TableHead>Metodo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liquidations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay liquidaciones en este periodo
                  </TableCell>
                </TableRow>
              ) : (
                liquidations.map((liquidation) => (
                  <TableRow key={liquidation._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {typeof liquidation.userId === "object" ? liquidation.userId?.name : "-"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {typeof liquidation.userId === "object" ? liquidation.userId?.email : ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{liquidation.period}</TableCell>
                    <TableCell className="font-bold">
                      ${liquidation.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[liquidation.status]?.color || "bg-gray-500"}>
                        {statusConfig[liquidation.status]?.label || liquidation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {liquidation.paidAt 
                        ? new Date(liquidation.paidAt).toLocaleDateString("es-AR")
                        : "-"
                      }
                    </TableCell>
                    <TableCell className="capitalize">
                      {liquidation.paymentMethod || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {liquidation.status === "pendiente" && (
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedLiquidation(liquidation)
                            setIsPayDialogOpen(true)
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Pagar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Liquidacion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Usuario *</Label>
              <Select 
                value={formData.userId} 
                onValueChange={(v) => setFormData({ ...formData, userId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un usuario" />
                </SelectTrigger>
                <SelectContent>
                  {sellers.map((seller) => (
                    <SelectItem key={seller._id} value={seller._id}>
                      {seller.name} ({seller.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Periodo</Label>
                <Input
                  type="month"
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Monto Total *</Label>
                <Input
                  type="number"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: Number(e.target.value) })}
                  placeholder="50000"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false)
              resetForm()
            }}>
              Cancelar
            </Button>
            <Button onClick={handleCreateLiquidation}>
              Crear Liquidacion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagar Liquidacion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-secondary rounded-lg">
              <p className="font-medium">
                {typeof selectedLiquidation?.userId === "object" 
                  ? selectedLiquidation?.userId?.name 
                  : "-"
                }
              </p>
              <p className="text-sm text-muted-foreground">
                Periodo: {selectedLiquidation?.period}
              </p>
              <p className="text-2xl font-bold mt-2">
                ${selectedLiquidation?.totalAmount.toLocaleString()}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Metodo de Pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="mercadopago">MercadoPago</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsPayDialogOpen(false)
              setSelectedLiquidation(null)
            }}>
              Cancelar
            </Button>
            <Button onClick={handlePayLiquidation}>
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  )
}
