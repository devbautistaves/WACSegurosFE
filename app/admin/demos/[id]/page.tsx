"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { tpyDemosAPI, TPY_Demo, usersAPI, User as UserType } from "@/lib/api"
import { ArrowLeft, Save, ExternalLink, Globe, User, Phone, Mail, Calendar, FileText, UserCheck, Trash2 } from "lucide-react"
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

export default function DemoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const demoId = params.id as string

  const [demo, setDemo] = useState<TPY_Demo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [sellers, setSellers] = useState<UserType[]>([])

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    webName: "",
    demoUrl: "",
    status: "",
    notes: "",
    sellerId: "",
  })

  useEffect(() => {
    loadDemo()
    loadSellers()
  }, [demoId])

  const loadSellers = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await usersAPI.getAll(token)
      if (response.success) {
        setSellers(response.users.filter(u => u.role === "seller" || u.role === "supervisor"))
      }
    } catch (error) {
      console.error("Error loading sellers:", error)
    }
  }

  const loadDemo = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem("token")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await tpyDemosAPI.getById(token, demoId)
      if (response.demo) {
        setDemo(response.demo)
        const sellerId = typeof response.demo.sellerId === 'object' && response.demo.sellerId 
          ? response.demo.sellerId._id 
          : response.demo.sellerId || ""
        setFormData({
          name: response.demo.name || "",
          phone: response.demo.phone || "",
          email: response.demo.email || "",
          webName: response.demo.webName || "",
          demoUrl: response.demo.demoUrl || "",
          status: response.demo.status || "",
          notes: response.demo.notes || "",
          sellerId: sellerId,
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      toast({
        title: "Error al cargar la demo",
        description: errorMessage,
        variant: "destructive",
      })
      // Solo redirigir si el error es 404
      if (errorMessage.includes("404") || errorMessage.includes("not found")) {
        router.push("/admin/demos")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const token = localStorage.getItem("token")
      if (!token) {
        toast({
          title: "Error",
          description: "No hay sesion activa",
          variant: "destructive",
        })
        return
      }

      const response = await tpyDemosAPI.update(token, demoId, formData)
      
      if (response.success || response.demo) {
        toast({
          title: "Demo actualizada",
          description: "Los cambios se guardaron correctamente",
        })
        setIsEditing(false)
        loadDemo()
      } else {
        toast({
          title: "Error",
          description: response.error || "No se pudieron guardar los cambios",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron guardar los cambios",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await tpyDemosAPI.delete(token, demoId)
      if (response.success) {
        toast({
          title: "Demo eliminada",
          description: "La demo fue eliminada correctamente",
        })
        router.push("/admin/demos")
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
      <DashboardLayout requiredRole="admin">
        <div className="flex items-center justify-center py-24">
          <Spinner className="h-8 w-8" />
        </div>
      </DashboardLayout>
    )
  }

  if (!demo) {
    return (
      <DashboardLayout requiredRole="admin">
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-lg text-muted-foreground">Demo no encontrada</p>
          <Link href="/admin/demos">
            <Button className="mt-4">Volver a Demos</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="admin">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/demos">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{demo.webName}</h1>
                <Badge className={statusColors[demo.status]}>
                  {statusLabels[demo.status] || demo.status}
                </Badge>
              </div>
              <p className="text-muted-foreground">Detalle de la demo</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon">
                      <Trash2 className="h-4 w-4" />
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
                <Button onClick={() => setIsEditing(true)}>
                  Editar Demo
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => {
                  setIsEditing(false)
                  // Reset form
                  const sellerId = typeof demo.sellerId === 'object' && demo.sellerId 
                    ? demo.sellerId._id 
                    : demo.sellerId || ""
                  setFormData({
                    name: demo.name || "",
                    phone: demo.phone || "",
                    email: demo.email || "",
                    webName: demo.webName || "",
                    demoUrl: demo.demoUrl || "",
                    status: demo.status || "",
                    notes: demo.notes || "",
                    sellerId: sellerId,
                  })
                }}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Spinner className="mr-2 h-4 w-4" />}
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Info del Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informacion del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del Cliente</Label>
                {isEditing ? (
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Nombre completo"
                  />
                ) : (
                  <p className="text-lg font-medium">{demo.name || "-"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefono
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Numero de telefono"
                  />
                ) : (
                  <p className="text-lg">{demo.phone || "-"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="Correo electronico"
                  />
                ) : (
                  <p className="text-lg">{demo.email || "-"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Vendedor Asignado
                </Label>
                {isEditing ? (
                  <Select value={formData.sellerId || "none"} onValueChange={(v) => handleInputChange("sellerId", v === "none" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {sellers.map((seller) => (
                        <SelectItem key={seller._id} value={seller._id}>
                          {seller.name} ({seller.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-lg">
                    {demo.sellerName || (typeof demo.sellerId === 'object' && demo.sellerId ? demo.sellerId.name : "-")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Info de la Demo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Informacion de la Demo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del Negocio/Web</Label>
                {isEditing ? (
                  <Input
                    value={formData.webName}
                    onChange={(e) => handleInputChange("webName", e.target.value)}
                    placeholder="Nombre del negocio"
                  />
                ) : (
                  <p className="text-lg font-medium">{demo.webName || "-"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  URL de la Demo
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.demoUrl}
                    onChange={(e) => handleInputChange("demoUrl", e.target.value)}
                    placeholder="https://..."
                  />
                ) : demo.demoUrl ? (
                  <a
                    href={demo.demoUrl.startsWith("http") ? demo.demoUrl : `https://${demo.demoUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-lg text-primary hover:underline"
                  >
                    {demo.demoUrl}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : (
                  <p className="text-muted-foreground">Sin URL</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                {isEditing ? (
                  <Select value={formData.status} onValueChange={(v) => handleInputChange("status", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente_demo">Demo Pendiente</SelectItem>
                      <SelectItem value="demo_enviada">Demo Enviada</SelectItem>
                      <SelectItem value="demo_pausada">Demo Pausada</SelectItem>
                      <SelectItem value="pendiente_web">Web Pendiente</SelectItem>
                      <SelectItem value="web_activada">Web Activada</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={statusColors[demo.status]}>
                    {statusLabels[demo.status] || demo.status}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha de Creacion
                </Label>
                <p className="text-lg">
                  {new Date(demo.demoDate || demo.createdAt).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notas */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Agregar notas sobre esta demo..."
                  rows={4}
                />
              ) : (
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {demo.notes || "Sin notas"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        {(demo.status === "demo_enviada" || demo.status === "pendiente_web") && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold">Convertir a Venta</h3>
                  <p className="text-sm text-muted-foreground">
                    Esta demo esta lista para ser convertida en un cliente activo
                  </p>
                </div>
                <Link href={`/admin/demos/${demo._id}/convert`}>
                  <Button>
                    Convertir a Cliente
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
