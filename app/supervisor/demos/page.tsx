"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { clientsAPI, Client, ClientStatus } from "@/lib/api"
import { Plus, Search, Eye, Send, ArrowRight, Globe, Clock, CheckCircle, MoreHorizontal, ExternalLink } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"

const statusLabels: Record<string, string> = {
  demo_pendiente: "Demo Pendiente",
  demo_enviada: "Demo Enviada",
  web_pendiente: "Web Pendiente",
}

const statusColors: Record<string, string> = {
  demo_pendiente: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  demo_enviada: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  web_pendiente: "bg-purple-500/10 text-purple-500 border-purple-500/20",
}

export default function SupervisorDemosPage() {
  const [demos, setDemos] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedDemo, setSelectedDemo] = useState<Client | null>(null)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [newStatus, setNewStatus] = useState<ClientStatus | "">("")
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    loadDemos()
  }, [statusFilter])

  const loadDemos = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem("token")
      if (!token) {
        router.push("/login")
        return
      }

      const filters: { status?: string } = {}
      if (statusFilter && statusFilter !== "all") {
        filters.status = statusFilter
      }

      const response = await clientsAPI.getAll(token, filters)
      if (response.success) {
        // Filtrar solo demos (no webs activadas ni bajas)
        const demoStatuses = ["demo_pendiente", "demo_enviada", "web_pendiente"]
        setDemos(response.clients.filter(c => demoStatuses.includes(c.status)))
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las demos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async () => {
    if (!selectedDemo || !newStatus) return

    // Si el nuevo estado es web_pendiente o web_activada, redirigir a la pagina de conversion
    if (newStatus === "web_pendiente" || newStatus === "web_activada") {
      setShowStatusDialog(false)
      router.push(`/supervisor/demos/${selectedDemo._id}/convert`)
      return
    }

    try {
      setIsUpdating(true)
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await clientsAPI.updateStatus(token, selectedDemo._id, newStatus)
      if (response.success) {
        toast({
          title: "Estado actualizado",
          description: `La demo fue actualizada a ${statusLabels[newStatus] || newStatus}`,
        })
        setShowStatusDialog(false)
        setSelectedDemo(null)
        setNewStatus("")
        loadDemos()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const filteredDemos = demos.filter((demo) => {
    const matchesSearch =
      demo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demo.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (demo.phone && demo.phone.includes(searchTerm))

    return matchesSearch
  })

  const stats = {
    total: demos.length,
    demoPendiente: demos.filter(d => d.status === "demo_pendiente").length,
    demoEnviada: demos.filter(d => d.status === "demo_enviada").length,
    webPendiente: demos.filter(d => d.status === "web_pendiente").length,
  }

  const getSellerName = (sellerId: Client["sellerId"]) => {
    if (!sellerId) return "-"
    if (typeof sellerId === "string") return sellerId
    return sellerId.name
  }

  return (
    <DashboardLayout requiredRole="supervisor">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestion de Demos</h1>
            <p className="text-muted-foreground">
              Administra las demos del equipo
            </p>
          </div>
          <Link href="/supervisor/demos/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Demo
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Demos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.demoPendiente}</p>
                  <p className="text-sm text-muted-foreground">Pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                  <Send className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.demoEnviada}</p>
                  <p className="text-sm text-muted-foreground">Enviadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                  <CheckCircle className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.webPendiente}</p>
                  <p className="text-sm text-muted-foreground">Web Pendiente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, negocio o telefono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="demo_pendiente">Demo Pendiente</SelectItem>
                  <SelectItem value="demo_enviada">Demo Enviada</SelectItem>
                  <SelectItem value="web_pendiente">Web Pendiente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Demos Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Demos</CardTitle>
            <CardDescription>
              {filteredDemos.length} demos encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="h-8 w-8" />
              </div>
            ) : filteredDemos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Globe className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-lg font-medium">No hay demos</p>
                <p className="text-muted-foreground">
                  Crea la primera demo para comenzar
                </p>
                <Link href="/supervisor/demos/new">
                  <Button className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    Nueva Demo
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prospecto</TableHead>
                      <TableHead>Negocio</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Demo URL</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDemos.map((demo) => (
                      <TableRow key={demo._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{demo.name}</p>
                            {demo.phone && (
                              <p className="text-sm text-muted-foreground">{demo.phone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{demo.businessName}</p>
                            {demo.businessType && (
                              <p className="text-sm text-muted-foreground">{demo.businessType}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getSellerName(demo.sellerId)}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[demo.status]}>
                            {statusLabels[demo.status] || demo.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {demo.demoUrl ? (
                            <a
                              href={demo.demoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              Ver demo
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(demo.createdAt).toLocaleDateString("es-AR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/supervisor/demos/${demo._id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver detalle
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedDemo(demo)
                                  setShowStatusDialog(true)
                                }}
                              >
                                <ArrowRight className="mr-2 h-4 w-4" />
                                Cambiar estado
                              </DropdownMenuItem>
                              {demo.status === "demo_enviada" && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/supervisor/demos/${demo._id}/convert`}>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Convertir a venta
                                  </Link>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Change Dialog */}
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambiar Estado</DialogTitle>
              <DialogDescription>
                Selecciona el nuevo estado para la demo de {selectedDemo?.businessName}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ClientStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demo_pendiente">Demo Pendiente</SelectItem>
                  <SelectItem value="demo_enviada">Demo Enviada</SelectItem>
                  <SelectItem value="web_pendiente">Web Pendiente</SelectItem>
                  <SelectItem value="web_activada">Web Activada</SelectItem>
                </SelectContent>
              </Select>
              {(newStatus === "web_pendiente" || newStatus === "web_activada") && (
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                  <p className="text-sm text-blue-500">
                    Al seleccionar este estado, seras redirigido al formulario de conversion para completar los datos del cliente (email, dominio, montos, etc.)
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowStatusDialog(false)
                  setSelectedDemo(null)
                  setNewStatus("")
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleStatusChange} disabled={!newStatus || isUpdating}>
                {isUpdating ? <Spinner className="mr-2 h-4 w-4" /> : null}
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
