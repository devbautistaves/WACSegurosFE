"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
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
import { tpyDemosAPI, TPY_Demo } from "@/lib/api"
import { 
  ArrowLeft, 
  Globe, 
  Phone, 
  Mail, 
  Calendar, 
  ExternalLink, 
  ArrowRight,
  Edit,
  Clock,
  CheckCircle,
  Send,
  Pause,
  Trash2
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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

const statusIcons: Record<string, React.ReactNode> = {
  pendiente_demo: <Clock className="h-4 w-4" />,
  demo_enviada: <Send className="h-4 w-4" />,
  demo_pausada: <Pause className="h-4 w-4" />,
  pendiente_web: <Globe className="h-4 w-4" />,
  web_activada: <CheckCircle className="h-4 w-4" />,
}

export default function SellerDemoDetailPage() {
  const [demo, setDemo] = useState<TPY_Demo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [newStatus, setNewStatus] = useState<string>("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()

  useEffect(() => {
    loadDemo()
  }, [params.id])

  const loadDemo = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem("token")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await tpyDemosAPI.getById(token, params.id as string)
      if (response.success && response.demo) {
        setDemo(response.demo)
        setNewStatus(response.demo.status)
      }
    } catch (error) {
      console.error("Error loading demo:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar la demo",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async () => {
    if (!demo || !newStatus) return

    try {
      setIsUpdating(true)
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await tpyDemosAPI.update(token, demo._id, { status: newStatus as TPY_Demo["status"] })
      if (response.success) {
        setDemo(response.demo)
        toast({
          title: "Estado actualizado",
          description: `El estado cambio a "${statusLabels[newStatus]}"`,
        })
        setShowStatusDialog(false)
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

  const handleDelete = async () => {
    if (!demo) return

    try {
      setIsDeleting(true)
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await tpyDemosAPI.delete(token, demo._id)
      if (response.success) {
        toast({
          title: "Demo eliminada",
          description: "La demo fue eliminada correctamente",
        })
        router.push("/seller/demos")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la demo",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout requiredRole="seller">
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      </DashboardLayout>
    )
  }

  if (!demo) {
    return (
      <DashboardLayout requiredRole="seller">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-lg font-medium">Demo no encontrada</p>
          <Link href="/seller/demos">
            <Button className="mt-4">Volver a demos</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  // Statuses that a seller can change to
  const allowedStatuses = ["pendiente_demo", "demo_enviada", "demo_pausada", "pendiente_web"]

  return (
    <DashboardLayout requiredRole="seller">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/seller/demos">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{demo.name}</h1>
              <p className="text-muted-foreground">{demo.webName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${statusColors[demo.status]} text-sm px-3 py-1`}>
              {statusIcons[demo.status]}
              <span className="ml-2">{statusLabels[demo.status]}</span>
            </Badge>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setShowStatusDialog(true)}
          >
            <Edit className="h-4 w-4" />
            Cambiar Estado
          </Button>
          {(demo.status === "demo_enviada" || demo.status === "pendiente_web") && (
            <Link href={`/seller/demos/${demo._id}/convert`}>
              <Button className="gap-2">
                <ArrowRight className="h-4 w-4" />
                Convertir a Cliente
              </Button>
            </Link>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Eliminar Demo
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminar Demo</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta accion no se puede deshacer. Se eliminara permanentemente la demo de {demo.webName}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Eliminando..." : "Eliminar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Informacion del Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Informacion del Prospecto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-medium">{demo.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nombre de la Web</p>
                  <p className="font-medium">{demo.webName}</p>
                </div>
                {demo.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefono</p>
                      <a 
                        href={`tel:${demo.phone}`} 
                        className="font-medium text-primary hover:underline"
                      >
                        {demo.phone}
                      </a>
                    </div>
                  </div>
                )}
                {demo.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <a 
                        href={`mailto:${demo.email}`} 
                        className="font-medium text-primary hover:underline"
                      >
                        {demo.email}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informacion de la Demo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Detalles de la Demo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Demo</p>
                  <p className="font-medium">
                    {new Date(demo.demoDate || demo.createdAt).toLocaleDateString("es-AR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge className={statusColors[demo.status]}>
                    {statusLabels[demo.status]}
                  </Badge>
                </div>
                {demo.demoUrl && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">URL de la Demo</p>
                    <a
                      href={demo.demoUrl.startsWith("http") ? demo.demoUrl : `https://${demo.demoUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline font-medium"
                    >
                      {demo.demoUrl}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Precios */}
          <Card>
            <CardHeader>
              <CardTitle>Precios Configurados</CardTitle>
              <CardDescription>
                Montos definidos para esta demo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Precio de Activacion</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${demo.activationPrice?.toLocaleString("es-AR") || "0"}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Precio Mensual</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${demo.monthlyPrice?.toLocaleString("es-AR") || "0"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notas */}
          {demo.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{demo.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Status Change Dialog */}
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambiar Estado de la Demo</DialogTitle>
              <DialogDescription>
                Selecciona el nuevo estado para la demo de {demo.name}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {allowedStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center gap-2">
                        {statusIcons[status]}
                        {statusLabels[status]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowStatusDialog(false)
                  setNewStatus(demo.status)
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleStatusChange} disabled={isUpdating || newStatus === demo.status}>
                {isUpdating && <Spinner className="mr-2 h-4 w-4" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
