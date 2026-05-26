"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { clientsAPI, usersAPI, CreateDemoData, SocialNetworks, User } from "@/lib/api"
import { ArrowLeft, Upload, X, Instagram, Facebook, Globe, Smartphone } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function SupervisorNewDemoPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sellers, setSellers] = useState<User[]>([])
  const [selectedSellerId, setSelectedSellerId] = useState<string>("")
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const [formData, setFormData] = useState<CreateDemoData>({
    name: "",
    phone: "",
    businessName: "",
    businessType: "",
    whatTheySell: "",
    socialNetworks: {
      instagram: "",
      facebook: "",
      tiktok: "",
      website: "",
    },
    flyerUrl: "",
    logoUrl: "",
    notes: "",
  })

  useEffect(() => {
    loadSellers()
  }, [])

  const loadSellers = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await usersAPI.getAll(token)
      if (response.success) {
        setSellers(response.users.filter(u => u.role === "seller"))
      }
    } catch (error) {
      console.error("Error loading sellers:", error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSocialChange = (network: keyof SocialNetworks, value: string) => {
    setFormData((prev) => ({
      ...prev,
      socialNetworks: {
        ...prev.socialNetworks,
        [network]: value,
      },
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "flyer" | "logo") => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        if (type === "flyer") {
          setFlyerPreview(base64)
          setFormData((prev) => ({ ...prev, flyerUrl: base64 }))
        } else {
          setLogoPreview(base64)
          setFormData((prev) => ({ ...prev, logoUrl: base64 }))
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const removeFile = (type: "flyer" | "logo") => {
    if (type === "flyer") {
      setFlyerPreview(null)
      setFormData((prev) => ({ ...prev, flyerUrl: "" }))
    } else {
      setLogoPreview(null)
      setFormData((prev) => ({ ...prev, logoUrl: "" }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.businessName) {
      toast({
        title: "Error",
        description: "El nombre del contacto y el nombre del negocio son requeridos",
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

      const dataToSend = {
        ...formData,
        sellerId: selectedSellerId || undefined,
      }

      const response = await clientsAPI.createDemo(token, dataToSend as CreateDemoData)
      if (response.success) {
        toast({
          title: "Demo creada",
          description: "La demo fue creada exitosamente",
        })
        router.push("/supervisor/demos")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la demo",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout requiredRole="supervisor">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/supervisor/demos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Nueva Demo</h1>
            <p className="text-muted-foreground">
              Carga los datos del prospecto para crear una demo
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Datos del Contacto */}
            <Card>
              <CardHeader>
                <CardTitle>Datos del Contacto</CardTitle>
                <CardDescription>
                  Informacion basica del prospecto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel required>Nombre del Contacto</FieldLabel>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Juan Perez"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Telefono / WhatsApp</FieldLabel>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+54 9 11 1234-5678"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Asignar a Vendedor</FieldLabel>
                    <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar vendedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {sellers.map((seller) => (
                          <SelectItem key={seller._id} value={seller._id}>
                            {seller.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            {/* Datos del Negocio */}
            <Card>
              <CardHeader>
                <CardTitle>Datos del Negocio</CardTitle>
                <CardDescription>
                  Informacion sobre el negocio del prospecto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel required>Nombre del Negocio</FieldLabel>
                    <Input
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      placeholder="Panaderia Don Juan"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Tipo de Negocio / Rubro</FieldLabel>
                    <Input
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleChange}
                      placeholder="Gastronomia, Servicios, etc."
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Que vende o que servicios ofrece?</FieldLabel>
                    <Textarea
                      name="whatTheySell"
                      value={formData.whatTheySell}
                      onChange={handleChange}
                      placeholder="Describe los productos o servicios del negocio..."
                      rows={3}
                    />
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            {/* Redes Sociales */}
            <Card>
              <CardHeader>
                <CardTitle>Redes Sociales</CardTitle>
                <CardDescription>
                  Links a las redes del negocio (opcional)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel>
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4" />
                        Instagram
                      </div>
                    </FieldLabel>
                    <Input
                      value={formData.socialNetworks?.instagram || ""}
                      onChange={(e) => handleSocialChange("instagram", e.target.value)}
                      placeholder="@usuario o URL"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>
                      <div className="flex items-center gap-2">
                        <Facebook className="h-4 w-4" />
                        Facebook
                      </div>
                    </FieldLabel>
                    <Input
                      value={formData.socialNetworks?.facebook || ""}
                      onChange={(e) => handleSocialChange("facebook", e.target.value)}
                      placeholder="URL de la pagina"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        TikTok
                      </div>
                    </FieldLabel>
                    <Input
                      value={formData.socialNetworks?.tiktok || ""}
                      onChange={(e) => handleSocialChange("tiktok", e.target.value)}
                      placeholder="@usuario o URL"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Sitio Web Actual
                      </div>
                    </FieldLabel>
                    <Input
                      value={formData.socialNetworks?.website || ""}
                      onChange={(e) => handleSocialChange("website", e.target.value)}
                      placeholder="www.ejemplo.com"
                    />
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            {/* Archivos */}
            <Card>
              <CardHeader>
                <CardTitle>Archivos</CardTitle>
                <CardDescription>
                  Subi un flyer o logo del negocio (opcional)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2">
                  {/* Flyer */}
                  <div>
                    <FieldLabel>Flyer / Imagen Promocional</FieldLabel>
                    {flyerPreview ? (
                      <div className="relative mt-2">
                        <Image
                          src={flyerPreview}
                          alt="Flyer preview"
                          width={200}
                          height={200}
                          className="rounded-lg object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -right-2 -top-2 h-6 w-6"
                          onClick={() => removeFile("flyer")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-primary">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span className="mt-2 text-sm text-muted-foreground">
                          Click para subir
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, "flyer")}
                        />
                      </label>
                    )}
                  </div>

                  {/* Logo */}
                  <div>
                    <FieldLabel>Logo del Negocio</FieldLabel>
                    {logoPreview ? (
                      <div className="relative mt-2">
                        <Image
                          src={logoPreview}
                          alt="Logo preview"
                          width={200}
                          height={200}
                          className="rounded-lg object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -right-2 -top-2 h-6 w-6"
                          onClick={() => removeFile("logo")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-primary">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span className="mt-2 text-sm text-muted-foreground">
                          Click para subir
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, "logo")}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notas */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Notas Adicionales</CardTitle>
                <CardDescription>
                  Cualquier informacion adicional relevante
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Agrega notas adicionales sobre el prospecto..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-4">
            <Link href="/supervisor/demos">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
              Crear Demo
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
