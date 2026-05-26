"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { tpyDemosAPI, TPY_Demo } from "@/lib/api"
import { ArrowLeft, CheckCircle, Globe, DollarSign } from "lucide-react"
import Link from "next/link"

export default function ConvertDemoPage() {
  const [demo, setDemo] = useState<TPY_Demo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    domain: "",
    activationPrice: 0,
    monthlyPrice: 0,
  })

  useEffect(() => {
    loadDemo()
  }, [params.id])

  const loadDemo = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem("token")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await tpyDemosAPI.getById(token, params.id as string)
      if (response.success && response.demo) {
        setDemo(response.demo)
        // Pre-fill form with existing data
        setFormData({
          domain: response.demo.demoUrl || "",
          activationPrice: response.demo.activationPrice || 0,
          monthlyPrice: response.demo.monthlyPrice || 0,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar la demo",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.domain || !formData.monthlyPrice) {
      toast({
        title: "Error",
        description: "Dominio y monto mensual son requeridos",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      const token = localStorage.getItem("token")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await tpyDemosAPI.convert(token, params.id as string, formData)
      if (response.success) {
        toast({
          title: "Venta registrada",
          description: "El cliente fue activado exitosamente",
        })
        router.push("/seller/demos")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo convertir la demo",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout requiredRole="seller">
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      </DashboardLayout>
    )
  }

  if (!demo) {
    return (
      <DashboardLayout requiredRole="seller">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-lg font-medium">Demo no encontrada</p>
          <Link href="/seller/demos">
            <Button className="mt-4">Volver a demos</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="seller">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/seller/demos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Convertir Demo a Venta</h1>
            <p className="text-muted-foreground">
              Completa los datos para registrar la venta de {demo.webName}
            </p>
          </div>
        </div>

        {/* Demo Info Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Informacion de la Demo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Nombre Web</p>
                <p className="font-medium">{demo.webName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{demo.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefono</p>
                <p className="font-medium">{demo.phone || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{demo.email || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Dominio */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Dominio
                </CardTitle>
                <CardDescription>
                  Dominio final del cliente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel required>Dominio</FieldLabel>
                    <Input
                      name="domain"
                      value={formData.domain}
                      onChange={handleChange}
                      placeholder="www.minegocio.com.ar"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      URL final donde estara la web del cliente
                    </p>
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            {/* Datos de la Venta */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Datos de la Venta
                </CardTitle>
                <CardDescription>
                  Montos cobrados al cliente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel>Monto de Activacion</FieldLabel>
                    <Input
                      name="activationPrice"
                      type="number"
                      value={formData.activationPrice}
                      onChange={handleChange}
                      placeholder="15000"
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Monto cobrado por la activacion inicial
                    </p>
                  </Field>
                  <Field>
                    <FieldLabel required>Monto del Plan Mensual</FieldLabel>
                    <Input
                      name="monthlyPrice"
                      type="number"
                      value={formData.monthlyPrice}
                      onChange={handleChange}
                      placeholder="5000"
                      min="0"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Monto que pagara mensualmente
                    </p>
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-4">
            <Link href="/seller/demos">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Spinner className="h-4 w-4" />}
              <CheckCircle className="h-4 w-4" />
              Registrar Venta
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
