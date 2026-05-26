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
import { Shield, FileText, CreditCard, Activity, AlertTriangle } from "lucide-react"

const WAC_PRIMARY = "#0f2149"
const WAC_ACCENT  = "#1d4ed8"

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
      localStorage.setItem("selectedCompanyId", "seguros")

      toast({ title: "Bienvenido", description: `Hola ${response.user.name}!` })

      const role = response.user.role
      if (role === "admin" || role === "admin_seguros") {
        router.push("/admin")
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

  const features = [
    { icon: FileText,     text: "Gestión de Pólizas" },
    { icon: CreditCard,   text: "Cobranzas y Vencimientos" },
    { icon: AlertTriangle,text: "Registro de Siniestros" },
    { icon: Activity,     text: "Seguimiento de Clientes" },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left — Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${WAC_PRIMARY} 0%, #0a1730 100%)` }}
      >
        {/* Shield watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <Shield className="h-96 w-96 text-white" />
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center p-12 w-full h-full">
          {/* Logo text */}
          <div className="flex flex-col items-center mb-10">
            <div className="flex items-center gap-4 mb-3">
              <Shield className="h-14 w-14 text-white" />
              <div>
                <p className="text-4xl font-black text-white tracking-wide">WAC</p>
                <p className="text-lg text-blue-300 tracking-[0.3em] uppercase font-medium">Seguros</p>
              </div>
            </div>
            <div className="h-px w-40 bg-white/20 mt-4" />
          </div>

          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white leading-tight">
                CRM de Gestión de Seguros
              </h1>
              <p className="text-blue-300 font-medium">
                Pólizas · Siniestros · Cobranzas · Seguimiento
              </p>
            </div>

            <div className="pt-6 space-y-3">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-white/90">
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center"
                    style={{ background: `${WAC_ACCENT}33` }}
                  >
                    <feature.icon className="h-4 w-4" style={{ color: "#93c5fd" }} />
                  </div>
                  <span className="text-sm">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <Card className="w-full max-w-md border-slate-200 shadow-xl">
          <CardHeader className="space-y-4 text-center pb-2">
            {/* Mobile logo */}
            <div className="lg:hidden flex justify-center mb-2">
              <div className="flex items-center gap-3">
                <Shield className="h-9 w-9" style={{ color: WAC_PRIMARY }} />
                <div className="text-left">
                  <p className="text-xl font-black" style={{ color: WAC_PRIMARY }}>WAC SEGUROS</p>
                  <p className="text-xs text-slate-500 tracking-widest uppercase">CRM</p>
                </div>
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-slate-800">
                Iniciar Sesión
              </CardTitle>
              <CardDescription className="text-slate-500 mt-1">
                Ingresá tus credenciales para acceder al sistema
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleLogin} className="space-y-5">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email" className="text-slate-700">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white border-slate-300"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password" className="text-slate-700">Contraseña</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white border-slate-300"
                  />
                </Field>
              </FieldGroup>

              <Button
                type="submit"
                className="w-full text-white font-semibold py-5"
                style={{ background: WAC_PRIMARY }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Spinner className="mr-2 h-4 w-4" /> Ingresando...</>
                ) : (
                  "Ingresar"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-200 text-center">
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <Shield className="h-4 w-4" />
                <p className="text-xs">WAC Seguros CRM · Powered by TusVentas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
