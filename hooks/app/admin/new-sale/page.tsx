"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { plansAPI, salesAPI, usersAPI, Plan, User } from "@/lib/api"
import { useCompany } from "@/lib/company-context"
import { TuPaginaYaSaleForm } from "@/components/tupaginaya-sale-form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Check, CreditCard, Building2, UserPlus, AlertCircle, Paperclip, X, FileText, Image, File } from "lucide-react"
import Link from "next/link"

export default function NewSalePage() {
  const { currentCompany } = useCompany()
  const [plans, setPlans] = useState<Plan[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [selectedSellerId, setSelectedSellerId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [installationFiles, setInstallationFiles] = useState<File[]>([])
  const router = useRouter()
  const { toast } = useToast()

  // Si es TuPaginaYa, mostrar formulario simplificado
  if (currentCompany.id === "tupaginaya") {
    return (
      <DashboardLayout requiredRole="admin">
        <TuPaginaYaSaleForm 
          redirectPath="/admin/clients" 
          backPath="/admin" 
          requiredRole="admin"
        />
      </DashboardLayout>
    )
  }

  const [formData, setFormData] = useState({
    // Datos del cliente
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerDni: "",
    customerBirthDate: "",
    // Direccion
    street: "",
    number: "",
    floor: "",
    apartment: "",
    city: "",
    province: "",
    postalCode: "",
    googleMapsLink: "",
    entreCalles: "",
    // Contacto de emergencia
    emergencyContactName: "",
    emergencyContactPhone: "",
    // Plan y pago
    planDetail: "",
    customPrice: "",
    // Medio de pago abono
    paymentMethodAbono: "credit_card", // credit_card | cbu
    cardBrand: "visa", // visa | mastercard
    cbuNumber: "",
    // Medio de pago instalacion
    paymentMethodInstallation: "transfer", // transfer | mercadopago
    // Observaciones
    description: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token")
      if (!token) return

      try {
        const [plansRes, usersRes] = await Promise.all([
          plansAPI.getAll(token),
          usersAPI.getAll(token),
        ])
        setPlans(plansRes.plans)
        // Filtrar solo vendedores y supervisores activos
        setUsers(usersRes.users.filter(u => (u.role === "seller" || u.role === "supervisor") && u.isActive))
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setInstallationFiles(prev => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setInstallationFiles(prev => prev.filter((_, i) => i !== index))
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <Image className="h-4 w-4 text-green-400" />
    if (file.type.includes("pdf")) return <FileText className="h-4 w-4 text-red-400" />
    return <File className="h-4 w-4 text-blue-400" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPlan) {
      toast({
        title: "Error",
        description: "Debes seleccionar un plan",
        variant: "destructive",
      })
      return
    }

    // Validar campos requeridos del cliente
    const requiredFields = [
      { field: "customerName", label: "Nombre del cliente" },
      { field: "customerEmail", label: "Email del cliente" },
      { field: "customerPhone", label: "Telefono del cliente" },
      { field: "customerDni", label: "DNI del cliente" },
      { field: "street", label: "Calle" },
      { field: "number", label: "Numero" },
      { field: "city", label: "Ciudad" },
      { field: "province", label: "Provincia" },
      { field: "postalCode", label: "Codigo postal" },
    ]

    for (const { field, label } of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        toast({
          title: "Error",
          description: `El campo "${label}" es obligatorio`,
          variant: "destructive",
        })
        return
      }
    }

    if (!formData.emergencyContactName || !formData.emergencyContactPhone) {
      toast({
        title: "Error",
        description: "Debes completar el contacto de emergencia",
        variant: "destructive",
      })
      return
    }

    // Validar CBU si es el metodo de pago seleccionado
    if (formData.paymentMethodAbono === "cbu" && formData.cbuNumber.length !== 22) {
      toast({
        title: "Error",
        description: "El CBU debe tener 22 digitos",
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

    // Descripcion corta (max 200 chars segun backend)
    const shortDescription = formData.description 
      ? formData.description.substring(0, 200) 
      : `${selectedPlan.name} - ${formData.customerName}`

    const saleData = {
      planId: selectedPlan._id,
      description: shortDescription,
      sellerId: selectedSellerId || undefined, // Asignar a vendedor seleccionado
      customerInfo: {
        name: formData.customerName,
        email: formData.customerEmail,
        phone: formData.customerPhone,
        dni: formData.customerDni,
        address: {
          street: formData.street,
          number: formData.number,
          city: formData.city,
          province: formData.province,
          postalCode: formData.postalCode,
          entreCalles: formData.entreCalles || undefined,
          googleMapsLink: formData.googleMapsLink || undefined,
        },
      },
    }

    // Enviar al backend
    try {
      const response = await fetch(`http://192.168.100.6:3000/api/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(saleData),
      })
      
      const result = await response.json()
      
      // Subir archivos adjuntos si existen
      if (installationFiles.length > 0 && result.sale?._id) {
        for (const file of installationFiles) {
          try {
            await salesAPI.uploadAttachment(token, result.sale._id, file)
          } catch (fileError) {
            console.error("Error uploading file:", fileError)
          }
        }
      }
      
      toast({
        title: "Venta registrada",
        description: installationFiles.length > 0 
          ? `Venta registrada con ${installationFiles.length} archivo(s) adjunto(s)`
          : "Felicitaciones! La venta se ha registrado correctamente",
      })
      router.push("/admin/sales")
    } catch {
      toast({
        title: "Venta registrada",
        description: "La venta se ha registrado correctamente",
      })
      router.push("/admin/sales")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(value)
  }

  const steps = [
    { number: 1, title: "Plan" },
    { number: 2, title: "Cliente" },
    { number: 3, title: "Direccion" },
    { number: 4, title: "Emergencia" },
    { number: 5, title: "Pago" },
  ]

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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Nueva Venta</h1>
            <p className="text-muted-foreground">Registra una nueva venta completa</p>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-between bg-card/50 rounded-lg p-4 border border-border/50">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <button
                type="button"
                onClick={() => setCurrentStep(step.number)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  currentStep === step.number
                    ? "bg-primary text-primary-foreground"
                    : currentStep > step.number
                    ? "bg-green-500/20 text-green-400"
                    : "bg-secondary/50 text-muted-foreground"
                }`}
              >
                {currentStep > step.number ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
                    {step.number}
                  </span>
                )}
                <span className="hidden sm:inline text-sm font-medium">{step.title}</span>
              </button>
              {index < steps.length - 1 && (
                <div className="w-8 h-px bg-border mx-2 hidden sm:block" />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Plan Selection */}
          {currentStep === 1 && (
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>Seleccionar Plan</CardTitle>
                <CardDescription>Elige el plan contratado por el cliente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {plans.map((plan) => (
                    <div
                      key={plan._id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`relative cursor-pointer rounded-lg border p-4 transition-all hover:border-primary ${
                        selectedPlan?._id === plan._id
                          ? "border-primary bg-primary/10"
                          : "border-border/50 bg-secondary/30"
                      }`}
                    >
                      {selectedPlan?._id === plan._id && (
                        <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                      <h3 className="font-semibold text-foreground">{plan.name}</h3>
                      <p className="text-2xl font-bold text-primary mt-2">
                        {formatCurrency(plan.price)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {plan.description}
                      </p>
                      {plan.features && plan.features.length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {plan.features.slice(0, 3).map((feature, idx) => (
                            <li key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                              <Check className="h-3 w-3 text-green-400" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>

                {/* Selector de vendedor */}
                <FieldGroup>
                  <Field>
                    <FieldLabel>Asignar a Vendedor/Supervisor *</FieldLabel>
                    <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue placeholder="Selecciona un vendedor o supervisor" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user._id} value={user._id}>
                            {user.name} ({user.role === "supervisor" ? "Supervisor" : "Vendedor"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Selecciona a quien se le asignara esta venta
                    </p>
                  </Field>
                </FieldGroup>

                {selectedPlan && (
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="planDetail">Detalle escrito del plan vendido</FieldLabel>
                      <Textarea
                        id="planDetail"
                        name="planDetail"
                        value={formData.planDetail}
                        onChange={handleInputChange}
                        placeholder="Describe los detalles especificos del plan vendido al cliente..."
                        rows={3}
                        className="bg-secondary/50"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="customPrice">Abono vendido (precio final)</FieldLabel>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="customPrice"
                          name="customPrice"
                          type="number"
                          value={formData.customPrice}
                          onChange={handleInputChange}
                          placeholder={selectedPlan.price.toString()}
                          className="bg-secondary/50 pl-8"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Deja vacio para usar el precio del plan: {formatCurrency(selectedPlan.price)}
                      </p>
                    </Field>
                  </FieldGroup>
                )}

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    disabled={!selectedPlan || !selectedSellerId}
                    className="bg-primary text-primary-foreground"
                  >
                    Siguiente
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Customer Info */}
          {currentStep === 2 && (
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>Datos del Cliente</CardTitle>
                <CardDescription>Informacion personal del cliente</CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="customerName">Nombre Completo *</FieldLabel>
                      <Input
                        id="customerName"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        placeholder="Juan Perez"
                        required
                        className="bg-secondary/50"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="customerDni">DNI *</FieldLabel>
                      <Input
                        id="customerDni"
                        name="customerDni"
                        value={formData.customerDni}
                        onChange={handleInputChange}
                        placeholder="12345678"
                        required
                        className="bg-secondary/50"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="customerBirthDate">Fecha de Nacimiento *</FieldLabel>
                      <Input
                        id="customerBirthDate"
                        name="customerBirthDate"
                        type="date"
                        value={formData.customerBirthDate}
                        onChange={handleInputChange}
                        required
                        className="bg-secondary/50"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="customerEmail">Email *</FieldLabel>
                      <Input
                        id="customerEmail"
                        name="customerEmail"
                        type="email"
                        value={formData.customerEmail}
                        onChange={handleInputChange}
                        placeholder="cliente@email.com"
                        required
                        className="bg-secondary/50"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="customerPhone">Telefono / Celular *</FieldLabel>
                      <Input
                        id="customerPhone"
                        name="customerPhone"
                        value={formData.customerPhone}
                        onChange={handleInputChange}
                        placeholder="+54 11 1234-5678"
                        required
                        className="bg-secondary/50"
                      />
                    </Field>
                  </div>
                </FieldGroup>

                <div className="flex justify-between mt-6">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="bg-primary text-primary-foreground"
                  >
                    Siguiente
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Address */}
          {currentStep === 3 && (
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>Direccion</CardTitle>
                <CardDescription>Domicilio del cliente donde se realizara la instalacion</CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field className="md:col-span-2">
                      <FieldLabel htmlFor="street">Calle *</FieldLabel>
                      <Input
                        id="street"
                        name="street"
                        value={formData.street}
                        onChange={handleInputChange}
                        placeholder="Av. Corrientes"
                        required
                        className="bg-secondary/50"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="number">Numero *</FieldLabel>
                      <Input
                        id="number"
                        name="number"
                        value={formData.number}
                        onChange={handleInputChange}
                        placeholder="1234"
                        required
                        className="bg-secondary/50"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="floor">Piso</FieldLabel>
                      <Input
                        id="floor"
                        name="floor"
                        value={formData.floor}
                        onChange={handleInputChange}
                        placeholder="3"
                        className="bg-secondary/50"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="apartment">Departamento</FieldLabel>
                      <Input
                        id="apartment"
                        name="apartment"
                        value={formData.apartment}
                        onChange={handleInputChange}
                        placeholder="A"
                        className="bg-secondary/50"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="city">Ciudad *</FieldLabel>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Buenos Aires"
                        required
                        className="bg-secondary/50"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="province">Provincia *</FieldLabel>
                      <Input
                        id="province"
                        name="province"
                        value={formData.province}
                        onChange={handleInputChange}
                        placeholder="Buenos Aires"
                        required
                        className="bg-secondary/50"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="postalCode">Codigo Postal *</FieldLabel>
                      <Input
                        id="postalCode"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        placeholder="1000"
                        required
                        className="bg-secondary/50"
                      />
                    </Field>
                    <Field className="md:col-span-2">
                      <FieldLabel htmlFor="entreCalles">Entre Calles</FieldLabel>
                      <Input
                        id="entreCalles"
                        name="entreCalles"
                        value={formData.entreCalles}
                        onChange={handleInputChange}
                        placeholder="Entre Av. Corrientes y Av. Cordoba"
                        className="bg-secondary/50"
                      />
                    </Field>
                    <Field className="md:col-span-2">
                      <FieldLabel htmlFor="googleMapsLink">Link de Google Maps</FieldLabel>
                      <Input
                        id="googleMapsLink"
                        name="googleMapsLink"
                        value={formData.googleMapsLink}
                        onChange={handleInputChange}
                        placeholder="https://maps.google.com/..."
                        className="bg-secondary/50"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Pega el link de ubicacion de Google Maps para facilitar la instalacion
                      </p>
                    </Field>
                  </div>
                </FieldGroup>

                <div className="flex justify-between mt-6">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="bg-primary text-primary-foreground"
                  >
                    Siguiente
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Emergency Contact */}
          {currentStep === 4 && (
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <CardTitle>Contacto de Emergencia</CardTitle>
                    <CardDescription>
                      Debe ser el contacto de un familiar, vecino o amigo. Lo utilizaremos en caso de que se dispare el sistema de seguridad y debamos activar el protocolo de emergencias.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-orange-200">
                      Este contacto es obligatorio para poder proceder con la instalacion del sistema de seguridad.
                    </p>
                  </div>
                </div>

                <FieldGroup>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="emergencyContactName">Nombre del Contacto *</FieldLabel>
                      <Input
                        id="emergencyContactName"
                        name="emergencyContactName"
                        value={formData.emergencyContactName}
                        onChange={handleInputChange}
                        placeholder="Maria Garcia"
                        required
                        className="bg-secondary/50"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="emergencyContactPhone">Celular del Contacto *</FieldLabel>
                      <Input
                        id="emergencyContactPhone"
                        name="emergencyContactPhone"
                        value={formData.emergencyContactPhone}
                        onChange={handleInputChange}
                        placeholder="+54 11 9876-5432"
                        required
                        className="bg-secondary/50"
                      />
                    </Field>
                  </div>
                </FieldGroup>

                <div className="flex justify-between mt-6">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(3)}>
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(5)}
                    disabled={!formData.emergencyContactName || !formData.emergencyContactPhone}
                    className="bg-primary text-primary-foreground"
                  >
                    Siguiente
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Payment */}
          {currentStep === 5 && (
            <>
              {/* Medio de pago ABONO */}
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle>Medio de Pago - Abono Mensual</CardTitle>
                  <CardDescription>Selecciona como pagara el cliente el abono mensual</CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div
                        onClick={() => setFormData(prev => ({ ...prev, paymentMethodAbono: "credit_card" }))}
                        className={`cursor-pointer rounded-lg border p-4 transition-all ${
                          formData.paymentMethodAbono === "credit_card"
                            ? "border-primary bg-primary/10"
                            : "border-border/50 bg-secondary/30 hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-6 w-6 text-primary" />
                          <div>
                            <p className="font-semibold">Tarjeta de Credito</p>
                            <p className="text-sm text-muted-foreground">VISA / MASTERCARD</p>
                          </div>
                        </div>
                      </div>
                      <div
                        onClick={() => setFormData(prev => ({ ...prev, paymentMethodAbono: "cbu" }))}
                        className={`cursor-pointer rounded-lg border p-4 transition-all ${
                          formData.paymentMethodAbono === "cbu"
                            ? "border-primary bg-primary/10"
                            : "border-border/50 bg-secondary/30 hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="h-6 w-6 text-primary" />
                          <div>
                            <p className="font-semibold">CBU</p>
                            <p className="text-sm text-muted-foreground">Con autorizacion</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {formData.paymentMethodAbono === "credit_card" && (
                      <Field className="mt-4">
                        <FieldLabel>Marca de la tarjeta</FieldLabel>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="cardBrand"
                              value="visa"
                              checked={formData.cardBrand === "visa"}
                              onChange={handleInputChange}
                              className="w-4 h-4 text-primary"
                            />
                            <span className="font-medium">VISA</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="cardBrand"
                              value="mastercard"
                              checked={formData.cardBrand === "mastercard"}
                              onChange={handleInputChange}
                              className="w-4 h-4 text-primary"
                            />
                            <span className="font-medium">MASTERCARD</span>
                          </label>
                        </div>
                      </Field>
                    )}

                    {formData.paymentMethodAbono === "cbu" && (
                      <Field className="mt-4">
                        <FieldLabel htmlFor="cbuNumber">Numero de CBU (22 digitos) *</FieldLabel>
                        <Input
                          id="cbuNumber"
                          name="cbuNumber"
                          value={formData.cbuNumber}
                          onChange={handleInputChange}
                          placeholder="0000000000000000000000"
                          maxLength={22}
                          className="bg-secondary/50 font-mono"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {formData.cbuNumber.length}/22 digitos
                        </p>
                      </Field>
                    )}
                  </FieldGroup>
                </CardContent>
              </Card>

              {/* Medio de pago INSTALACION */}
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle>Medio de Pago - Instalacion</CardTitle>
                  <CardDescription>Selecciona como abonara el cliente la instalacion</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div
                      onClick={() => setFormData(prev => ({ ...prev, paymentMethodInstallation: "transfer" }))}
                      className={`cursor-pointer rounded-lg border p-4 transition-all ${
                        formData.paymentMethodInstallation === "transfer"
                          ? "border-primary bg-primary/10"
                          : "border-border/50 bg-secondary/30 hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-6 w-6 text-primary" />
                        <div>
                          <p className="font-semibold">Transferencia Bancaria</p>
                          <p className="text-sm text-muted-foreground">Abona por transferencia</p>
                        </div>
                      </div>
                    </div>
                    <div
                      onClick={() => setFormData(prev => ({ ...prev, paymentMethodInstallation: "mercadopago" }))}
                      className={`cursor-pointer rounded-lg border p-4 transition-all ${
                        formData.paymentMethodInstallation === "mercadopago"
                          ? "border-primary bg-primary/10"
                          : "border-border/50 bg-secondary/30 hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-6 w-6 text-sky-400" />
                        <div>
                          <p className="font-semibold">Mercado Pago</p>
                          <p className="text-sm text-muted-foreground">Link de pago</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Archivos adjuntos */}
                  <div className="mt-6 pt-6 border-t border-border/50">
                    <Field>
                      <FieldLabel className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        Archivos Adjuntos (Comprobantes de pago, etc.)
                      </FieldLabel>
                      <div className="mt-2">
                        <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border/50 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-secondary/20 transition-colors">
                          <Paperclip className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Click para adjuntar archivos (imagenes, PDFs, etc.)
                          </span>
                          <input
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                          />
                        </label>
                      </div>
                      
                      {installationFiles.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-muted-foreground">{installationFiles.length} archivo(s) seleccionado(s)</p>
                          {installationFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg border border-border/30">
                              <div className="flex items-center gap-2 min-w-0">
                                {getFileIcon(file)}
                                <span className="text-sm truncate">{file.name}</span>
                                <span className="text-xs text-muted-foreground shrink-0">({formatFileSize(file.size)})</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFile(index)}
                                className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Los archivos seran visibles para supervisores, administradores y soporte
                      </p>
                    </Field>
                  </div>
                </CardContent>
              </Card>

              {/* Observaciones */}
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle>Observaciones</CardTitle>
                  <CardDescription>Notas adicionales sobre la venta</CardDescription>
                </CardHeader>
                <CardContent>
                  <Field>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Escribe observaciones adicionales..."
                      rows={4}
                      className="bg-secondary/50"
                    />
                  </Field>
                </CardContent>
              </Card>

              {/* Resumen y Submit */}
              {selectedPlan && (
                <Card className="border-primary/50 bg-primary/5">
                  <CardHeader>
                    <CardTitle>Resumen de la Venta</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Plan:</p>
                        <p className="font-semibold">{selectedPlan.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Abono:</p>
                        <p className="font-semibold text-primary">
                          {formatCurrency(formData.customPrice ? parseFloat(formData.customPrice) : selectedPlan.price)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cliente:</p>
                        <p className="font-semibold">{formData.customerName || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pago Abono:</p>
                        <p className="font-semibold">
                          {formData.paymentMethodAbono === "credit_card" 
                            ? `Tarjeta ${formData.cardBrand.toUpperCase()}` 
                            : "CBU"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pago Instalacion:</p>
                        <p className="font-semibold">
                          {formData.paymentMethodInstallation === "transfer" 
                            ? "Transferencia" 
                            : "Mercado Pago"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Contacto Emergencia:</p>
                        <p className="font-semibold">{formData.emergencyContactName || "-"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(4)}>
                  Anterior
                </Button>
                <div className="flex gap-4">
                  <Link href="/seller">
                    <Button type="button" variant="outline">
                      Cancelar
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isSubmitting || !selectedPlan}
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
              </div>
            </>
          )}
        </form>
      </div>
    </DashboardLayout>
  )
}
