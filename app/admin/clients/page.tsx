"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Filter, MoreHorizontal, Eye, Edit, Mail, Globe, Users, UserCheck, UserX, Pause, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { clientsAPI, Client, CreateClientData, usersAPI, User, TPY_STATUS_LABELS, tpyClientsAPI, TPY_Client } from "@/lib/api"
import { useCompany } from "@/lib/company-context"
import { StatCard } from "@/components/dashboard/stat-card"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Spinner } from "@/components/ui/spinner"

// Estados TuPaginaYa - segun el backend
const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  demo_pendiente: { label: "Demo Pendiente", color: "bg-yellow-500", icon: Pause },
  demo_enviada: { label: "Demo Enviada", color: "bg-blue-500", icon: Eye },
  web_pendiente: { label: "Web Pendiente", color: "bg-purple-500", icon: Globe },
  web_activada: { label: "Web Activada", color: "bg-emerald-500", icon: Globe },
  web_pausada: { label: "Web Pausada", color: "bg-orange-500", icon: Pause },
  cliente_baja: { label: "Baja", color: "bg-red-500", icon: UserX },
}

export default function ClientsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { currentCompany } = useCompany()
  
  const [clients, setClients] = useState<TPY_Client[]>([])
  const [sellers, setSellers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<TPY_Client | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [stats, setStats] = useState<{ byStatus: Record<string, number>; totalActiveRevenue: number; total: number } | null>(null)
  
  const [formData, setFormData] = useState<CreateClientData>({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    domain: "",
    webType: "landing",
    monthlyPrice: 0,
    setupPrice: 0,
    billingDay: 1,
  })

  useEffect(() => {
    // Redirigir si no es Empresa 2
    if (currentCompany.id !== "tupaginaya" && currentCompany.id !== "paginas") {
      router.push("/admin")
      return
    }
    
    fetchData()
  }, [currentCompany])

  const fetchData = async () => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    try {
      setIsLoading(true)
      const [clientsRes, usersRes] = await Promise.all([
        tpyClientsAPI.getAll(token),
        usersAPI.getAll(token),
      ])
      
      // Calcular stats desde los clientes
      const allClients = clientsRes.clients || []
      const byStatus: Record<string, number> = {}
      let totalActiveRevenue = 0
      
      allClients.forEach((c: TPY_Client) => {
        byStatus[c.status] = (byStatus[c.status] || 0) + 1
        if (c.status === "web_activada") {
          totalActiveRevenue += c.monthlyPrice || 0
        }
      })
      
      setClients(allClients)
      setStats({ byStatus, totalActiveRevenue, total: allClients.length })
      setSellers(usersRes.users.filter(u => u.role === "seller" || u.role === "supervisor"))
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateClient = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      await tpyClientsAPI.create(token, formData as any)
      toast({
        title: "Cliente creado",
        description: "El cliente se ha creado correctamente",
      })
      setIsCreateDialogOpen(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error("Error creating client:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el cliente",
        variant: "destructive",
      })
    }
  }

  const handleUpdateClient = async () => {
    const token = localStorage.getItem("token")
    if (!token || !selectedClient) return

    try {
      await tpyClientsAPI.update(token, selectedClient._id, formData as any)
      toast({
        title: "Cliente actualizado",
        description: "El cliente se ha actualizado correctamente",
      })
      setIsEditDialogOpen(false)
      setSelectedClient(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error("Error updating client:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el cliente",
        variant: "destructive",
      })
    }
  }

  const handleStatusChange = async (clientId: string, newStatus: string) => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      await tpyClientsAPI.update(token, clientId, { status: newStatus })
      toast({
        title: "Estado actualizado",
        description: `El cliente ahora esta en estado: ${statusConfig[newStatus]?.label || newStatus}`,
      })
      fetchData()
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      })
    }
  }

  const handleDeleteClient = async () => {
    const token = localStorage.getItem("token")
    if (!token || !clientToDelete) return

    try {
      setIsDeleting(true)
      await tpyClientsAPI.delete(token, clientToDelete._id)
      toast({
        title: "Cliente eliminado",
        description: "El cliente se ha eliminado correctamente",
      })
      setIsDeleteDialogOpen(false)
      setClientToDelete(null)
      fetchData()
    } catch (error) {
      console.error("Error deleting client:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const openDeleteDialog = (client: TPY_Client) => {
    setClientToDelete(client)
    setIsDeleteDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      businessName: "",
      domain: "",
      webType: "landing",
      monthlyPrice: 0,
      setupPrice: 0,
      billingDay: 1,
    })
  }

  const openEditDialog = (client: Client) => {
    setSelectedClient(client)
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone,
      businessName: client.businessName || "",
      domain: client.domain || "",
      webType: client.webType,
      monthlyPrice: client.monthlyPrice,
      setupPrice: client.setupPrice,
      billingDay: client.billingDay,
      notes: client.notes || "",
    })
    setIsEditDialogOpen(true)
  }

  const filteredClients = clients.filter((client) => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.domain?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || client.status === statusFilter
    
    return matchesSearch && matchesStatus
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gestiona los clientes de Empresa 2</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            title="Total Clientes"
            value={stats.total}
            icon={Users}
          />
          <StatCard
            title="Webs Activas"
            value={stats.byStatus?.web_activada || 0}
            icon={Globe}
            className="border-emerald-500/50"
          />
          <StatCard
            title="Demos Pendientes"
            value={(stats.byStatus?.demo_pendiente || 0) + (stats.byStatus?.demo_enviada || 0)}
            icon={Eye}
            className="border-purple-500/50"
          />
          <StatCard
            title="Pausados"
            value={stats.byStatus?.web_pausada || 0}
            icon={Pause}
            className="border-gray-500/50"
          />
          <StatCard
            title="Ingreso Mensual"
            value={`$${stats.totalActiveRevenue?.toLocaleString() || 0}`}
            icon={UserCheck}
            className="border-blue-500/50 col-span-2 sm:col-span-1"
          />
        </div>
      )}

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
      <Card className="overflow-hidden">
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Lista de Clientes ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto -mx-0">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap text-xs sm:text-sm">Fecha Alta</TableHead>
                  <TableHead className="text-xs sm:text-sm">Cliente / Celular</TableHead>
                  <TableHead className="text-xs sm:text-sm">Negocio / Web</TableHead>
                  <TableHead className="text-xs sm:text-sm">Dominio</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Email</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Activacion</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Suscripcion</TableHead>
                  <TableHead className="text-xs sm:text-sm">Estado</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No se encontraron clientes
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => {
                    const StatusIcon = statusConfig[client.status]?.icon || Users
                    return (
                      <TableRow key={client._id}>
                        <TableCell className="whitespace-nowrap">
                          {client.activationDate 
                            ? new Date(client.activationDate).toLocaleDateString("es-AR")
                            : new Date(client.createdAt).toLocaleDateString("es-AR")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-sm text-muted-foreground">{client.phone || "-"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{client.businessName || "-"}</p>
                        </TableCell>
                        <TableCell>
                          {client.domain ? (
                            <a 
                              href={client.liveUrl || `https://${client.domain}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 max-w-[180px] truncate"
                            >
                              <Globe className="h-3 w-3 flex-shrink-0" />
                              {client.domain}
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate hidden lg:table-cell">
                          {client.email || "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-500">
                          ${client.setupPrice?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${client.monthlyPrice?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusConfig[client.status]?.color || "bg-gray-500"} text-white`}>
                            {statusConfig[client.status]?.label || client.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(client)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              {client.email && (
                                <DropdownMenuItem onClick={() => window.open(`mailto:${client.email}`)}>
                                  <Mail className="mr-2 h-4 w-4" />
                                  Enviar Email
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(client._id, "pendiente_demo")}
                                disabled={client.status === "pendiente_demo"}
                              >
                                <Pause className="mr-2 h-4 w-4" />
                                Pendiente de Demo
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(client._id, "demo_enviada")}
                                disabled={client.status === "demo_enviada"}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Demo Enviada
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(client._id, "demo_pausada")}
                                disabled={client.status === "demo_pausada"}
                              >
                                <Pause className="mr-2 h-4 w-4" />
                                Demo Pausada
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(client._id, "web_pendiente")}
                                disabled={client.status === "web_pendiente"}
                              >
                                <Globe className="mr-2 h-4 w-4" />
                                Web Pendiente
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(client._id, "web_activada")}
                                disabled={client.status === "web_activada"}
                              >
                                <Globe className="mr-2 h-4 w-4" />
                                Web Activada
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(client._id, "web_pausada")}
                                disabled={client.status === "web_pausada"}
                              >
                                <Pause className="mr-2 h-4 w-4" />
                                Web Pausada
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(client._id, "cliente_baja")}
                                className="text-destructive"
                                disabled={client.status === "cliente_baja"}
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                Dar de Baja
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(client)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar Cliente
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false)
          setIsEditDialogOpen(false)
          setSelectedClient(null)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditDialogOpen ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Juan Perez"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="juan@ejemplo.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefono *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+54 11 1234-5678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessName">Nombre del Negocio</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="Mi Empresa SRL"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Dominio</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  placeholder="miempresa.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webType">Tipo de Web</Label>
                <Select 
                  value={formData.webType} 
                  onValueChange={(value) => setFormData({ ...formData, webType: value as CreateClientData["webType"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landing">Landing Page</SelectItem>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                    <SelectItem value="catalogo">Catalogo</SelectItem>
                    <SelectItem value="institucional">Institucional</SelectItem>
                    <SelectItem value="blog">Blog</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyPrice">Precio Mensual</Label>
                <Input
                  id="monthlyPrice"
                  type="number"
                  value={formData.monthlyPrice}
                  onChange={(e) => setFormData({ ...formData, monthlyPrice: Number(e.target.value) })}
                  placeholder="5000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setupPrice">Precio Setup</Label>
                <Input
                  id="setupPrice"
                  type="number"
                  value={formData.setupPrice}
                  onChange={(e) => setFormData({ ...formData, setupPrice: Number(e.target.value) })}
                  placeholder="15000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingDay">Dia de Corte</Label>
                <Input
                  id="billingDay"
                  type="number"
                  min={1}
                  max={31}
                  value={formData.billingDay}
                  onChange={(e) => setFormData({ ...formData, billingDay: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellerId">Vendedor Asignado</Label>
              <Select 
                value={formData.sellerId || ""} 
                onValueChange={(value) => setFormData({ ...formData, sellerId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar vendedor" />
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
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales sobre el cliente..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false)
              setIsEditDialogOpen(false)
              setSelectedClient(null)
              resetForm()
            }}>
              Cancelar
            </Button>
            <Button onClick={isEditDialogOpen ? handleUpdateClient : handleCreateClient}>
              {isEditDialogOpen ? "Guardar Cambios" : "Crear Cliente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente el cliente 
              <span className="font-semibold"> {clientToDelete?.name}</span> y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteClient}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
