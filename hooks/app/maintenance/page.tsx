"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Wrench, Clock, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function MaintenancePage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check if user is admin
    const userStr = localStorage.getItem("user")
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setIsAdmin(user.role === "admin")
      } catch {
        setIsAdmin(false)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Animated Icon */}
        <div className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
          <div className="relative bg-gradient-to-br from-primary/30 to-primary/10 rounded-full w-32 h-32 flex items-center justify-center border border-primary/30">
            <Wrench className="h-16 w-16 text-primary animate-pulse" />
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            Sistema en Mantenimiento
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Estamos realizando mejoras y actualizaciones para brindarte una mejor experiencia.
            Volvemos en breve.
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-center gap-2 text-amber-400">
            <Clock className="h-5 w-5" />
            <span className="font-medium">Mantenimiento programado</span>
          </div>
          <p className="text-sm text-muted-foreground">
            El sistema estara disponible nuevamente en unos minutos.
            Agradecemos tu paciencia y comprension.
          </p>
        </div>

        {/* Contact Info */}
        <div className="text-sm text-muted-foreground">
          <p>Si necesitas asistencia urgente, contacta a tu supervisor.</p>
        </div>

        {/* Admin Button */}
        {isAdmin && (
          <div className="pt-4 border-t border-border/50">
            <Button 
              variant="outline" 
              onClick={() => router.push("/admin/settings")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al Panel de Admin
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
