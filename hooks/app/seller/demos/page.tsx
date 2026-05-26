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
import { useToast } from "@/hooks/use-toast"
import { clientsAPI, Client, ClientStatus } from "@/lib/api"
import { Plus, Search, Eye, Send, ArrowRight, Globe, Clock, CheckCircle } from "lucide-react"
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

export default function SellerDemosPage() {
  const [demos, setDemos] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
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

      const response = await clientsAPI.getMyClients(token, filters)
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

  return (
    <DashboardLayout requiredRole="seller">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mis Demos</h1>
            <p className="text-muted-foreground">
              Gestiona tus demos y convierte prospectos en clientes
            </p>
          </div>
          <Link href="/seller/demos/new">
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
                  Crea tu primera demo para comenzar
                </p>
                <Link href="/seller/demos/new">
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
                      <TableHead>Telefono</TableHead>
                      <TableHead>Estado</TableHead>
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
                            {demo.email && (
                              <p className="text-sm text-muted-foreground">{demo.email}</p>
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
                        <TableCell>{demo.phone || "-"}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[demo.status]}>
                            {statusLabels[demo.status] || demo.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(demo.createdAt).toLocaleDateString("es-AR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/seller/demos/${demo._id}`}>
                              <Button variant="outline" size="sm" className="gap-1">
                                <Eye className="h-4 w-4" />
                                Ver
                              </Button>
                            </Link>
                            {demo.status === "demo_enviada" && (
                              <Link href={`/seller/demos/${demo._id}/convert`}>
                                <Button size="sm" className="gap-1">
                                  <ArrowRight className="h-4 w-4" />
                                  Convertir
                                </Button>
                              </Link>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
