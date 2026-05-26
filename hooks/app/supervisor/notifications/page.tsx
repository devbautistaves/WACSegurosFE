"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { StatusBadge } from "@/components/ui/status-badge"
import { useToast } from "@/hooks/use-toast"
import { notificationsAPI, Notification } from "@/lib/api"
import { Bell, BellOff, Check, CheckCheck, ShoppingCart, Info, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

export default function SupervisorNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const response = await notificationsAPI.getAll(token)
      setNotifications(response.notifications)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      await notificationsAPI.markAsRead(token, id)
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      )
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo marcar como leida",
        variant: "destructive",
      })
    }
  }

  const handleMarkAllAsRead = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      await notificationsAPI.markAllAsRead(token)
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      toast({
        title: "Notificaciones marcadas",
        description: "Todas las notificaciones han sido marcadas como leidas",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron marcar las notificaciones",
        variant: "destructive",
      })
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "status_change":
        return <ShoppingCart className="h-5 w-5" />
      case "new_sale":
        return <TrendingUp className="h-5 w-5" />
      default:
        return <Info className="h-5 w-5" />
    }
  }

  const getNotificationColor = (type: string, isRead: boolean) => {
    if (isRead) return "bg-secondary text-muted-foreground"
    switch (type) {
      case "status_change":
        return "bg-blue-500/20 text-blue-400"
      case "new_sale":
        return "bg-green-500/20 text-green-400"
      default:
        return "bg-primary/20 text-primary"
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  if (isLoading) {
    return (
      <DashboardLayout requiredRole="supervisor">
        <div className="flex items-center justify-center h-[60vh]">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="supervisor">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mis Notificaciones</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0
                ? `Tienes ${unreadCount} notificaciones sin leer`
                : "No tienes notificaciones sin leer"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              variant="outline"
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Marcar todas como leidas
            </Button>
          )}
        </div>

        {/* Info Card */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Notificaciones en tiempo real</p>
                <p className="text-sm text-muted-foreground">
                  Recibiras una notificacion cada vez que el estado de una venta cambie
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Historial de Notificaciones
            </CardTitle>
            <CardDescription>
              Cambios de estado y actualizaciones de tus ventas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <BellOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">No hay notificaciones</p>
                <p className="text-sm text-muted-foreground">
                  Las notificaciones apareceran aqui cuando el estado de tus ventas cambie
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-lg border transition-colors",
                      notification.isRead
                        ? "bg-secondary/20 border-border/50"
                        : "bg-primary/5 border-primary/30"
                    )}
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                        getNotificationColor(notification.type, notification.isRead)
                      )}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p
                            className={cn(
                              "font-medium",
                              !notification.isRead && "text-foreground"
                            )}
                          >
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(notification.createdAt).toLocaleDateString("es-AR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMarkAsRead(notification._id)}
                        className="shrink-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
