"use client"

import { useEffect, useState, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { notificationsAPI, Notification } from "@/lib/api"
import {
  Bell, BellOff, Check, CheckCheck, ShoppingCart, Info, TrendingUp,
  Paperclip, Download, FileText, Search, Filter, Calendar,
  AlertTriangle, CheckCircle2, X, ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"

type TypeFilter = "all" | "info" | "meeting" | "material" | "warning" | "success" | "status_change" | "new_sale"
type ReadFilter = "all" | "unread" | "read"

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "Todos los tipos" },
  { value: "info", label: "Informacion" },
  { value: "meeting", label: "Reunion" },
  { value: "material", label: "Material" },
  { value: "warning", label: "Aviso" },
  { value: "success", label: "Exito" },
  { value: "status_change", label: "Cambio de estado" },
  { value: "new_sale", label: "Nueva venta" },
]

const READ_OPTIONS: { value: ReadFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "unread", label: "Sin leer" },
  { value: "read", label: "Leidas" },
]

const TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  info: { label: "Informacion", icon: Info, color: "text-primary bg-primary/10" },
  meeting: { label: "Reunion", icon: Calendar, color: "text-blue-500 bg-blue-500/10" },
  material: { label: "Material", icon: FileText, color: "text-green-500 bg-green-500/10" },
  warning: { label: "Aviso", icon: AlertTriangle, color: "text-yellow-500 bg-yellow-500/10" },
  success: { label: "Exito", icon: CheckCircle2, color: "text-green-500 bg-green-500/10" },
  status_change: { label: "Cambio de estado", icon: ShoppingCart, color: "text-blue-500 bg-blue-500/10" },
  new_sale: { label: "Nueva venta", icon: TrendingUp, color: "text-green-500 bg-green-500/10" },
}

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || { label: "Informacion", icon: Info, color: "text-primary bg-primary/10" }
}

function getIconColor(type: string, isRead: boolean) {
  if (isRead) return "bg-secondary text-muted-foreground"
  return getTypeConfig(type).color
}

const API_BASE = typeof window !== "undefined" ? "/api/proxy" : ""

function SellerNotificationsInner() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [readFilter, setReadFilter] = useState<ReadFilter>("all")
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const { toast } = useToast()
  const searchParams = useSearchParams()

  useEffect(() => { fetchNotifications() }, [])

  const fetchNotifications = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    try {
      const response = await notificationsAPI.getAll(token)
      const list: Notification[] = response.notifications
      setNotifications(list)
      const openId = searchParams.get("open")
      if (openId) {
        const found = list.find((n) => n._id === openId)
        if (found) {
          setSelectedNotification(found)
          setIsViewModalOpen(true)
          if (!found.isRead) notificationsAPI.markAsRead(token, found._id).catch(() => {})
        }
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const token = localStorage.getItem("token")
    if (!token) return
    try {
      await notificationsAPI.markAsRead(token, id)
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)))
      if (selectedNotification?._id === id) {
        setSelectedNotification((prev: any) => prev ? { ...prev, isRead: true } : prev)
      }
    } catch {
      toast({ title: "Error", description: "No se pudo marcar como leida", variant: "destructive" })
    }
  }

  const handleMarkAllAsRead = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    try {
      await notificationsAPI.markAllAsRead(token)
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      toast({ title: "Listo", description: "Todas las notificaciones marcadas como leidas" })
    } catch {
      toast({ title: "Error", description: "No se pudieron marcar las notificaciones", variant: "destructive" })
    }
  }

  const openNotification = (notification: any) => {
    setSelectedNotification(notification)
    setIsViewModalOpen(true)
    if (!notification.isRead) handleMarkAsRead(notification._id)
  }

  const filtered = useMemo(() => {
    let result = [...notifications]
    if (typeFilter !== "all") result = result.filter((n) => n.type === typeFilter)
    if (readFilter === "unread") result = result.filter((n) => !n.isRead)
    if (readFilter === "read") result = result.filter((n) => n.isRead)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (n) => n.title?.toLowerCase().includes(q) || n.message?.toLowerCase().includes(q)
      )
    }
    return result
  }, [notifications, typeFilter, readFilter, searchQuery])

  const unreadCount = notifications.filter((n) => !n.isRead).length
  const hasActiveFilters = typeFilter !== "all" || readFilter !== "all" || searchQuery.trim() !== ""

  const clearFilters = () => {
    setTypeFilter("all")
    setReadFilter("all")
    setSearchQuery("")
  }

  if (isLoading) {
    return (
      <DashboardLayout requiredRole="seller">
        <div className="flex items-center justify-center h-[60vh]">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="seller">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mis Notificaciones</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} sin leer` : "Todo al dia"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllAsRead} variant="outline">
              <CheckCheck className="mr-2 h-4 w-4" />
              Marcar todas como leidas
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por titulo o mensaje..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-secondary/50"
                />
              </div>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                <SelectTrigger className="w-full sm:w-[180px] bg-secondary/50">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={readFilter} onValueChange={(v) => setReadFilter(v as ReadFilter)}>
                <SelectTrigger className="w-full sm:w-[150px] bg-secondary/50">
                  <Bell className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {READ_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpiar filtros">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {hasActiveFilters && (
              <p className="text-xs text-muted-foreground mt-2">
                Mostrando {filtered.length} de {notifications.length} notificaciones
              </p>
            )}
          </CardContent>
        </Card>

        {/* List */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Historial ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <BellOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {hasActiveFilters ? "Sin resultados para ese filtro" : "No hay notificaciones"}
                </p>
                {hasActiveFilters && (
                  <Button variant="link" className="mt-2" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((notification) => {
                  const typeConfig = getTypeConfig(notification.type)
                  const TypeIcon = typeConfig.icon
                  return (
                    <div
                      key={notification._id}
                      onClick={() => openNotification(notification)}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-lg border transition-all cursor-pointer",
                        notification.isRead
                          ? "bg-secondary/20 border-border/50 hover:border-border hover:bg-secondary/40"
                          : "bg-primary/5 border-primary/30 hover:border-primary/50 hover:bg-primary/10"
                      )}
                    >
                      <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", getIconColor(notification.type, notification.isRead))}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={cn("font-medium truncate", !notification.isRead && "text-foreground")}>
                                {notification.title}
                              </p>
                              {!notification.isRead && (
                                <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                            {(notification as any).attachments?.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                                <Paperclip className="h-3 w-3" />
                                {(notification as any).attachments.length} archivo(s) adjunto(s)
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(notification.createdAt).toLocaleDateString("es-AR", {
                              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleMarkAsRead(notification._id, e)}
                          className="shrink-0"
                          title="Marcar como leida"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notification Detail Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[88vh] overflow-y-auto">
          {selectedNotification && (() => {
            const typeConfig = getTypeConfig(selectedNotification.type)
            const TypeIcon = typeConfig.icon
            return (
              <>
                <DialogHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", typeConfig.color)}>
                      <TypeIcon className="h-3.5 w-3.5" />
                      {typeConfig.label}
                    </span>
                    {selectedNotification.isRead ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
                        <Check className="h-3 w-3" />
                        Leida
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        <Bell className="h-3 w-3" />
                        Nueva
                      </span>
                    )}
                  </div>
                  <DialogTitle className="text-xl leading-snug">{selectedNotification.title}</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground pt-1">
                    {new Date(selectedNotification.createdAt).toLocaleDateString("es-AR", {
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
                    {selectedNotification.message}
                  </p>

                  {/* Meeting info */}
                  {selectedNotification.meetingInfo && (
                    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                      <p className="text-sm font-semibold text-blue-600 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Información de la reunión
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {selectedNotification.meetingInfo.date && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Fecha</p>
                            <p className="font-medium">{selectedNotification.meetingInfo.date}</p>
                          </div>
                        )}
                        {selectedNotification.meetingInfo.time && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Hora</p>
                            <p className="font-medium">{selectedNotification.meetingInfo.time}</p>
                          </div>
                        )}
                        {selectedNotification.meetingInfo.location && (
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground mb-0.5">Ubicación</p>
                            <p className="font-medium">{selectedNotification.meetingInfo.location}</p>
                          </div>
                        )}
                      </div>
                      {selectedNotification.meetingInfo.link && (
                        <a
                          href={selectedNotification.meetingInfo.link}
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
                  {selectedNotification.attachments?.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        Archivos adjuntos ({selectedNotification.attachments.length})
                      </p>
                      <div className="space-y-3">
                        {selectedNotification.attachments.map((att: any, idx: number) => {
                          const isImage =
                            att.type?.startsWith("image/") ||
                            att.mimetype?.startsWith("image/") ||
                            /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.originalName || att.filename || "")
                          const fullUrl = att.url?.startsWith("http") ? att.url : `${API_BASE}${att.url || ""}`
                          const fileName = att.originalName || att.filename || `Archivo ${idx + 1}`

                          if (isImage) {
                            return (
                              <div key={idx} className="rounded-lg overflow-hidden border border-border/50">
                                <img
                                  src={fullUrl}
                                  alt={fileName}
                                  className="w-full max-h-72 object-contain bg-secondary/30"
                                />
                                <div className="flex items-center justify-between px-3 py-2 bg-secondary/20">
                                  <span className="text-xs text-muted-foreground truncate flex-1 mr-2">{fileName}</span>
                                  <a
                                    href={fullUrl}
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
                              href={fullUrl}
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

export default function SellerNotificationsPage() {
  return (
    <Suspense>
      <SellerNotificationsInner />
    </Suspense>
  )
}
