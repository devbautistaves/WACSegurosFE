"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { useToast } from "@/hooks/use-toast"
import { usersAPI, notificationsAPI, announcementsAPI, segurosAPI, User } from "@/lib/api"
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
import { useCompany } from "@/lib/company-context"
import {
  Megaphone,
  Send,
  Users,
  Calendar,
  FileText,
  AlertTriangle,
  Plus,
  Clock,
  Link as LinkIcon,
  CheckCircle2,
  Upload,
  X,
  Paperclip,
  Info,
  Bell,
  Search,
  Filter,
  Download,
  ExternalLink,
  Mail,
  Image as ImageIcon,
  ArrowLeft,
  CheckCircle,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { notifyAnnouncement } from "@/lib/notify"

const API_URL = "/api/proxy"

interface AnnouncementFormData {
  title: string
  message: string
  type: "info" | "warning" | "success" | "meeting" | "material"
  priority: "low" | "medium" | "high" | "urgent"
  recipientType: "all" | "selected"
  recipients: string[]
  meetingDate: string
  meetingTime: string
  meetingLink: string
  meetingLocation: string
}

const initialFormData: AnnouncementFormData = {
  title: "",
  message: "",
  type: "info",
  priority: "medium",
  recipientType: "all",
  recipients: [],
  meetingDate: "",
  meetingTime: "",
  meetingLink: "",
  meetingLocation: "",
}

export default function AnnouncementsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState<AnnouncementFormData>(initialFormData)
  const [attachments, setAttachments] = useState<File[]>([])
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { currentCompany } = useCompany()
  const isSeguros = currentCompany?.id === "seguros"

  // Filtros del historial
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")

  // Estado para email masivo de seguros
  const [isSegurosMailOpen, setIsSegurosMailOpen] = useState(false)
  const [segurosStep, setSegurosStep] = useState<"form" | "confirm" | "result">("form")
  const [segurosAsunto, setSegurosAsunto] = useState("")
  const [segurosMensaje, setSegurosMensaje] = useState("")
  const [segurosImagen, setSegurosImagen] = useState<File | null>(null)
  const [segurosImagenPreview, setSegurosImagenPreview] = useState<string | null>(null)
  const [segurosImagenBase64, setSegurosImagenBase64] = useState<string | null>(null)
  const [segurosDestinatarios, setSegurosDestinatarios] = useState<number | null>(null)
  const [isSegurosLoading, setIsSegurosLoading] = useState(false)
  const [isSegurosEnviando, setIsSegurosEnviando] = useState(false)
  const [segurosResultado, setSegurosResultado] = useState<{ enviados: number; fallidos: number } | null>(null)
  const segurosImagenRef = useRef<HTMLInputElement>(null)

  type DestinatarioTipo = "todos" | "vigentes" | "anulados" | "individual"
  type PolizaResult = { _id: string; nombreApellido: string; email: string; estado: string; aseguradora?: string }
  const [segurosDestinatarioTipo, setSegurosDestinatarioTipo] = useState<DestinatarioTipo>("todos")
  const [segurosSearchQ, setSegurosSearchQ] = useState("")
  const [segurosSearchResults, setSegurosSearchResults] = useState<PolizaResult[]>([])
  const [segurosSearchLoading, setSegurosSearchLoading] = useState(false)
  const [segurosSelectedPolizas, setSegurosSelectedPolizas] = useState<PolizaResult[]>([])

  useEffect(() => {
    if (segurosDestinatarioTipo !== "individual" || segurosSearchQ.trim().length < 2) {
      setSegurosSearchResults([])
      return
    }
    const tid = setTimeout(async () => {
      const token = localStorage.getItem("token")
      if (!token) return
      setSegurosSearchLoading(true)
      try {
        const r = await segurosAPI.emailMasivoSearch(token, segurosSearchQ.trim())
        setSegurosSearchResults(r.polizas)
      } catch {
        setSegurosSearchResults([])
      } finally {
        setSegurosSearchLoading(false)
      }
    }, 350)
    return () => clearTimeout(tid)
  }, [segurosSearchQ, segurosDestinatarioTipo])

  const handleSegurosImagenSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSegurosImagen(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setSegurosImagenPreview(dataUrl)
      setSegurosImagenBase64(dataUrl.split(",")[1])
    }
    reader.readAsDataURL(file)
  }

  const resetSegurosDialog = () => {
    setSegurosStep("form")
    setSegurosAsunto("")
    setSegurosMensaje("")
    setSegurosImagen(null)
    setSegurosImagenPreview(null)
    setSegurosImagenBase64(null)
    setSegurosDestinatarios(null)
    setSegurosResultado(null)
    setSegurosDestinatarioTipo("todos")
    setSegurosSearchQ("")
    setSegurosSearchResults([])
    setSegurosSelectedPolizas([])
    if (segurosImagenRef.current) segurosImagenRef.current.value = ""
  }

  const handleSegurosContinuar = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    if (!segurosAsunto.trim() || !segurosMensaje.trim()) {
      toast({ title: "Campos requeridos", description: "El asunto y mensaje son obligatorios", variant: "destructive" })
      return
    }
    if (segurosDestinatarioTipo === "individual" && segurosSelectedPolizas.length === 0) {
      toast({ title: "Sin destinatarios", description: "Seleccioná al menos un cliente", variant: "destructive" })
      return
    }
    setIsSegurosLoading(true)
    try {
      const ids = segurosDestinatarioTipo === "individual" ? segurosSelectedPolizas.map(p => p._id) : undefined
      const result = await segurosAPI.emailMasivoPreview(token, segurosDestinatarioTipo, ids)
      setSegurosDestinatarios(result.count)
      setSegurosStep("confirm")
    } catch {
      toast({ title: "Error", description: "No se pudo obtener la cantidad de destinatarios", variant: "destructive" })
    } finally {
      setIsSegurosLoading(false)
    }
  }

  const handleSegurosSend = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    setIsSegurosEnviando(true)
    try {
      const result = await segurosAPI.emailMasivo(token, {
        asunto: segurosAsunto,
        mensaje: segurosMensaje,
        imagenBase64: segurosImagenBase64 ?? undefined,
        imagenMime: segurosImagen?.type ?? undefined,
        destinatario: segurosDestinatarioTipo,
        polizaIds: segurosDestinatarioTipo === "individual" ? segurosSelectedPolizas.map(p => p._id) : undefined,
      })
      setSegurosResultado({ enviados: result.enviados, fallidos: result.fallidos })
      setSegurosStep("result")
    } catch (err: any) {
      toast({ title: "Error al enviar", description: err.message || "No se pudo enviar el email masivo", variant: "destructive" })
    } finally {
      setIsSegurosEnviando(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchRecentAnnouncements()
  }, [])

  const filteredAnnouncements = useMemo(() => {
    let result = [...recentAnnouncements]
    if (typeFilter !== "all") result = result.filter((a) => a.type === typeFilter)
    if (priorityFilter !== "all") result = result.filter((a) => a.priority === priorityFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (a) => a.title?.toLowerCase().includes(q) || a.message?.toLowerCase().includes(q)
      )
    }
    return result
  }, [recentAnnouncements, typeFilter, priorityFilter, searchQuery])

  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  // Delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [announcementToDelete, setAnnouncementToDelete] = useState<any | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const hasActiveFilters = typeFilter !== "all" || priorityFilter !== "all" || searchQuery.trim() !== ""

  const clearFilters = () => {
    setTypeFilter("all")
    setPriorityFilter("all")
    setSearchQuery("")
  }

  const fetchUsers = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    setIsLoading(true)
    try {
      const response = await usersAPI.getAll(token)
      // Incluir vendedores y supervisores activos
      setUsers(response.users.filter((u) => (u.role === "seller" || u.role === "supervisor") && u.isActive))
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRecentAnnouncements = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const response = await announcementsAPI.getAdminHistory(token)
      setRecentAnnouncements(response.notifications || [])
    } catch (error) {
      console.error("Error fetching announcements:", error)
    }
  }

  const handleDeleteOne = async () => {
    if (!announcementToDelete) return
    const token = localStorage.getItem("token")
    if (!token) return
    try {
      setIsDeleting(true)
      await announcementsAPI.delete(token, announcementToDelete._id)
      setRecentAnnouncements(prev => prev.filter(a => a._id !== announcementToDelete._id))
      setSelectedIds(prev => { const next = new Set(prev); next.delete(announcementToDelete._id); return next })
      toast({ title: "Anuncio eliminado" })
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar el anuncio", variant: "destructive" })
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setAnnouncementToDelete(null)
    }
  }

  const handleDeleteMany = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    const ids = Array.from(selectedIds)
    try {
      setIsDeleting(true)
      await announcementsAPI.deleteMany(token, ids)
      setRecentAnnouncements(prev => prev.filter(a => !selectedIds.has(a._id)))
      setSelectedIds(new Set())
      toast({ title: `${ids.length} anuncio(s) eliminados` })
    } catch {
      toast({ title: "Error", description: "No se pudieron eliminar los anuncios", variant: "destructive" })
    } finally {
      setIsDeleting(false)
      setIsBulkDeleteOpen(false)
    }
  }

  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAnnouncements.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredAnnouncements.map(a => a._id)))
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + attachments.length > 5) {
      toast({
        title: "Limite de archivos",
        description: "Maximo 5 archivos por anuncio",
        variant: "destructive",
      })
      return
    }
    setAttachments((prev) => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSendAnnouncement = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    if (!formData.title.trim() || !formData.message.trim()) {
      toast({
        title: "Error",
        description: "El titulo y mensaje son requeridos",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)
    
    // Cerrar dialogo inmediatamente para mejor UX
    const savedFormData = { ...formData }
    const savedAttachments = [...attachments]
    setFormData(initialFormData)
    setAttachments([])
    setIsDialogOpen(false)
    
    try {
      const formDataToSend = new FormData()
      formDataToSend.append("title", savedFormData.title)
      formDataToSend.append("message", savedFormData.message)
      formDataToSend.append("type", savedFormData.type)
      formDataToSend.append("priority", savedFormData.priority)
      formDataToSend.append("recipientType", savedFormData.recipientType)

      if (savedFormData.recipientType === "selected" && savedFormData.recipients.length > 0) {
        formDataToSend.append("recipients", JSON.stringify(savedFormData.recipients))
      }

      if (savedFormData.type === "meeting" && savedFormData.meetingDate) {
        const meetingInfo = {
          date: savedFormData.meetingDate,
          time: savedFormData.meetingTime || "00:00",
          link: savedFormData.meetingLink || null,
          location: savedFormData.meetingLocation || null,
        }
        formDataToSend.append("meetingInfo", JSON.stringify(meetingInfo))
      }

      savedAttachments.forEach((file) => {
        formDataToSend.append("attachments", file)
      })

      // Obtener el companyId actual
      const companyId = localStorage.getItem("selectedCompanyId") || "prosegur"
      
      // AbortController para timeout de 30 segundos
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      
      const response = await fetch(`${API_URL}/api/notifications`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Company-ID": companyId,
        },
        body: formDataToSend,
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al enviar")
      }

const result = await response.json()

      // Enviar notificacion push a los usuarios
      notifyAnnouncement({
        title: savedFormData.title,
        message: savedFormData.message,
        recipientType: savedFormData.recipientType,
        recipients: savedFormData.recipients
      })

      toast({
        title: "Anuncio enviado",
        description: "Los emails y notificaciones push se estan enviando",
      })

      setRecentAnnouncements((prev) => [result.notification, ...prev])
    } catch (error: any) {
      // Si hay error, mostrar mensaje pero el dialogo ya se cerro
      const errorMessage = error.name === 'AbortError' 
        ? "La solicitud tardo demasiado. El anuncio puede haberse enviado igualmente."
        : (error.message || "No se pudo enviar el anuncio")
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const getTypeConfig = (type: string) => {
    switch (type) {
      case "meeting":
        return {
          icon: Calendar,
          label: "Reunion",
          color: "text-blue-500 bg-blue-500/10",
        }
      case "material":
        return {
          icon: FileText,
          label: "Material",
          color: "text-green-500 bg-green-500/10",
        }
      case "warning":
        return {
          icon: AlertTriangle,
          label: "Aviso",
          color: "text-yellow-500 bg-yellow-500/10",
        }
      case "success":
        return {
          icon: CheckCircle2,
          label: "Exito",
          color: "text-green-500 bg-green-500/10",
        }
      default:
        return {
          icon: Info,
          label: "Informacion",
          color: "text-primary bg-primary/10",
        }
    }
  }

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "urgent":
        return { label: "Urgente", color: "text-red-500 bg-red-500/10" }
      case "high":
        return { label: "Alta", color: "text-orange-500 bg-orange-500/10" }
      case "low":
        return { label: "Baja", color: "text-gray-500 bg-gray-500/10" }
      default:
        return { label: "Media", color: "text-blue-500 bg-blue-500/10" }
    }
  }

  const quickAnnouncements = [
    {
      title: "Reunion de equipo",
      type: "meeting" as const,
      priority: "high" as const,
      icon: Calendar,
      description: "Programar una reunion con el equipo",
    },
    {
      title: "Nuevo material",
      type: "material" as const,
      priority: "medium" as const,
      icon: FileText,
      description: "Compartir material de ventas",
    },
    {
      title: "Aviso importante",
      type: "warning" as const,
      priority: "urgent" as const,
      icon: AlertTriangle,
      description: "Enviar comunicado urgente",
    },
    {
      title: "Anuncio general",
      type: "info" as const,
      priority: "medium" as const,
      icon: Bell,
      description: "Comunicado general al equipo",
    },
  ]

  if (isLoading) {
    return (
      <DashboardLayout requiredRole={["admin", "admin_seguros"]}>
        <div className="flex items-center justify-center h-[60vh]">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole={["admin", "admin_seguros"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Anuncios</h1>
            <p className="text-muted-foreground">
              Envia comunicados, reuniones y material a tu equipo de vendedores
            </p>
          </div>
          <div className="flex gap-2">
            {isSeguros && (
              <Button
                variant="outline"
                onClick={() => { resetSegurosDialog(); setIsSegurosMailOpen(true) }}
                className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
              >
                <Mail className="mr-2 h-4 w-4" />
                Email Masivo Clientes
              </Button>
            )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Anuncio
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Anuncio</DialogTitle>
                <DialogDescription>
                  Los vendedores recibiran una notificacion en la app y un email
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Tipo</FieldLabel>
                      <Select
                        value={formData.type}
                        onValueChange={(value: any) =>
                          setFormData((prev) => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Informacion</SelectItem>
                          <SelectItem value="meeting">Reunion</SelectItem>
                          <SelectItem value="material">Material</SelectItem>
                          <SelectItem value="warning">Aviso</SelectItem>
                          <SelectItem value="success">Exito</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </FieldGroup>
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Prioridad</FieldLabel>
                      <Select
                        value={formData.priority}
                        onValueChange={(value: any) =>
                          setFormData((prev) => ({ ...prev, priority: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baja</SelectItem>
                          <SelectItem value="medium">Media</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="urgent">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </FieldGroup>
                </div>

                <FieldGroup>
                  <Field>
                    <FieldLabel>Titulo</FieldLabel>
                    <Input
                      placeholder="Titulo del anuncio"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, title: e.target.value }))
                      }
                    />
                  </Field>
                </FieldGroup>

                <FieldGroup>
                  <Field>
                    <FieldLabel>Mensaje</FieldLabel>
                    <Textarea
                      placeholder="Escribe el mensaje del anuncio..."
                      value={formData.message}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, message: e.target.value }))
                      }
                      rows={4}
                    />
                  </Field>
                </FieldGroup>

                <FieldGroup>
                  <Field>
                    <FieldLabel>Destinatarios</FieldLabel>
                    <Select
                      value={formData.recipientType}
                      onValueChange={(value: any) =>
                        setFormData((prev) => ({ ...prev, recipientType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los usuarios ({users.length})</SelectItem>
                        <SelectItem value="selected">Seleccionar usuarios</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>

                {formData.recipientType === "selected" && (
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Seleccionar usuarios ({formData.recipients.length} seleccionados)</FieldLabel>
                      <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                        {users.map((user) => (
                          <label
                            key={user._id}
                            className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-1.5 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={formData.recipients.includes(user._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData((prev) => ({
                                    ...prev,
                                    recipients: [...prev.recipients, user._id],
                                  }))
                                } else {
                                  setFormData((prev) => ({
                                    ...prev,
                                    recipients: prev.recipients.filter(
                                      (id) => id !== user._id
                                    ),
                                  }))
                                }
                              }}
                              className="rounded border-border"
                            />
                            <span className="text-sm flex-1">{user.name}</span>
                            <span className={cn(
                              "text-xs px-1.5 py-0.5 rounded",
                              user.role === "supervisor" 
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" 
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            )}>
                              {user.role === "supervisor" ? "Supervisor" : "Vendedor"}
                            </span>
                          </label>
                        ))}
                      </div>
                      {users.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData(prev => ({ ...prev, recipients: users.map(u => u._id) }))}
                          >
                            Seleccionar todos
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData(prev => ({ ...prev, recipients: [] }))}
                          >
                            Deseleccionar todos
                          </Button>
                        </div>
                      )}
                    </Field>
                  </FieldGroup>
                )}

                {formData.type === "meeting" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <FieldGroup>
                        <Field>
                          <FieldLabel>Fecha</FieldLabel>
                          <Input
                            type="date"
                            value={formData.meetingDate}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                meetingDate: e.target.value,
                              }))
                            }
                          />
                        </Field>
                      </FieldGroup>
                      <FieldGroup>
                        <Field>
                          <FieldLabel>Hora</FieldLabel>
                          <Input
                            type="time"
                            value={formData.meetingTime}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                meetingTime: e.target.value,
                              }))
                            }
                          />
                        </Field>
                      </FieldGroup>
                    </div>
                    <FieldGroup>
                      <Field>
                        <FieldLabel>Link de reunion (Meet, Zoom, etc.)</FieldLabel>
                        <Input
                          placeholder="https://meet.google.com/..."
                          value={formData.meetingLink}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              meetingLink: e.target.value,
                            }))
                          }
                        />
                      </Field>
                    </FieldGroup>
                    <FieldGroup>
                      <Field>
                        <FieldLabel>Ubicacion (opcional)</FieldLabel>
                        <Input
                          placeholder="Oficina central, Sala de reuniones..."
                          value={formData.meetingLocation}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              meetingLocation: e.target.value,
                            }))
                          }
                        />
                      </Field>
                    </FieldGroup>
                  </>
                )}

                {/* Attachments */}
                <FieldGroup>
                  <Field>
                    <FieldLabel>Archivos adjuntos (max 5)</FieldLabel>
                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={attachments.length >= 5}
                        className="w-full"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Subir archivos
                      </Button>
                      {attachments.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {attachments.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm truncate">{file.name}</span>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAttachment(index)}
                                className="h-6 w-6 p-0 shrink-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Field>
                </FieldGroup>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setFormData(initialFormData)
                    setAttachments([])
                  }}
                  disabled={isSending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSendAnnouncement}
                  disabled={isSending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isSending ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Vendedores activos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{recentAnnouncements.length}</p>
                  <p className="text-sm text-muted-foreground">Anuncios enviados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">Email + App</p>
                  <p className="text-sm text-muted-foreground">Entrega instantanea</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>Acciones rapidas</CardTitle>
            <CardDescription>Selecciona un tipo de anuncio para comenzar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickAnnouncements.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.type}
                    onClick={() => {
                      setFormData({
                        ...initialFormData,
                        type: item.type,
                        priority: item.priority,
                        title: item.type === "info" ? "" : item.title,
                      })
                      setIsDialogOpen(true)
                    }}
                    className="p-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center mb-3",
                        getTypeConfig(item.type).color
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  Anuncios Recientes
                </CardTitle>
                <CardDescription>Historial de comunicados enviados ({recentAnnouncements.length})</CardDescription>
              </div>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-muted-foreground">{selectedIds.size} seleccionado(s)</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setIsBulkDeleteOpen(true)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Eliminar seleccionados
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            {recentAnnouncements.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por titulo o mensaje..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-secondary/50"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[165px] bg-secondary/50">
                    <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="info">Informacion</SelectItem>
                    <SelectItem value="meeting">Reunion</SelectItem>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="warning">Aviso</SelectItem>
                    <SelectItem value="success">Exito</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-full sm:w-[170px] bg-secondary/50">
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las prioridades</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpiar filtros">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            {hasActiveFilters && (
              <p className="text-xs text-muted-foreground -mt-3 mb-4">
                Mostrando {filteredAnnouncements.length} de {recentAnnouncements.length} anuncios
              </p>
            )}

            {recentAnnouncements.length === 0 ? (
              <div className="py-12 text-center">
                <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No has enviado anuncios todavia
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Crea tu primer anuncio para comunicarte con tu equipo
                </p>
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <div className="py-12 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Sin resultados para ese filtro</p>
                <Button variant="link" className="mt-2" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Select all row */}
                {filteredAnnouncements.length > 1 && (
                  <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredAnnouncements.length && filteredAnnouncements.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-border accent-primary h-4 w-4"
                    />
                    <span className="text-xs text-muted-foreground">
                      {selectedIds.size === filteredAnnouncements.length ? "Deseleccionar todos" : "Seleccionar todos"}
                    </span>
                  </div>
                )}
                {filteredAnnouncements.map((announcement) => {
                  const typeConfig = getTypeConfig(announcement.type)
                  const priorityConfig = getPriorityConfig(announcement.priority)
                  const Icon = typeConfig.icon
                  const isChecked = selectedIds.has(announcement._id)
                  return (
                    <div
                      key={announcement._id}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-lg border bg-secondary/20 transition-all",
                        isChecked ? "border-primary/50 bg-primary/5" : "border-border/50 hover:border-primary/30 hover:bg-secondary/40"
                      )}
                    >
                      {/* Checkbox */}
                      <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectId(announcement._id)}
                          className="rounded border-border accent-primary h-4 w-4 cursor-pointer"
                        />
                      </div>

                      {/* Icon */}
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer",
                          typeConfig.color
                        )}
                        onClick={() => { setSelectedAnnouncement(announcement); setIsViewDialogOpen(true) }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => { setSelectedAnnouncement(announcement); setIsViewDialogOpen(true) }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-foreground">
                              {announcement.title}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {announcement.message}
                            </p>
                            {announcement.meetingInfo && (
                              <div className="flex items-center gap-2 mt-2 text-xs text-blue-500">
                                <Calendar className="h-3 w-3" />
                                {announcement.meetingInfo.date} {announcement.meetingInfo.time}
                                {announcement.meetingInfo.link && (
                                  <>
                                    <LinkIcon className="h-3 w-3 ml-2" />
                                    <a
                                      href={announcement.meetingInfo.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Link
                                    </a>
                                  </>
                                )}
                              </div>
                            )}
                            {announcement.attachments?.length > 0 && (
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <Paperclip className="h-3 w-3" />
                                {announcement.attachments.length} archivo(s) adjunto(s)
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0 space-y-1">
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                                typeConfig.color
                              )}
                            >
                              {typeConfig.label}
                            </span>
                            <span
                              className={cn(
                                "block px-2 py-1 rounded-full text-xs font-medium",
                                priorityConfig.color
                              )}
                            >
                              {priorityConfig.label}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {new Date(announcement.createdAt).toLocaleDateString(
                                "es-AR",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Delete button */}
                      <div className="shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => {
                            setAnnouncementToDelete(announcement)
                            setIsDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email Masivo Seguros */}
      {isSeguros && (
        <Dialog open={isSegurosMailOpen} onOpenChange={(open) => { if (!open) resetSegurosDialog(); setIsSegurosMailOpen(open) }}>
          <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
            {segurosStep === "form" && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                    Email Masivo a Clientes
                  </DialogTitle>
                  <DialogDescription>
                    Se enviará un email a todos los clientes de pólizas (VIGENTE y ANULADA) que tengan email registrado.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {/* Destinatarios */}
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Destinatarios</FieldLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          { value: "todos", label: "Todos los clientes" },
                          { value: "vigentes", label: "Solo vigentes" },
                          { value: "anulados", label: "Solo anulados" },
                          { value: "individual", label: "Individual" },
                        ] as { value: DestinatarioTipo; label: string }[]).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setSegurosDestinatarioTipo(opt.value)
                              setSegurosSearchQ("")
                              setSegurosSearchResults([])
                              setSegurosSelectedPolizas([])
                            }}
                            className={cn(
                              "px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left",
                              segurosDestinatarioTipo === opt.value
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-border bg-secondary/30 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </FieldGroup>

                  {/* Individual search */}
                  {segurosDestinatarioTipo === "individual" && (
                    <FieldGroup>
                      <Field>
                        <FieldLabel>Buscar asegurado</FieldLabel>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Nombre del asegurado..."
                            value={segurosSearchQ}
                            onChange={(e) => setSegurosSearchQ(e.target.value)}
                            className="pl-9"
                          />
                          {segurosSearchLoading && (
                            <Spinner className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" />
                          )}
                        </div>
                        {segurosSearchResults.length > 0 && (
                          <div className="mt-1 border border-border rounded-lg max-h-44 overflow-y-auto divide-y divide-border/50">
                            {segurosSearchResults.map((p) => {
                              const isSelected = segurosSelectedPolizas.some(s => s._id === p._id)
                              return (
                                <label
                                  key={p._id}
                                  className={cn(
                                    "flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-secondary/50 transition-colors",
                                    isSelected && "bg-blue-50 dark:bg-blue-950/20"
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSegurosSelectedPolizas(prev => [...prev, p])
                                      } else {
                                        setSegurosSelectedPolizas(prev => prev.filter(s => s._id !== p._id))
                                      }
                                    }}
                                    className="rounded"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{p.nombreApellido}</p>
                                    <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                                  </div>
                                  <span className={cn(
                                    "text-xs px-1.5 py-0.5 rounded shrink-0",
                                    p.estado === "VIGENTE"
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                  )}>
                                    {p.estado}
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        )}
                        {segurosSearchQ.trim().length >= 2 && !segurosSearchLoading && segurosSearchResults.length === 0 && (
                          <p className="text-xs text-muted-foreground mt-1">Sin resultados</p>
                        )}
                        {segurosSelectedPolizas.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {segurosSelectedPolizas.map((p) => (
                              <span
                                key={p._id}
                                className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded-full"
                              >
                                {p.nombreApellido.split(" ").slice(0, 2).join(" ")}
                                <button
                                  type="button"
                                  onClick={() => setSegurosSelectedPolizas(prev => prev.filter(s => s._id !== p._id))}
                                  className="hover:text-blue-900 dark:hover:text-blue-100"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </Field>
                    </FieldGroup>
                  )}

                  <FieldGroup>
                    <Field>
                      <FieldLabel>Asunto del email</FieldLabel>
                      <Input
                        placeholder="Ej: Novedades de Grupo JV Seguros"
                        value={segurosAsunto}
                        onChange={(e) => setSegurosAsunto(e.target.value)}
                      />
                    </Field>
                  </FieldGroup>
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Mensaje</FieldLabel>
                      <Textarea
                        placeholder="Escribí el mensaje que recibirán tus clientes..."
                        value={segurosMensaje}
                        onChange={(e) => setSegurosMensaje(e.target.value)}
                        rows={5}
                      />
                    </Field>
                  </FieldGroup>
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Imagen publicitaria (opcional)</FieldLabel>
                      <input
                        ref={segurosImagenRef}
                        type="file"
                        accept="image/*"
                        onChange={handleSegurosImagenSelect}
                        className="hidden"
                      />
                      {segurosImagenPreview ? (
                        <div className="space-y-2">
                          <div className="relative rounded-lg overflow-hidden border border-border/50 bg-secondary/20">
                            <img
                              src={segurosImagenPreview}
                              alt="Preview"
                              className="w-full max-h-52 object-contain"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setSegurosImagen(null)
                                setSegurosImagenPreview(null)
                                setSegurosImagenBase64(null)
                                if (segurosImagenRef.current) segurosImagenRef.current.value = ""
                              }}
                              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground">{segurosImagen?.name}</p>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => segurosImagenRef.current?.click()}
                          className="w-full"
                        >
                          <ImageIcon className="mr-2 h-4 w-4" />
                          Subir imagen
                        </Button>
                      )}
                    </Field>
                  </FieldGroup>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsSegurosMailOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSegurosContinuar}
                    disabled={isSegurosLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSegurosLoading ? (
                      <><Spinner className="mr-2 h-4 w-4" />Verificando...</>
                    ) : (
                      <>Continuar</>
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}

            {segurosStep === "confirm" && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                    Confirmar envío
                  </DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-4 text-center">
                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{segurosDestinatarios}</p>
                    <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">clientes recibirán este email</p>
                  </div>
                  <div className="rounded-lg bg-secondary/40 p-4 space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Destinatarios: </span>
                      <span className="font-medium">
                        {segurosDestinatarioTipo === "todos" && "Todos (vigentes + anulados)"}
                        {segurosDestinatarioTipo === "vigentes" && "Solo vigentes"}
                        {segurosDestinatarioTipo === "anulados" && "Solo anulados"}
                        {segurosDestinatarioTipo === "individual" && `${segurosSelectedPolizas.length} cliente(s) seleccionado(s)`}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Asunto: </span>
                      <span className="font-medium">{segurosAsunto}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mensaje: </span>
                      <span className="line-clamp-3">{segurosMensaje}</span>
                    </div>
                    {segurosImagen && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span>{segurosImagen.name}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Esta acción no se puede deshacer. Los emails se enviarán a todos los clientes con email registrado.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSegurosStep("form")} disabled={isSegurosEnviando}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                  </Button>
                  <Button
                    onClick={handleSegurosSend}
                    disabled={isSegurosEnviando}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSegurosEnviando ? (
                      <><Spinner className="mr-2 h-4 w-4" />Enviando...</>
                    ) : (
                      <><Send className="mr-2 h-4 w-4" />Enviar a {segurosDestinatarios} clientes</>
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}

            {segurosStep === "result" && segurosResultado && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Emails enviados
                  </DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-4 text-center">
                      <p className="text-3xl font-bold text-green-700 dark:text-green-400">{segurosResultado.enviados}</p>
                      <p className="text-sm text-green-600 dark:text-green-300 mt-1">enviados correctamente</p>
                    </div>
                    <div className={cn(
                      "rounded-lg border p-4 text-center",
                      segurosResultado.fallidos > 0
                        ? "border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800"
                        : "border-border bg-secondary/30"
                    )}>
                      <p className={cn("text-3xl font-bold", segurosResultado.fallidos > 0 ? "text-red-700 dark:text-red-400" : "text-muted-foreground")}>
                        {segurosResultado.fallidos}
                      </p>
                      <p className={cn("text-sm mt-1", segurosResultado.fallidos > 0 ? "text-red-600 dark:text-red-300" : "text-muted-foreground")}>
                        con error
                      </p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => { setIsSegurosMailOpen(false); resetSegurosDialog() }}>
                    Cerrar
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Delete single announcement */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar anuncio</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente el anuncio:
              <br />
              <strong className="text-foreground">"{announcementToDelete?.title}"</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOne}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete bulk announcements */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar {selectedIds.size} anuncio(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Se eliminaran permanentemente {selectedIds.size} anuncio(s) seleccionado(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMany}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Eliminar {selectedIds.size} anuncio(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Announcement Detail Modal */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[88vh] overflow-y-auto">
          {selectedAnnouncement && (() => {
            const typeConfig = getTypeConfig(selectedAnnouncement.type)
            const priorityConfig = getPriorityConfig(selectedAnnouncement.priority)
            const TypeIcon = typeConfig.icon
            return (
              <>
                <DialogHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", typeConfig.color)}>
                      <TypeIcon className="h-3.5 w-3.5" />
                      {typeConfig.label}
                    </span>
                    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", priorityConfig.color)}>
                      {priorityConfig.label}
                    </span>
                  </div>
                  <DialogTitle className="text-xl leading-snug">{selectedAnnouncement.title}</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground pt-1">
                    {new Date(selectedAnnouncement.createdAt).toLocaleDateString("es-AR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                  {/* Message */}
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedAnnouncement.message}
                  </p>

                  {/* Meeting info */}
                  {selectedAnnouncement.meetingInfo && (
                    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                      <p className="text-sm font-semibold text-blue-600 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Información de la reunión
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {selectedAnnouncement.meetingInfo.date && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Fecha</p>
                            <p className="font-medium">{selectedAnnouncement.meetingInfo.date}</p>
                          </div>
                        )}
                        {selectedAnnouncement.meetingInfo.time && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Hora</p>
                            <p className="font-medium">{selectedAnnouncement.meetingInfo.time}</p>
                          </div>
                        )}
                        {selectedAnnouncement.meetingInfo.location && (
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground mb-0.5">Ubicación</p>
                            <p className="font-medium">{selectedAnnouncement.meetingInfo.location}</p>
                          </div>
                        )}
                      </div>
                      {selectedAnnouncement.meetingInfo.link && (
                        <a
                          href={selectedAnnouncement.meetingInfo.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 underline underline-offset-2 font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Unirse a la reunión
                        </a>
                      )}
                    </div>
                  )}

                  {/* Attachments */}
                  {selectedAnnouncement.attachments?.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        Archivos adjuntos ({selectedAnnouncement.attachments.length})
                      </p>
                      <div className="space-y-3">
                        {selectedAnnouncement.attachments.map((att: any, idx: number) => {
                          const isImage = att.mimetype?.startsWith("image/") ||
                            /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.filename || att.originalname || "")
                          const fileUrl = att.url || `${API_URL}/${att.path}`
                          const fileName = att.filename || att.originalname || `Archivo ${idx + 1}`

                          if (isImage) {
                            return (
                              <div key={idx} className="rounded-lg overflow-hidden border border-border/50">
                                <img
                                  src={fileUrl}
                                  alt={fileName}
                                  className="w-full max-h-72 object-contain bg-secondary/30"
                                />
                                <div className="flex items-center justify-between px-3 py-2 bg-secondary/20">
                                  <span className="text-xs text-muted-foreground truncate flex-1 mr-2">{fileName}</span>
                                  <a
                                    href={fileUrl}
                                    download={fileName}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1.5">
                                      <Download className="h-3.5 w-3.5" />
                                      Descargar
                                    </Button>
                                  </a>
                                </div>
                              </div>
                            )
                          }

                          return (
                            <a
                              key={idx}
                              href={fileUrl}
                              download={fileName}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors group"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <FileText className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{fileName}</p>
                                {att.size && (
                                  <p className="text-xs text-muted-foreground">
                                    {att.size < 1024 * 1024
                                      ? `${(att.size / 1024).toFixed(1)} KB`
                                      : `${(att.size / (1024 * 1024)).toFixed(1)} MB`}
                                  </p>
                                )}
                              </div>
                              <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
