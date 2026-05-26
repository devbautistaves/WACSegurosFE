"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Filter, MoreHorizontal, Eye, Edit, Mail, Globe, Users, UserCheck, Pause, Phone } from "lucide-react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { clientsAPI, Client } from "@/lib/api"
import { useCompany } from "@/lib/company-context"
import { StatCard } from "@/components/dashboard/stat-card"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Spinner } from "@/components/ui/spinner"
import Link from "next/link"

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  demo_pendiente: { label: "Demo Pendiente", color: "bg-amber-500", icon: Pause },
  demo_enviada: { label: "Demo Enviada", color: "bg-purple-500", icon: Eye },
  web_activada: { label: "Web Activada", color: "bg-emerald-500", icon: Globe },
  web_pausada: { label: "Web Pausada", color: "bg-gray-500", icon: Pause },
  cliente_baja: { label: "Cliente Baja", color: "bg-red-500", icon: Users },
}

export default function SupervisorClientsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { currentCompany } = useCompany()
  
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    // Redirigir si no es TuPaginaYa
    if (currentCompany.id !== "tupaginaya") {
      router.push("/supervisor")
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
      // Supervisor puede ver todos los clientes de su equipo
      const response = await clientsAPI.getAll(token)
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

  const handleStatusChange = async (clientId: string, newStatus: string) => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      await clientsAPI.update(token, clientId, { status: newStatus as Client["status"] })
      toast({
        title: "Estado actualizado",
        description: `El cliente ahora esta en estado: ${statusConfig[newStatus]?.label || newStatus}`,
      })
      fetchClients()
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      })
    }
  }

  const filteredClients = clients.filter((client) => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.domain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm)
    
    const matchesStatus = statusFilter === "all" || client.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Calcular estadisticas
  const stats = {
    total: clients.length,
    activas: clients.filter(c => c.status === "web_activada").length,
    pendientes: clients.filter(c => c.status === "demo_pendiente" || c.status === "demo_enviada").length,
    pausadas: clients.filter(c => c.status === "web_pausada").length,
    ingresoMensual: clients.filter(c => c.status === "web_activada").reduce((acc, c) => acc + (c.monthlyPrice || 0), 0),
  }

  if (isLoading) {
    return (
      <DashboardLayout requiredRole="supervisor">
        <div className="flex items-center justify-center h-64">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="supervisor">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground">Gestiona los clientes de TuPaginaYa</p>
          </div>
          <Link href="/supervisor/new-sale">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Venta
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
            title="Ingreso Mensual"
            value={`$${stats.ingresoMensual.toLocaleString()}`}
            icon={UserCheck}
            className="border-blue-500/50"
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
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Negocio</TableHead>
                  <TableHead>Dominio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Precio Mensual</TableHead>
                  <TableHead>Vendedor</TableHead>
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
                    return (
                      <TableRow key={client._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-sm text-muted-foreground">{client.email}</p>
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
                          {typeof client.sellerId === "object" ? client.sellerId?.name : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {client.phone && (
                                <DropdownMenuItem onClick={() => window.open(`tel:${client.phone}`)}>
                                  <Phone className="mr-2 h-4 w-4" />
                                  Llamar
                                </DropdownMenuItem>
                              )}
                              {client.email && (
                                <DropdownMenuItem onClick={() => window.open(`mailto:${client.email}`)}>
                                  <Mail className="mr-2 h-4 w-4" />
                                  Enviar Email
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(client._id, "web_activada")}
                                disabled={client.status === "web_activada"}
                              >
                                <Globe className="mr-2 h-4 w-4" />
                                Marcar como Activa
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(client._id, "web_pausada")}
                                disabled={client.status === "web_pausada"}
                              >
                                <Pause className="mr-2 h-4 w-4" />
                                Pausar Web
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
