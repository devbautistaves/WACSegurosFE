"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useMaintenanceMode } from "@/hooks/use-maintenance"
import { usersAPI, User } from "@/lib/api"
import { User as UserIcon, Mail, Phone, MapPin, Shield, Lock, Eye, EyeOff, AlertTriangle, Wrench } from "lucide-react"

export default function AdminSettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { toast } = useToast()
  const { isMaintenanceMode, toggleMaintenanceMode } = useMaintenanceMode()

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const response = await usersAPI.getProfile(token)
      setUser(response.user)
      setFormData({
        name: response.user.name,
        email: response.user.email,
        phone: response.user.phone,
        location: response.user.location,
      })
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData((prev) => ({ ...prev, [name]: value }))
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      await usersAPI.updateProfile(token, {
        name: formData.name,
        phone: formData.phone,
        location: formData.location,
      })

      const userData = localStorage.getItem("user")
      if (userData) {
        const parsed = JSON.parse(userData)
        parsed.name = formData.name
        parsed.phone = formData.phone
        parsed.location = formData.location
        localStorage.setItem("user", JSON.stringify(parsed))
      }

      toast({
        title: "Perfil actualizado",
        description: "Tus datos se han actualizado correctamente",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar el perfil",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos",
        variant: "destructive",
      })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "Las contrasenas nuevas no coinciden",
        variant: "destructive",
      })
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "La contrasena debe tener al menos 6 caracteres",
        variant: "destructive",
      })
      return
    }

    setIsChangingPassword(true)
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      await usersAPI.updateProfile(token, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      } as any)

      toast({
        title: "Contrasena actualizada",
        description: "Tu contrasena se ha actualizado correctamente",
      })

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar la contrasena",
        variant: "destructive",
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

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
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configuracion</h1>
          <p className="text-muted-foreground">
            Administra tu perfil de administrador
          </p>
        </div>

        {/* Maintenance Mode Card */}
        <Card className={`border-2 transition-colors ${isMaintenanceMode ? "border-red-500/50 bg-red-500/5" : "border-border/50 bg-card/50"}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className={`h-5 w-5 ${isMaintenanceMode ? "text-red-400" : "text-muted-foreground"}`} />
              Modo Mantenimiento
            </CardTitle>
            <CardDescription>
              Activa el modo mantenimiento para bloquear el acceso a todos los usuarios excepto administradores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isMaintenanceMode ? "bg-red-500/20" : "bg-muted/50"}`}>
                  <Wrench className={`h-5 w-5 ${isMaintenanceMode ? "text-red-400" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {isMaintenanceMode ? "Mantenimiento ACTIVO" : "Sistema operativo"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isMaintenanceMode 
                      ? "Los usuarios veran una pagina de mantenimiento" 
                      : "Todos los usuarios pueden acceder normalmente"}
                  </p>
                </div>
              </div>
              <Switch
                checked={isMaintenanceMode}
                onCheckedChange={(checked) => {
                  toggleMaintenanceMode(checked)
                  toast({
                    title: checked ? "Modo mantenimiento activado" : "Modo mantenimiento desactivado",
                    description: checked 
                      ? "Los usuarios ahora veran la pagina de mantenimiento" 
                      : "El sistema esta disponible para todos los usuarios",
                  })
                }}
              />
            </div>
            {isMaintenanceMode && (
              <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  ATENCION: El sistema esta en modo mantenimiento. Solo los administradores pueden acceder.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Badge */}
        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">Cuenta de Administrador</p>
                <p className="text-sm text-muted-foreground">
                  Tienes acceso completo al sistema
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Card */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Informacion Personal
            </CardTitle>
            <CardDescription>
              Actualiza tus datos de contacto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="name">Nombre Completo</FieldLabel>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="pl-9 bg-secondary/50"
                    />
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="pl-9 bg-secondary/50 opacity-60"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    El email no se puede modificar
                  </p>
                </Field>
                <Field>
                  <FieldLabel htmlFor="phone">Telefono</FieldLabel>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="pl-9 bg-secondary/50"
                    />
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor="location">Ubicacion</FieldLabel>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="pl-9 bg-secondary/50"
                    />
                  </div>
                </Field>
              </FieldGroup>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar Cambios"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Password Card */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Cambiar Contrasena
            </CardTitle>
            <CardDescription>
              Actualiza tu contrasena de acceso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="currentPassword">Contrasena Actual</FieldLabel>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className="pl-9 pr-10 bg-secondary/50"
                      placeholder="Ingresa tu contrasena actual"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor="newPassword">Nueva Contrasena</FieldLabel>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="pl-9 pr-10 bg-secondary/50"
                      placeholder="Ingresa tu nueva contrasena"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirmPassword">Confirmar Nueva Contrasena</FieldLabel>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="pl-9 pr-10 bg-secondary/50"
                      placeholder="Confirma tu nueva contrasena"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    La contrasena debe tener al menos 6 caracteres
                  </p>
                </Field>
              </FieldGroup>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isChangingPassword}
                  className="bg-primary text-primary-foreground"
                >
                  {isChangingPassword ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Cambiando...
                    </>
                  ) : (
                    "Cambiar Contrasena"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
