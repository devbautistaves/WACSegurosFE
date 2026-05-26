"use client"

import { useEffect, useState, useRef } from "react"
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
import { usersAPI, notificationsAPI, User } from "@/lib/api"
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
  Bell
} from "lucide-react"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.100.6:3000"

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

  useEffect(() => {
    fetchUsers()
    fetchRecentAnnouncements()
  }, [])

  const fetchUsers = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    setIsLoading(true)
    try {
      const response = await usersAPI.getAll(token)
      setUsers(response.users.filter((u) => u.role === "seller" && u.isActive))
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
      const response = await notificationsAPI.getAll(token)
      setRecentAnnouncements(response.notifications?.slice(0, 10) || [])
    } catch (error) {
      console.error("Error fetching announcements:", error)
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
    try {
      const formDataToSend = new FormData()
      formDataToSend.append("title", formData.title)
      formDataToSend.append("message", formData.message)
      formDataToSend.append("type", formData.type)
      formDataToSend.append("priority", formData.priority)
      formDataToSend.append("recipientType", formData.recipientType)

      if (formData.recipientType === "selected" && formData.recipients.length > 0) {
        formDataToSend.append("recipients", JSON.stringify(formData.recipients))
      }

      if (formData.type === "meeting" && formData.meetingDate) {
        const meetingInfo = {
          date: formData.meetingDate,
          time: formData.meetingTime || "00:00",
          link: formData.meetingLink || null,
          location: formData.meetingLocation || null,
        }
        formDataToSend.append("meetingInfo", JSON.stringify(meetingInfo))
      }

      attachments.forEach((file) => {
        formDataToSend.append("attachments", file)
      })

      const response = await fetch(`${API_URL}/api/notifications`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al enviar")
      }

      const result = await response.json()

      toast({
        title: "Anuncio enviado",
        description: "El anuncio ha sido enviado y los vendedores recibiran un email",
      })

      setRecentAnnouncements((prev) => [result.notification, ...prev])
      setFormData(initialFormData)
      setAttachments([])
      setIsDialogOpen(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el anuncio",
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
      <DashboardLayout requiredRole="admin">
        <div className="flex items-center justify-center h-[60vh]">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Anuncios</h1>
            <p className="text-muted-foreground">
              Envia comunicados, reuniones y material a tu equipo de vendedores
            </p>
          </div>
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
                        <SelectItem value="all">Todos los vendedores</SelectItem>
                        <SelectItem value="selected">Seleccionar vendedores</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>

                {formData.recipientType === "selected" && (
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Seleccionar vendedores</FieldLabel>
                      <div className="border rounded-lg p-3 max-h-32 overflow-y-auto space-y-2">
                        {users.map((user) => (
                          <label
                            key={user._id}
                            className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-1 rounded"
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
                            <span className="text-sm">{user.name}</span>
                          </label>
                        ))}
                      </div>
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
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Anuncios Recientes
            </CardTitle>
            <CardDescription>Historial de comunicados enviados</CardDescription>
          </CardHeader>
          <CardContent>
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
            ) : (
              <div className="space-y-3">
                {recentAnnouncements.map((announcement) => {
                  const typeConfig = getTypeConfig(announcement.type)
                  const priorityConfig = getPriorityConfig(announcement.priority)
                  const Icon = typeConfig.icon
                  return (
                    <div
                      key={announcement._id}
                      className="flex items-start gap-4 p-4 rounded-lg border border-border/50 bg-secondary/20"
                    >
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                          typeConfig.color
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
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
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
