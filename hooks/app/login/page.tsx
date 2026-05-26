"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { authAPI } from "@/lib/api"
import { TrendingUp, Shield, BarChart3, Users } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await authAPI.login(email, password)
      localStorage.setItem("token", response.token)
      localStorage.setItem("user", JSON.stringify(response.user))
      // Limpiar la empresa seleccionada para que se use la empresa asignada al usuario
      localStorage.removeItem("selectedCompanyId")
      
      toast({
        title: "Bienvenido",
        description: `Hola ${response.user.name}!`,
      })

      if (response.user.role === "admin") {
        router.push("/admin")
      } else if (response.user.role === "supervisor") {
        router.push("/supervisor")
      } else if (response.user.role === "support") {
        router.push("/support")
      } else {
        router.push("/seller")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Credenciales incorrectas",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-secondary to-background p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">TusVentas</span>
          </div>
        </div>
        
        <div className="space-y-8">
          <h1 className="text-4xl font-bold text-foreground leading-tight text-balance">
            Sistema de Gestion de Ventas Profesional
          </h1>
          <p className="text-lg text-muted-foreground text-pretty">
            Gestiona tu equipo de ventas, controla comisiones y optimiza el rendimiento de tu negocio.
          </p>
          
          <div className="grid grid-cols-2 gap-6">
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Dashboard"
              description="Metricas en tiempo real"
            />
            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              title="Equipo"
              description="Gestion de vendedores"
            />
            <FeatureCard
              icon={<TrendingUp className="h-5 w-5" />}
              title="Ventas"
              description="Seguimiento completo"
            />
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title="Seguro"
              description="Datos protegidos"
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          2024 TusVentas. Todos los derechos reservados.
        </p>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="space-y-1 text-center">
            <div className="lg:hidden flex items-center justify-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold text-foreground">TusVentas</span>
            </div>
            <CardTitle className="text-2xl font-bold">Iniciar Sesion</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-secondary/50"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Contrasena</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-secondary/50"
                  />
                </Field>
              </FieldGroup>
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Ingresando...
                  </>
                ) : (
                  "Ingresar"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border/50">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
