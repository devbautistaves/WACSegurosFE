"use client"

import { Bell, Search, Menu, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useEffect, useState } from "react"
import { notificationsAPI, Notification } from "@/lib/api"
import Link from "next/link"

interface HeaderProps {
  userName: string
  role: "admin" | "seller" | "supervisor" | "support"
  onMenuClick?: () => void
}

export function Header({ userName, role, onMenuClick }: HeaderProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/login")
  }

  useEffect(() => {
    const fetchNotifications = async () => {
      const token = localStorage.getItem("token")
      if (!token) return

      try {
        const [countRes, notifRes] = await Promise.all([
          notificationsAPI.getUnreadCount(token),
          notificationsAPI.getAll(token),
        ])
        setUnreadCount(countRes.count)
        setNotifications(notifRes.notifications.slice(0, 5))
      } catch (error) {
        console.error("Error fetching notifications:", error)
      }
    }

    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center gap-2 md:gap-4 border-b border-slate-200 bg-white px-3 md:px-6 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden flex-shrink-0"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* WAC Seguros — no company selector needed (single company) */}

      {/* Search - hidden on small mobile */}
      <div className="flex-1 max-w-md hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar..."
            className="pl-9 bg-slate-50 border-slate-200 focus:border-[#1a3a5c] focus:ring-[#1a3a5c]"
          />
        </div>
      </div>

      {/* Spacer for mobile */}
      <div className="flex-1 sm:hidden" />

      <div className="flex items-center gap-2 md:gap-4">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#1d4ed8] text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notificaciones
              {unreadCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {unreadCount} sin leer
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No hay notificaciones
              </div>
            ) : (
              notifications.map((notif) => (
                <DropdownMenuItem key={notif._id} className="flex flex-col items-start gap-1 p-3">
                  <span className={`text-sm ${!notif.isRead ? "font-semibold" : ""}`}>
                    {notif.title}
                  </span>
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {notif.message}
                  </span>
                </DropdownMenuItem>
              ))
            )}
            {role !== "support" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/${role}/notifications`} className="w-full text-center text-sm text-primary">
                    Ver todas
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 md:px-3">
              <Avatar className="h-7 w-7 md:h-8 md:w-8">
                <AvatarFallback className="bg-[#0f2149] text-white text-xs md:text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:block text-sm font-medium">{userName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {role !== "support" && (
              <>
                <DropdownMenuItem asChild>
                  <Link href={`/${role}/settings`}>Perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/${role}/settings`}>Configuracion</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
