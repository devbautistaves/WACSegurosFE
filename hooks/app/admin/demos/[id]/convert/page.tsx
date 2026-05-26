"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { clientsAPI, Client, ConvertDemoData } from "@/lib/api"
import { ArrowLeft, Upload, X, CheckCircle, Globe, DollarSign } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function AdminConvertDemoPage() {
  const [client, setClient] = useState<Client | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()

  const [formData, setFormData] = useState<ConvertDemoData>({
    name: "",
    email: "",
    whatsapp: "",
    domain: "",
    monthlyPrice: 0,
    setupPrice: 0,
    paymentProofUrl: "",
    activateNow: true,
  })

  useEffect(() => {
    loadClient()
  }, [params.id])

  const loadClient = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem("token")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await clientsAPI.getById(token, params.id as string)
      if (response.success) {
        setClient(response.client)
        setFormData((prev) => ({
          ...prev,
          name: response.client.name,
          whatsapp: response.client.whatsapp || response.client.phone || "",
        }))
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setPaymentProofPreview(base64)
        setFormData((prev) => ({ ...prev, paymentProofUrl: base64 }))
      }
      reader.readAsDataURL(file)
    }
  }

  const removeFile = () => {
    setPaymentProofPreview(null)
    setFormData((prev) => ({ ...prev, paymentProofUrl: "" }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.domain || !formData.monthlyPrice) {
      toast({
        title: "Error",
        description: "Email, dominio y monto mensual son requeridos",
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

      const response = await clientsAPI.convertDemo(token, params.id as string, formData)
      if (response.success) {
        toast({
          title: "Venta registrada",
          description: formData.activateNow 
            ? "El cliente fue activado exitosamente" 
            : "La web quedo en estado pendiente",
        })
        router.push("/admin/clients")
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
      <DashboardLayout requiredRole="admin">
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      </DashboardLayout>
    )
  }

  if (!client) {
    return (
      <DashboardLayout requiredRole="admin">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-lg font-medium">Demo no encontrada</p>
          <Link href="/admin/demos">
            <Button className="mt-4">Volver a demos</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="admin">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/demos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Convertir Demo a Venta</h1>
            <p className="text-muted-foreground">
              Completa los datos para registrar la venta de {client.businessName}
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
                <p className="text-sm text-muted-foreground">Negocio</p>
                <p className="font-medium">{client.businessName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contacto</p>
                <p className="font-medium">{client.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefono</p>
                <p className="font-medium">{client.phone || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{client.businessType || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Datos del Cliente */}
            <Card>
              <CardHeader>
                <CardTitle>Datos del Cliente</CardTitle>
                <CardDescription>
                  Informacion de contacto para la facturacion
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel>Nombre Completo</FieldLabel>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Juan Perez"
                    />
                  </Field>
                  <Field>
                    <FieldLabel required>Correo Electronico</FieldLabel>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="cliente@email.com"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel required>Numero de WhatsApp</FieldLabel>
                    <Input
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleChange}
                      placeholder="+54 9 11 1234-5678"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel required>Dominio Seleccionado</FieldLabel>
                    <Input
                      name="domain"
                      value={formData.domain}
                      onChange={handleChange}
                      placeholder="www.minegocio.com.ar"
                      required
                    />
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
                    <FieldLabel required>Monto de Activacion (Setup)</FieldLabel>
                    <Input
                      name="setupPrice"
                      type="number"
                      value={formData.setupPrice}
                      onChange={handleChange}
                      placeholder="15000"
                      min="0"
                      required
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

            {/* Comprobante de Pago */}
            <Card>
              <CardHeader>
                <CardTitle>Comprobante de Pago</CardTitle>
                <CardDescription>
                  Adjunta el comprobante del pago de activacion
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paymentProofPreview ? (
                  <div className="relative inline-block">
                    <Image
                      src={paymentProofPreview}
                      alt="Comprobante de pago"
                      width={300}
                      height={300}
                      className="rounded-lg object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -right-2 -top-2 h-6 w-6"
                      onClick={removeFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 transition-colors hover:border-primary">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <span className="mt-2 text-sm font-medium">
                      Click para subir comprobante
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      PNG, JPG o PDF
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </CardContent>
            </Card>

            {/* Activacion */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Activacion
                </CardTitle>
                <CardDescription>
                  Configura si la web se activa inmediatamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Activar web ahora</p>
                    <p className="text-sm text-muted-foreground">
                      Si se activa, el cliente comenzara a ser cobrado desde hoy
                    </p>
                  </div>
                  <Switch
                    checked={formData.activateNow}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, activateNow: checked }))
                    }
                  />
                </div>
                {!formData.activateNow && (
                  <p className="mt-4 text-sm text-yellow-600">
                    La web quedara en estado &quot;Web Pendiente&quot; hasta que se active manualmente
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-4">
            <Link href="/admin/demos">
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
