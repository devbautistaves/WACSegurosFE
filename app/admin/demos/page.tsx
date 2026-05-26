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
import { clientsAPI, Client, ClientStatus, tpyDemosAPI, TPY_Demo, usersAPI, User } from "@/lib/api"
import { Plus, Search, Eye, Send, ArrowRight, Globe, Clock, CheckCircle, MoreHorizontal, ExternalLink, UserPlus, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"

const statusLabels: Record<string, string> = {
  pendiente_demo: "Demo Pendiente",
  demo_enviada: "Demo Enviada",
  demo_pausada: "Demo Pausada",
  pendiente_web: "Web Pendiente",
  web_activada: "Web Activada",
}

const statusColors: Record<string, string> = {
  pendiente_demo: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  demo_enviada: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  demo_pausada: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  pendiente_web: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  web_activada: "bg-green-500/10 text-green-500 border-green-500/20",
}

export default function AdminDemosPage() {
  const [demos, setDemos] = useState<TPY_Demo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedDemo, setSelectedDemo] = useState<TPY_Demo | null>(null)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [newStatus, setNewStatus] = useState<ClientStatus | "">("")
  const [selectedSellerId, setSelectedSellerId] = useState<string>("")
  const [sellers, setSellers] = useState<User[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    loadDemos()
    loadSellers()
  }, [statusFilter])

  const loadSellers = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await usersAPI.getAll(token)
      if (response.success) {
        setSellers(response.users.filter(u => (u.role === "seller" || u.role === "supervisor") && u.isActive))
      }
    } catch (error) {
      console.error("Error loading sellers:", error)
    }
  }

  const loadDemos = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem("token")
      if (!token) {
        router.push("/login")
        return
      }

      // Usar nueva API TPY para demos
      const filters: { status?: string } = {}
      if (statusFilter !== "all") filters.status = statusFilter
      
      const response = await tpyDemosAPI.getAll(token, filters)
      if (response.demos) {
        setDemos(response.demos)
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

    // Si el nuevo estado es pendiente_web o web_activada, redirigir a la pagina de conversion
    if (newStatus === "pendiente_web" || newStatus === "web_activada") {
      setShowStatusDialog(false)
      router.push(`/admin/demos/${selectedDemo._id}/convert`)
      return
    }

    try {
      setIsUpdating(true)
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await tpyDemosAPI.updateStatus(token, selectedDemo._id, newStatus)
      if (response.success || response.demo) {
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

  const handleAssignSeller = async () => {
    if (!selectedDemo) return

    try {
      setIsUpdating(true)
      const token = localStorage.getItem("token")
      if (!token) return

      const seller = sellers.find(s => s._id === selectedSellerId)
      const response = await tpyDemosAPI.update(token, selectedDemo._id, {
        sellerId: selectedSellerId || null,
        sellerName: seller?.name || null,
      })

      if (response.success || response.demo) {
        toast({
          title: "Vendedor asignado",
          description: selectedSellerId 
            ? `La demo fue asignada a ${seller?.name}` 
            : "Se removio la asignacion del vendedor",
        })
        setShowAssignDialog(false)
        setSelectedDemo(null)
        setSelectedSellerId("")
        loadDemos()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo asignar el vendedor",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (demoId: string) => {
    try {
      setDeletingId(demoId)
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await tpyDemosAPI.delete(token, demoId)
      if (response.success) {
        setDemos(demos.filter(d => d._id !== demoId))
        toast({
          title: "Demo eliminada",
          description: "La demo fue eliminada correctamente",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la demo",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const filteredDemos = demos.filter((demo) => {
    const matchesSearch =
      demo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demo.webName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (demo.phone && demo.phone.includes(searchTerm))

    return matchesSearch
  })

  const stats = {
    total: demos.length,
    demoPendiente: demos.filter(d => d.status === "pendiente_demo").length,
    demoEnviada: demos.filter(d => d.status === "demo_enviada").length,
    demoPausada: demos.filter(d => d.status === "demo_pausada").length,
    webPendiente: demos.filter(d => d.status === "pendiente_web").length,
  }

  const getSellerName = (sellerId: TPY_Demo["sellerId"]) => {
    if (!sellerId) return "-"
    if (typeof sellerId === "string") return sellerId
    return sellerId.name
  }

  return (
    <DashboardLayout requiredRole="admin">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestion de Demos</h1>
            <p className="text-muted-foreground">
              Administra todas las demos del sistema
            </p>
          </div>
          <Link href="/admin/demos/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Demo
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
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
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-500/10">
                  <Clock className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.demoPausada}</p>
                  <p className="text-sm text-muted-foreground">Pausadas</p>
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
                  <SelectItem value="pendiente_demo">Demo Pendiente</SelectItem>
                  <SelectItem value="demo_enviada">Demo Enviada</SelectItem>
                  <SelectItem value="demo_pausada">Demo Pausada</SelectItem>
                  <SelectItem value="pendiente_web">Web Pendiente</SelectItem>
                  <SelectItem value="web_activada">Web Activada</SelectItem>
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
                <Link href="/admin/demos/new">
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
                      <TableHead>Fecha Demo</TableHead>
                      <TableHead>Cliente / Celular</TableHead>
                      <TableHead>Nombre Web</TableHead>
                      <TableHead>Dominio</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDemos.map((demo) => (
                      <TableRow key={demo._id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(demo.demoDate || demo.createdAt).toLocaleDateString("es-AR")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{demo.name}</p>
                            {demo.phone && (
                              <p className="text-sm text-muted-foreground">{demo.phone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{demo.webName}</p>
                        </TableCell>
                        <TableCell>
                          {demo.demoUrl ? (
                            <a
                              href={demo.demoUrl.startsWith("http") ? demo.demoUrl : `https://${demo.demoUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-primary hover:underline max-w-[200px] truncate"
                            >
                              {demo.demoUrl.replace(/^https?:\/\//, "")}
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {getSellerName(demo.sellerId)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[demo.status]}>
                            {statusLabels[demo.status] || demo.status}
                          </Badge>
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
                                <Link href={`/admin/demos/${demo._id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver detalle
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedDemo(demo)
                                  setSelectedSellerId(typeof demo.sellerId === 'object' && demo.sellerId ? demo.sellerId._id : demo.sellerId || "")
                                  setShowAssignDialog(true)
                                }}
                              >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Asignar vendedor
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
                              {(demo.status === "demo_enviada" || demo.status === "pendiente_web") && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/demos/${demo._id}/convert`}>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Convertir a venta
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  if (confirm(`¿Eliminar la demo de ${demo.webName}?`)) {
                                    handleDelete(demo._id)
                                  }
                                }}
                                disabled={deletingId === demo._id}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {deletingId === demo._id ? "Eliminando..." : "Eliminar demo"}
                              </DropdownMenuItem>
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
                  <SelectItem value="pendiente_demo">Demo Pendiente</SelectItem>
                  <SelectItem value="demo_enviada">Demo Enviada</SelectItem>
                  <SelectItem value="demo_pausada">Demo Pausada</SelectItem>
                  <SelectItem value="pendiente_web">Web Pendiente</SelectItem>
                  <SelectItem value="web_activada">Web Activada</SelectItem>
                </SelectContent>
              </Select>
              {(newStatus === "pendiente_web" || newStatus === "web_activada") && (
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

        {/* Assign Seller Dialog */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Asignar Vendedor</DialogTitle>
              <DialogDescription>
                Asigna un vendedor a la demo de {selectedDemo?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin asignar</SelectItem>
                  {sellers.map((seller) => (
                    <SelectItem key={seller._id} value={seller._id}>
                      {seller.name} ({seller.role === "supervisor" ? "Supervisor" : "Vendedor"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssignDialog(false)
                  setSelectedDemo(null)
                  setSelectedSellerId("")
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleAssignSeller} disabled={isUpdating}>
                {isUpdating ? <Spinner className="mr-2 h-4 w-4" /> : null}
                Asignar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
