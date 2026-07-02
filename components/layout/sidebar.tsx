"use client"


import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Bell,
  Settings,
  LogOut,
  MessageSquare,
  X,
  CreditCard,
  FileText,
  Activity,
  AlertTriangle,
  Shield,
  Megaphone,
  Palette,
  MessageCircle,
  Calculator,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// WAC Seguros colors
const WAC_PRIMARY = "#0f2149"
const WAC_ACCENT  = "#1d4ed8"

interface SidebarProps {
  role: "admin" | "admin_seguros" | "seller" | "supervisor" | "support"
  userName: string
  onLinkClick?: () => void
}

export function Sidebar({ role, userName, onLinkClick }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Branding reactivo: se re-lee cuando emiten "branding-updated"
  const [brandingTick, setBrandingTick] = useState(0)
  useEffect(() => {
    const h = () => setBrandingTick(t => t + 1)
    window.addEventListener("branding-updated", h)
    return () => window.removeEventListener("branding-updated", h)
  }, [])
  let brandingFromStorage: { nombre?: string; logo?: string; colorPrimario?: string } = {}
  if (typeof window !== "undefined") {
    try { const raw = localStorage.getItem("branding"); if (raw) brandingFromStorage = JSON.parse(raw) } catch {}
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _bt = brandingTick // forzar re-render
  const brandingLogo = brandingFromStorage.logo || ""
  const brandingNombre = brandingFromStorage.nombre || ""

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("selectedCompanyId")
    router.push("/login")
  }

  const adminLinks = [
    { href: "/admin",                     label: "Dashboard",      icon: LayoutDashboard },
    { href: "/admin/seguros/polizas",     label: "Pólizas",        icon: FileText },
    { href: "/admin/seguros/cobranzas",   label: "Cobranzas",      icon: CreditCard },
    { href: "/admin/seguros/siniestros",  label: "Siniestros",     icon: AlertTriangle },
    { href: "/admin/multicotizador", label: "Multicotizador", icon: Calculator },
    { href: "/admin/seguros/seguimiento", label: "Seguimiento",    icon: Activity },
    ...(role === "admin" || role === "admin_seguros" ? [{ href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle }] : []),
    ...(role === "admin" ? [{ href: "/admin/users", label: "Usuarios", icon: Users }] : []),
    ...(role === "admin" || role === "admin_seguros" ? [{ href: "/admin/settings/personalizar", label: "Personalizar", icon: Palette }] : []),
    { href: "/admin/announcements",       label: "Anuncios",       icon: Megaphone },
    { href: "/admin/notifications",       label: "Notificaciones", icon: Bell },
    ...(role === "admin" ? [{ href: "/admin/chat", label: "Chat", icon: MessageSquare }] : []),
  ]

  const sellerLinks = [
    { href: "/seller",               label: "Dashboard",      icon: LayoutDashboard },
    { href: "/seller/policies",      label: "Mis Pólizas",    icon: FileText },
    { href: "/seller/notifications", label: "Notificaciones", icon: Bell },
    { href: "/seller/chat",          label: "Chat",           icon: MessageSquare },
  ]

  const isAdmin = role === "admin" || role === "admin_seguros"
  const links = isAdmin ? adminLinks : sellerLinks
  const settingsHref = isAdmin ? "/admin/settings" : "/seller/settings"
  const roleLabel =
    role === "admin" || role === "admin_seguros" ? "Administrador" :
    role === "support" ? "Soporte" : "Vendedor"

  return (
    <aside
      className="h-screen w-64 min-w-[16rem] max-w-[16rem] flex-shrink-0 overflow-hidden shadow-lg"
      style={{ background: WAC_PRIMARY }}
    >
      <div className="flex h-full flex-col">

        {/* Brand */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-2">
            {brandingLogo ? (
              <div className="h-10 w-10 rounded-md bg-white p-1 flex items-center justify-center flex-shrink-0">
                <img src={brandingLogo} alt={brandingNombre || "WAC SEGUROS"} className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <Shield className="h-7 w-7 text-white flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-none tracking-wide truncate">{brandingNombre || "WAC SEGUROS"}</p>
              <p className="text-[9px] text-blue-300 leading-none tracking-widest uppercase mt-0.5">CRM</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-white/70 hover:bg-white/10"
            onClick={onLinkClick}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
              style={{ background: WAC_ACCENT }}
            >
              {userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-xs text-blue-300 capitalize">{roleLabel}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="space-y-0.5">
            {links.map((link) => {
              const Icon = link.icon
              const isActive =
                pathname === link.href ||
                (link.href !== "/admin" && link.href !== "/seller" && pathname.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onLinkClick}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-white/20 text-white shadow-sm"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-white" : "text-white/50")} />
                  {link.label}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-3 space-y-0.5">
          <Link
            href={settingsHref}
            onClick={onLinkClick}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Settings className="h-4 w-4 text-white/50" />
            {isAdmin ? "Configuración" : "Cambiar Contraseña"}
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-white/70 hover:text-red-300 hover:bg-red-900/20 font-medium"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </aside>
  )
}
