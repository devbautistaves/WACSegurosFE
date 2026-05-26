"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Globe, DollarSign } from "lucide-react"
import Link from "next/link"
import { tpyClientsAPI } from "@/lib/api"

interface TuPaginaYaSaleFormProps {
  redirectPath: string
  backPath: string
  requiredRole: "seller" | "supervisor" | "admin"
}

export function TuPaginaYaSaleForm({ redirectPath, backPath, requiredRole }: TuPaginaYaSaleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    montoActivacion: "",
    montoAbono: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar campos requeridos
    if (!formData.nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre es obligatorio",
        variant: "destructive",
      })
      return
    }

    if (!formData.apellido.trim()) {
      toast({
        title: "Error",
        description: "El apellido es obligatorio",
        variant: "destructive",
      })
      return
    }

    if (!formData.dni.trim()) {
      toast({
        title: "Error",
        description: "El DNI es obligatorio",
        variant: "destructive",
      })
      return
    }

    if (!formData.montoActivacion || Number(formData.montoActivacion) <= 0) {
      toast({
        title: "Error",
        description: "El monto de activacion es obligatorio y debe ser mayor a 0",
        variant: "destructive",
      })
      return
    }

    if (!formData.montoAbono || Number(formData.montoAbono) <= 0) {
      toast({
        title: "Error",
        description: "El monto de abono mensual es obligatorio y debe ser mayor a 0",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    const token = localStorage.getItem("token")
    if (!token) {
      toast({
        title: "Error",
        description: "No autenticado",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    // Crear cliente en TuPaginaYa
    const clientData = {
      name: `${formData.nombre} ${formData.apellido}`,
      email: "", // Opcional
      phone: "", // Opcional
      businessName: "",
      domain: "",
      webType: "landing" as const,
      monthlyPrice: Number(formData.montoAbono),
      setupPrice: Number(formData.montoActivacion),
      billingDay: 1,
      dni: formData.dni,
      status: "demo_pendiente" as const,
    }

    try {
      await tpyClientsAPI.create(token, clientData)

      toast({
        title: "Venta registrada",
        description: "El cliente se ha registrado correctamente",
      })
      router.push(redirectPath)
    } catch (error) {
      console.error("Error creating client:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo registrar la venta",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (value: string) => {
    const num = Number(value)
    if (isNaN(num)) return "$0"
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(num)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={backPath}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Nueva Venta</h1>
            <p className="text-muted-foreground">Empresa 2 - Registro de cliente</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-blue-500/20 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              Datos de la Venta
            </CardTitle>
            <CardDescription>
              Completa los datos basicos del cliente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="nombre">Nombre *</FieldLabel>
                  <Input
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    placeholder="Juan"
                    required
                    className="bg-secondary/50"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="apellido">Apellido *</FieldLabel>
                  <Input
                    id="apellido"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleInputChange}
                    placeholder="Perez"
                    required
                    className="bg-secondary/50"
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="dni">DNI *</FieldLabel>
                <Input
                  id="dni"
                  name="dni"
                  value={formData.dni}
                  onChange={handleInputChange}
                  placeholder="12345678"
                  required
                  className="bg-secondary/50"
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="montoActivacion">Monto de Activacion *</FieldLabel>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="montoActivacion"
                      name="montoActivacion"
                      type="number"
                      value={formData.montoActivacion}
                      onChange={handleInputChange}
                      placeholder="5000"
                      required
                      className="bg-secondary/50 pl-8"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lo que cobraste por la activacion
                  </p>
                </Field>
                <Field>
                  <FieldLabel htmlFor="montoAbono">Monto Abono Mensual *</FieldLabel>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="montoAbono"
                      name="montoAbono"
                      type="number"
                      value={formData.montoAbono}
                      onChange={handleInputChange}
                      placeholder="3000"
                      required
                      className="bg-secondary/50 pl-8"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cuanto pagara por mes
                  </p>
                </Field>
              </div>
            </FieldGroup>

            {/* Resumen */}
            {(formData.montoActivacion || formData.montoAbono) && (
              <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <h4 className="text-sm font-medium text-foreground mb-3">Resumen de la venta</h4>
                <div className="space-y-2">
                  {formData.nombre && formData.apellido && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cliente:</span>
                      <span className="font-medium">{formData.nombre} {formData.apellido}</span>
                    </div>
                  )}
                  {formData.dni && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">DNI:</span>
                      <span className="font-medium">{formData.dni}</span>
                    </div>
                  )}
                  {formData.montoActivacion && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Activacion:</span>
                      <span className="font-medium text-green-400">{formatCurrency(formData.montoActivacion)}</span>
                    </div>
                  )}
                  {formData.montoAbono && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Abono mensual:</span>
                      <span className="font-medium text-blue-400">{formatCurrency(formData.montoAbono)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-500 hover:bg-blue-600 text-white min-w-[150px]"
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Registrando...
                  </>
                ) : (
                  "Registrar Venta"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
