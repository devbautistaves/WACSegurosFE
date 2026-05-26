"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { leadsAPI, usersAPI, plansAPI, Lead, User, Plan, LeadStatus, LeadSource, LeadPriority, CreateLeadData } from "@/lib/api"
import { 
  Search, Plus, Edit2, Phone, Mail, 
  UserPlus, Target, TrendingUp, Users, Calendar,
  MessageSquare, Eye, X
} from "lucide-react"

const statusLabels: Record<LeadStatus, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  interesado: "Interesado",
  no_contesta: "No Contesta",
  no_interesado: "No Interesado",
  seguimiento: "Seguimiento",
  cerrado_ganado: "Cerrado Ganado",
  cerrado_perdido: "Cerrado Perdido",
}

const statusColors: Record<LeadStatus, string> = {
  nuevo: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  contactado: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  interesado: "bg-green-500/20 text-green-400 border-green-500/30",
  no_contesta: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  no_interesado: "bg-red-500/20 text-red-400 border-red-500/30",
  seguimiento: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  cerrado_ganado: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  cerrado_perdido: "bg-rose-500/20 text-rose-400 border-rose-500/30",
}

const sourceLabels: Record<LeadSource, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  google: "Google",
  referido: "Referido",
  llamada_entrante: "Llamada Entrante",
  puerta_a_puerta: "Puerta a Puerta",
  otro: "Otro",
}

const priorityLabels: Record<LeadPriority, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
}

const priorityColors: Record<LeadPriority, string> = {
  baja: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  media: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  alta: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  urgente: "bg-red-500/20 text-red-400 border-red-500/30",
}

export default function SupervisorLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [sellers, setSellers] = useState<User[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [stats, setStats] = useState<{ total: number; byStatus: Record<string, number>; conversionRate: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [sellerFilter, setSellerFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState<CreateLeadData & { notes?: string }>({
    name: "",
    phone: "",
    email: "",
    dni: "",
    address: {
      street: "",
      number: "",
      city: "",
      province: "",
      postalCode: "",
    },
    source: "otro",
    sourceDetail: "",
    assignedTo: "",
    priority: "media",
    interestedPlanId: "",
    notes: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    filterLeads()
  }, [leads, searchQuery, statusFilter, sourceFilter, sellerFilter])

  const fetchData = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const [leadsRes, usersRes, plansRes, statsRes] = await Promise.all([
        leadsAPI.getAll(token),
        usersAPI.getAll(token),
        plansAPI.getAll(token),
        leadsAPI.getStats(token),
      ])
      setLeads(leadsRes.leads)
      setSellers(usersRes.users.filter(u => u.role === "seller" && u.isActive))
      setPlans(plansRes.plans.filter(p => p.isActive))
      setStats(statsRes.stats)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filterLeads = () => {
    let filtered = [...leads]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (lead) =>
          lead.name.toLowerCase().includes(query) ||
          lead.phone.includes(query) ||
          (lead.email && lead.email.toLowerCase().includes(query))
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((lead) => lead.status === statusFilter)
    }

    if (sourceFilter !== "all") {
      filtered = filtered.filter((lead) => lead.source === sourceFilter)
    }

    if (sellerFilter !== "all") {
      filtered = filtered.filter((lead) => {
        const sellerId = typeof lead.assignedTo === "string" ? lead.assignedTo : lead.assignedTo._id
        return sellerId === sellerFilter
      })
    }

    setFilteredLeads(filtered)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name.startsWith("address.")) {
      const field = name.split(".")[1]
      setFormData((prev) => ({
        ...prev,
        address: { ...prev.address, [field]: value },
      }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleOpenDialog = (lead?: Lead) => {
    if (lead) {
      setSelectedLead(lead)
      const sellerId = typeof lead.assignedTo === "string" ? lead.assignedTo : lead.assignedTo._id
      const planId = typeof lead.interestedPlanId === "string" ? lead.interestedPlanId : lead.interestedPlanId?._id || ""
      setFormData({
        name: lead.name,
        phone: lead.phone,
        email: lead.email || "",
        dni: lead.dni || "",
        address: lead.address || { street: "", number: "", city: "", province: "", postalCode: "" },
        source: lead.source,
        sourceDetail: lead.sourceDetail || "",
        assignedTo: sellerId,
        priority: lead.priority,
        interestedPlanId: planId,
        notes: lead.notes || "",
      })
    } else {
      setSelectedLead(null)
      setFormData({
        name: "",
        phone: "",
        email: "",
        dni: "",
        address: { street: "", number: "", city: "", province: "", postalCode: "" },
        source: "otro",
        sourceDetail: "",
        assignedTo: sellers[0]?._id || "",
        priority: "media",
        interestedPlanId: "",
        notes: "",
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.assignedTo) {
      toast({
        title: "Error",
        description: "Nombre, telefono y vendedor asignado son obligatorios",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      // Limpiar datos antes de enviar - no enviar strings vacios como ObjectIds
      const cleanedData: CreateLeadData & { notes?: string } = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        assignedTo: formData.assignedTo,
      }
      
      // Solo agregar campos opcionales si tienen valor
      if (formData.email?.trim()) cleanedData.email = formData.email.trim()
      if (formData.dni?.trim()) cleanedData.dni = formData.dni.trim()
      if (formData.source) cleanedData.source = formData.source
      if (formData.sourceDetail?.trim()) cleanedData.sourceDetail = formData.sourceDetail.trim()
      if (formData.priority) cleanedData.priority = formData.priority
      if (formData.notes?.trim()) cleanedData.notes = formData.notes.trim()
      
      // Solo agregar interestedPlanId si tiene un valor valido (no vacio)
      if (formData.interestedPlanId && formData.interestedPlanId.trim() !== "") {
        cleanedData.interestedPlanId = formData.interestedPlanId
      }
      
      // Solo agregar address si tiene al menos un campo con valor
      if (formData.address && Object.values(formData.address).some(v => v && v.trim())) {
        cleanedData.address = formData.address
      }

      if (selectedLead) {
        await leadsAPI.update(token, selectedLead._id, cleanedData)
        toast({
          title: "Lead actualizado",
          description: "El lead se ha actualizado correctamente",
        })
      } else {
        await leadsAPI.create(token, cleanedData)
        toast({
          title: "Lead creado",
          description: "El lead se ha creado correctamente",
        })
      }
      setIsDialogOpen(false)
      fetchData()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar el lead",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleViewDetail = async (lead: Lead) => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const response = await leadsAPI.getById(token, lead._id)
      setSelectedLead(response.lead)
      setIsDetailDialogOpen(true)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar el detalle del lead",
        variant: "destructive",
      })
    }
  }

  const getSellerName = (lead: Lead) => {
    if (typeof lead.assignedTo === "string") {
      const seller = sellers.find(s => s._id === lead.assignedTo)
      return seller?.name || "Desconocido"
    }
    return lead.assignedTo.name || "Desconocido"
  }

  if (isLoading) {
    return (
      <DashboardLayout requiredRole="supervisor">
        <div className="flex items-center justify-center h-96">
          <Spinner className="h-8 w-8" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="supervisor">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestion de Leads</h1>
            <p className="text-muted-foreground">Asigna y gestiona leads para tu equipo de ventas</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Lead
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Leads</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tasa Conversion</p>
                    <p className="text-2xl font-bold">{stats.conversionRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nuevos</p>
                    <p className="text-2xl font-bold">{stats.byStatus.nuevo || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-emerald-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Convertidos</p>
                    <p className="text-2xl font-bold">{stats.byStatus.cerrado_ganado || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, telefono o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Origen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los origenes</SelectItem>
                    {Object.entries(sourceLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sellerFilter} onValueChange={setSellerFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los vendedores</SelectItem>
                    {sellers.map((seller) => (
                      <SelectItem key={seller._id} value={seller._id}>{seller.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(statusFilter !== "all" || sourceFilter !== "all" || sellerFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setStatusFilter("all")
                      setSourceFilter("all")
                      setSellerFilter("all")
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>Leads ({filteredLeads.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No se encontraron leads
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeads.map((lead) => (
                      <TableRow key={lead._id}>
                        <TableCell>
                          <div className="font-medium">{lead.name}</div>
                          {lead.interestedPlanName && (
                            <div className="text-xs text-muted-foreground">
                              Interesado en: {lead.interestedPlanName}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </div>
                            {lead.email && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {lead.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{sourceLabels[lead.source]}</Badge>
                        </TableCell>
                        <TableCell>{getSellerName(lead)}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[lead.status]}>
                            {statusLabels[lead.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={priorityColors[lead.priority]}>
                            {priorityLabels[lead.priority]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(lead.createdAt).toLocaleDateString("es-AR")}
                          </div>
                          {lead.nextFollowUp && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Seguimiento: {new Date(lead.nextFollowUp).toLocaleDateString("es-AR")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDetail(lead)}
                              title="Ver detalle"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(lead)}
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Lead Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedLead ? "Editar Lead" : "Nuevo Lead"}</DialogTitle>
            <DialogDescription>
              {selectedLead ? "Modifica los datos del lead" : "Completa los datos del nuevo lead"}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="grid gap-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>Nombre *</FieldLabel>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Nombre completo"
                />
              </Field>
              <Field>
                <FieldLabel>Telefono *</FieldLabel>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Telefono de contacto"
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email (opcional)"
                />
              </Field>
              <Field>
                <FieldLabel>DNI</FieldLabel>
                <Input
                  name="dni"
                  value={formData.dni}
                  onChange={handleInputChange}
                  placeholder="DNI (opcional)"
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>Calle</FieldLabel>
                <Input
                  name="address.street"
                  value={formData.address?.street || ""}
                  onChange={handleInputChange}
                  placeholder="Calle"
                />
              </Field>
              <Field>
                <FieldLabel>Numero</FieldLabel>
                <Input
                  name="address.number"
                  value={formData.address?.number || ""}
                  onChange={handleInputChange}
                  placeholder="Numero"
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field>
                <FieldLabel>Ciudad</FieldLabel>
                <Input
                  name="address.city"
                  value={formData.address?.city || ""}
                  onChange={handleInputChange}
                  placeholder="Ciudad"
                />
              </Field>
              <Field>
                <FieldLabel>Provincia</FieldLabel>
                <Input
                  name="address.province"
                  value={formData.address?.province || ""}
                  onChange={handleInputChange}
                  placeholder="Provincia"
                />
              </Field>
              <Field>
                <FieldLabel>Codigo Postal</FieldLabel>
                <Input
                  name="address.postalCode"
                  value={formData.address?.postalCode || ""}
                  onChange={handleInputChange}
                  placeholder="CP"
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>Origen del Lead</FieldLabel>
                <Select
                  value={formData.source}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, source: value as LeadSource }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(sourceLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Detalle del Origen</FieldLabel>
                <Input
                  name="sourceDetail"
                  value={formData.sourceDetail}
                  onChange={handleInputChange}
                  placeholder="Ej: Campana verano 2024"
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>Vendedor Asignado *</FieldLabel>
                <Select
                  value={formData.assignedTo}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, assignedTo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map((seller) => (
                      <SelectItem key={seller._id} value={seller._id}>{seller.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Prioridad</FieldLabel>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as LeadPriority }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel>Plan de Interes</FieldLabel>
              <Select
                value={formData.interestedPlanId || "none"}
                onValueChange={(value) => setFormData(prev => ({ ...prev, interestedPlanId: value === "none" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plan (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin plan especifico</SelectItem>
                  {plans.map((plan) => (
                    <SelectItem key={plan._id} value={plan._id}>
                      {plan.name} - ${plan.price.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Notas</FieldLabel>
              <Textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Notas adicionales sobre el lead..."
                rows={3}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Spinner className="h-4 w-4 mr-2" /> : null}
              {selectedLead ? "Actualizar" : "Crear Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Lead</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-6">
              {/* Lead Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-medium">{selectedLead.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefono</p>
                  <p className="font-medium">{selectedLead.phone}</p>
                </div>
                {selectedLead.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedLead.email}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge className={statusColors[selectedLead.status]}>
                    {statusLabels[selectedLead.status]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendedor Asignado</p>
                  <p className="font-medium">{getSellerName(selectedLead)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Origen</p>
                  <p className="font-medium">{sourceLabels[selectedLead.source]}</p>
                </div>
              </div>

              {/* Contact History */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Historial de Contactos ({selectedLead.contactHistory?.length || 0})
                </h4>
                {selectedLead.contactHistory && selectedLead.contactHistory.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {selectedLead.contactHistory.map((contact, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-secondary/50 border">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{contact.type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(contact.date).toLocaleString("es-AR")}
                          </span>
                        </div>
                        {contact.notes && (
                          <p className="text-sm mb-2">{contact.notes}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Resultado:</span>
                          <Badge variant="outline" className="text-xs">
                            {contact.outcome}
                          </Badge>
                        </div>
                        {contact.nextAction && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Proxima accion: {contact.nextAction}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay historial de contactos</p>
                )}
              </div>

              {/* Notes */}
              {selectedLead.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notas</h4>
                  <p className="text-sm text-muted-foreground">{selectedLead.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={() => {
              setIsDetailDialogOpen(false)
              if (selectedLead) handleOpenDialog(selectedLead)
            }}>
              Editar Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
