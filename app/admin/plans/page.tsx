"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { plansAPI, Plan } from "@/lib/api"
import { useCompany } from "@/lib/company-context"
import { Plus, Edit2, Trash2, Package, Check, X, Building2 } from "lucide-react"

export default function AdminPlansPage() {
  const { currentCompany } = useCompany()
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newFeature, setNewFeature] = useState("")
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    features: [] as string[],
  })

  useEffect(() => {
    fetchPlans()
  }, [currentCompany.id])

  const fetchPlans = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const response = await plansAPI.getAll(token)
      setPlans(response.plans)
    } catch (error) {
      console.error("Error fetching plans:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFormData((prev) => ({
        ...prev,
        features: [...prev.features, newFeature.trim()],
      }))
      setNewFeature("")
    }
  }

  const handleRemoveFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }))
  }

  const handleOpenDialog = (plan?: Plan) => {
    if (plan) {
      setSelectedPlan(plan)
      setFormData({
        name: plan.name,
        description: plan.description,
        price: plan.price.toString(),
        features: plan.features || [],
      })
    } else {
      setSelectedPlan(null)
      setFormData({
        name: "",
        description: "",
        price: "",
        features: [],
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const data = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        features: formData.features,
      }

      if (selectedPlan) {
        await plansAPI.update(token, selectedPlan._id, data)
        toast({
          title: "Plan actualizado",
          description: "El plan se ha actualizado correctamente",
        })
      } else {
        await plansAPI.create(token, data)
        toast({
          title: "Plan creado",
          description: "El plan se ha creado correctamente",
        })
      }
      setIsDialogOpen(false)
      fetchPlans()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar el plan",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedPlan) return

    const token = localStorage.getItem("token")
    if (!token) return

    try {
      await plansAPI.delete(token, selectedPlan._id)
      toast({
        title: "Plan eliminado",
        description: "El plan se ha eliminado correctamente",
      })
      setIsDeleteDialogOpen(false)
      fetchPlans()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar el plan",
        variant: "destructive",
      })
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(value)
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Planes</h1>
            <p className="text-muted-foreground">
              Gestiona los planes de venta disponibles
            </p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Plan
          </Button>
        </div>

        {/* Plans Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan._id}
              className="border-border/50 bg-card/50"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(plan)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setSelectedPlan(plan)
                        setIsDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="mt-4">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-primary">
                    {formatCurrency(plan.price)}
                  </span>
                </div>
                {plan.features && plan.features.length > 0 && (
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-green-400 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="pt-4 border-t border-border">
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-500/20 text-green-400"
                  >
                    Activo
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
          {plans.length === 0 && (
            <Card className="col-span-full border-border/50 bg-card/50">
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No hay planes registrados</p>
                <Button
                  onClick={() => handleOpenDialog()}
                  className="mt-4 bg-primary text-primary-foreground"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primer Plan
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedPlan ? "Editar Plan" : "Nuevo Plan"}
              </DialogTitle>
              <DialogDescription>
                {selectedPlan
                  ? "Modifica los datos del plan"
                  : "Completa los datos del nuevo plan"}
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Nombre del Plan</FieldLabel>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Plan Basico"
                  className="bg-secondary/50"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="description">Descripcion</FieldLabel>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Descripcion del plan..."
                  className="bg-secondary/50"
                  rows={3}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="price">Precio (ARS)</FieldLabel>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="50000"
                  className="bg-secondary/50"
                />
              </Field>
              <Field>
                <FieldLabel>Caracteristicas</FieldLabel>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Agregar caracteristica..."
                      className="bg-secondary/50"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddFeature()
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddFeature}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.features.length > 0 && (
                    <ul className="space-y-1">
                      {formData.features.map((feature, index) => (
                        <li
                          key={index}
                          className="flex items-center justify-between p-2 rounded bg-secondary/30 text-sm"
                        >
                          <span className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-400" />
                            {feature}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleRemoveFeature(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground"
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Guardando...
                  </>
                ) : (
                  "Guardar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar Plan</AlertDialogTitle>
              <AlertDialogDescription>
                Estas seguro de que deseas eliminar el plan {selectedPlan?.name}? Esta accion no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
