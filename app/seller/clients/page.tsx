"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Filter, Eye, Mail, Globe, Users, UserCheck, Pause, Phone, Calendar, Edit, Upload, DollarSign, X, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { clientsAPI, Client } from "@/lib/api"
import { useCompany } from "@/lib/company-context"
import { StatCard } from "@/components/dashboard/stat-card"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Spinner } from "@/components/ui/spinner"

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  demo_pendiente: { label: "Demo Pendiente", color: "bg-amber-500", icon: Pause },
  demo_enviada: { label: "Demo Enviada", color: "bg-purple-500", icon: Eye },
  web_activada: { label: "Web Activada", color: "bg-emerald-500", icon: Globe },
  web_pausada: { label: "Web Pausada", color: "bg-gray-500", icon: Pause },
  cliente_baja: { label: "Cliente Baja", color: "bg-red-500", icon: Users },
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://vps-5905394-x.dattaweb.com"

export default function SellerClientsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { currentCompany } = useCompany()
  
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  
  // Estados para el modal de edicion
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    businessName: "",
    notes: "",
  })
  
  // Estados para el modal de pago
  const [paymentClient, setPaymentClient] = useState<Client | null>(null)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    notes: "",
  })
  const [paymentFile, setPaymentFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Redirigir si no es Empresa 2
    if (currentCompany.id !== "tupaginaya" && currentCompany.id !== "paginas") {
      router.push("/seller")
      return
    }
    
    fetchClients()
  }, [currentCompany, router])

  const fetchClients = async () => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    try {
      setIsLoading(true)
      const response = await clientsAPI.getMyClients(token)
      setClients(response.clients || [])
    } catch (error) {
      console.error("Error fetching clients:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredClients = clients.filter((client) => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.businessName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.domain || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.phone || "").includes(searchTerm)
    
    const matchesStatus = statusFilter === "all" || client.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Calcular estadisticas
  const stats = {
    total: clients.length,
    activas: clients.filter(c => c.status === "web_activada").length,
    pendientes: clients.filter(c => c.status === "demo_pendiente" || c.status === "demo_enviada").length,
    pausadas: clients.filter(c => c.status === "web_pausada").length,
    bajas: clients.filter(c => c.status === "cliente_baja").length,
  }

  // Calcular fecha de proximo pago basada en billingDay
  const getNextPaymentDate = (client: Client) => {
    if (!client.billingDay) return null
    
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    const billingDay = client.billingDay
    
    // Crear fecha de pago de este mes
    let paymentDate = new Date(currentYear, currentMonth, billingDay)
    
    // Si ya paso, usar el proximo mes
    if (paymentDate < today) {
      paymentDate = new Date(currentYear, currentMonth + 1, billingDay)
    }
    
    return paymentDate
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "-"
    return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
  }

  // Abrir modal de edicion
  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setEditForm({
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
      whatsapp: client.whatsapp || "",
      businessName: client.businessName || "",
      notes: client.notes || "",
    })
    setIsEditDialogOpen(true)
  }

  // Guardar cambios de cliente
  const handleSaveClient = async () => {
    if (!editingClient) return
    
    const token = localStorage.getItem("token")
    if (!token) return
    
    setIsSaving(true)
    try {
      await clientsAPI.update(token, editingClient._id, editForm)
      toast({
        title: "Exito",
        description: "Cliente actualizado correctamente",
      })
      setIsEditDialogOpen(false)
      fetchClients()
    } catch (error) {
      console.error("Error updating client:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el cliente",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Abrir modal de pago
  const handleOpenPayment = (client: Client) => {
    setPaymentClient(client)
    setPaymentForm({
      amount: client.monthlyPrice || 0,
      notes: "",
    })
    setPaymentFile(null)
    setIsPaymentDialogOpen(true)
  }

  // Subir comprobante de pago
  const handleUploadPayment = async () => {
    if (!paymentClient || !paymentFile) {
      toast({
        title: "Error",
        description: "Selecciona un archivo de comprobante",
        variant: "destructive",
      })
      return
    }
    
    const token = localStorage.getItem("token")
    if (!token) return
    
    setIsUploading(true)
    try {
      // Crear FormData para subir archivo
      const formData = new FormData()
      formData.append("file", paymentFile)
      formData.append("amount", paymentForm.amount.toString())
      formData.append("notes", paymentForm.notes)
      
      const response = await fetch(`${API_URL}/api/clients/${paymentClient._id}/payment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error("Error al subir comprobante")
      }
      
      toast({
        title: "Exito",
        description: "Pago registrado correctamente",
      })
      setIsPaymentDialogOpen(false)
      fetchClients()
    } catch (error) {
      console.error("Error uploading payment:", error)
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout requiredRole="seller">
        <div className="flex items-center justify-center h-64">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="seller">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis Clientes</h1>
          <p className="text-muted-foreground">Clientes de Empresa 2 asignados a ti</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <StatCard
            title="Total Clientes"
            value={stats.total}
            icon={Users}
          />
          <StatCard
            title="Webs Activas"
            value={stats.activas}
            icon={Globe}
            className="border-emerald-500/50"
          />
          <StatCard
            title="Pendientes"
            value={stats.pendientes}
            icon={Eye}
            className="border-purple-500/50"
          />
          <StatCard
            title="Pausadas"
            value={stats.pausadas}
            icon={Pause}
            className="border-gray-500/50"
          />
          <StatCard
            title="Bajas"
            value={stats.bajas}
            icon={Users}
            className="border-red-500/50"
          />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email, negocio o dominio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Clients Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes ({filteredClients.length})</CardTitle>
            <CardDescription>Administra tus clientes, fechas de pago y comprobantes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Negocio</TableHead>
                    <TableHead>Dominio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Precio Mensual</TableHead>
                    <TableHead>Prox. Pago</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No se encontraron clientes
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.map((client) => {
                      const StatusIcon = statusConfig[client.status]?.icon || Users
                      const nextPayment = getNextPaymentDate(client)
                      const isPaymentSoon = nextPayment && (nextPayment.getTime() - new Date().getTime()) < 7 * 24 * 60 * 60 * 1000
                      
                      return (
                        <TableRow key={client._id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{client.name}</p>
                              <p className="text-sm text-muted-foreground">{client.email || "-"}</p>
                              {client.phone && (
                                <p className="text-xs text-muted-foreground">{client.phone}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{client.businessName || "-"}</TableCell>
                          <TableCell>
                            {client.domain ? (
                              <a 
                                href={client.liveUrl || `https://${client.domain}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                <Globe className="h-3 w-3" />
                                {client.domain}
                              </a>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusConfig[client.status]?.color || "bg-gray-500"} text-white`}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {statusConfig[client.status]?.label || client.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            ${client.monthlyPrice?.toLocaleString() || 0}
                          </TableCell>
                          <TableCell>
                            {client.status === "web_activada" && nextPayment ? (
                              <div className={`flex items-center gap-1 ${isPaymentSoon ? "text-amber-500 font-medium" : ""}`}>
                                <Calendar className="h-3 w-3" />
                                {formatDate(nextPayment)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {client.phone && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => window.open(`https://wa.me/${client.whatsapp || client.phone}`, "_blank")}
                                  title="WhatsApp"
                                >
                                  <Phone className="h-4 w-4" />
                                </Button>
                              )}
                              {client.email && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => window.open(`mailto:${client.email}`)}
                                  title="Enviar Email"
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditClient(client)}
                                title="Editar cliente"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {client.status === "web_activada" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenPayment(client)}
                                  title="Registrar pago"
                                  className="text-green-500 hover:text-green-600"
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              )}
                              {client.paymentProofUrl && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => window.open(client.paymentProofUrl, "_blank")}
                                  title="Ver comprobante"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Modal de Edicion de Cliente */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
              <DialogDescription>
                Actualiza la informacion de contacto del cliente
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nombre</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Telefono</Label>
                  <Input
                    id="edit-phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-whatsapp">WhatsApp</Label>
                  <Input
                    id="edit-whatsapp"
                    value={editForm.whatsapp}
                    onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-businessName">Nombre del Negocio</Label>
                <Input
                  id="edit-businessName"
                  value={editForm.businessName}
                  onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notas</Label>
                <Textarea
                  id="edit-notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveClient} disabled={isSaving}>
                {isSaving ? <Spinner className="h-4 w-4 mr-2" /> : null}
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Registro de Pago */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Registrar Pago</DialogTitle>
              <DialogDescription>
                Registra el pago de {paymentClient?.name} y sube el comprobante
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-secondary/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{paymentClient?.name}</p>
                <p className="text-sm text-muted-foreground">{paymentClient?.businessName}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Monto del Pago</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment-file">Comprobante de Pago</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="payment-file"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
                    className="flex-1"
                  />
                  {paymentFile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPaymentFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {paymentFile && (
                  <p className="text-sm text-muted-foreground">
                    Archivo seleccionado: {paymentFile.name}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment-notes">Notas (opcional)</Label>
                <Textarea
                  id="payment-notes"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Ej: Pago del mes de mayo, transferencia bancaria"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUploadPayment} disabled={isUploading || !paymentFile}>
                {isUploading ? <Spinner className="h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Subir Comprobante
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
