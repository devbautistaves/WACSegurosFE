"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
import { useToast } from "@/hooks/use-toast"
import { leadsAPI, Lead, LeadStatus, LeadSource, ContactType, ContactOutcome, AddLeadContactData } from "@/lib/api"
import { 
  Search, Phone, Mail, Calendar, Clock, 
  PhoneCall, MessageSquare, Eye, Target, 
  TrendingUp, AlertCircle, CheckCircle, X,
  ArrowRight, ExternalLink
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

const contactTypeLabels: Record<ContactType, string> = {
  llamada: "Llamada",
  whatsapp: "WhatsApp",
  email: "Email",
  visita: "Visita",
  otro: "Otro",
}

const outcomeLabels: Record<ContactOutcome, string> = {
  contactado: "Contactado",
  no_contesta: "No Contesta",
  interesado: "Interesado",
  no_interesado: "No Interesado",
  agendar_seguimiento: "Agendar Seguimiento",
  cerrar: "Cerrar",
}

export default function SellerLeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const [contactData, setContactData] = useState<AddLeadContactData>({
    type: "llamada",
    notes: "",
    outcome: "contactado",
    nextAction: "",
    nextActionDate: "",
  })

  const [newStatus, setNewStatus] = useState<LeadStatus>("contactado")
  const [statusNotes, setStatusNotes] = useState("")

  useEffect(() => {
    fetchLeads()
  }, [])

  useEffect(() => {
    filterLeads()
  }, [leads, searchQuery, statusFilter])

  const fetchLeads = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const response = await leadsAPI.getMyLeads(token)
      setLeads(response.leads)
    } catch (error) {
      console.error("Error fetching leads:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los leads",
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

    setFilteredLeads(filtered)
  }

  const handleAddContact = async () => {
    if (!selectedLead || !contactData.type || !contactData.outcome) {
      toast({
        title: "Error",
        description: "Tipo de contacto y resultado son obligatorios",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      await leadsAPI.addContact(token, selectedLead._id, contactData)
      toast({
        title: "Contacto registrado",
        description: "El contacto se ha registrado correctamente",
      })
      setIsContactDialogOpen(false)
      setContactData({
        type: "llamada",
        notes: "",
        outcome: "contactado",
        nextAction: "",
        nextActionDate: "",
      })
      fetchLeads()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al registrar el contacto",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!selectedLead) return

    setIsSubmitting(true)
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      await leadsAPI.updateStatus(token, selectedLead._id, newStatus, statusNotes)
      toast({
        title: "Estado actualizado",
        description: "El estado del lead se ha actualizado correctamente",
      })
      setIsStatusDialogOpen(false)
      setStatusNotes("")
      fetchLeads()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar el estado",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConvertToSale = async (lead: Lead) => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const response = await leadsAPI.getConversionData(token, lead._id)
      // Store the lead data in sessionStorage to prefill the new sale form
      sessionStorage.setItem("leadConversionData", JSON.stringify({
        ...response.leadData,
        leadId: lead._id,
      }))
      router.push("/seller/new-sale?fromLead=true")
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo preparar la conversion",
        variant: "destructive",
      })
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

  const openContactDialog = (lead: Lead) => {
    setSelectedLead(lead)
    setIsContactDialogOpen(true)
  }

  const openStatusDialog = (lead: Lead) => {
    setSelectedLead(lead)
    setNewStatus(lead.status)
    setIsStatusDialogOpen(true)
  }

  // Stats calculations
  const totalLeads = leads.length
  const pendingLeads = leads.filter(l => ["nuevo", "contactado", "seguimiento"].includes(l.status)).length
  const interestedLeads = leads.filter(l => l.status === "interesado").length
  const convertedLeads = leads.filter(l => l.status === "cerrado_ganado").length
  const leadsWithFollowUp = leads.filter(l => l.nextFollowUp && new Date(l.nextFollowUp) <= new Date()).length

  if (isLoading) {
    return (
      <DashboardLayout requiredRole="seller">
        <div className="flex items-center justify-center h-96">
          <Spinner className="h-8 w-8" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="seller">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Leads</h1>
          <p className="text-muted-foreground">Gestiona tus leads asignados y registra tus contactos</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="border-primary/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{totalLeads}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pendientes</p>
                  <p className="text-2xl font-bold">{pendingLeads}</p>
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
                  <p className="text-sm text-muted-foreground">Interesados</p>
                  <p className="text-2xl font-bold">{interestedLeads}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Convertidos</p>
                  <p className="text-2xl font-bold">{convertedLeads}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`${leadsWithFollowUp > 0 ? "border-orange-500/30" : "border-muted/30"}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  leadsWithFollowUp > 0 ? "bg-orange-500/20" : "bg-muted/20"
                }`}>
                  <AlertCircle className={`h-5 w-5 ${leadsWithFollowUp > 0 ? "text-orange-400" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Por Llamar</p>
                  <p className="text-2xl font-bold">{leadsWithFollowUp}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {statusFilter !== "all" && (
                  <Button variant="ghost" size="icon" onClick={() => setStatusFilter("all")}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leads List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLeads.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-8 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">No tienes leads asignados</p>
                <p className="text-sm text-muted-foreground">
                  Los leads que te asignen apareceran aqui
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredLeads.map((lead) => (
              <Card key={lead._id} className={`relative ${
                lead.nextFollowUp && new Date(lead.nextFollowUp) <= new Date() 
                  ? "border-orange-500/50" 
                  : ""
              }`}>
                {lead.nextFollowUp && new Date(lead.nextFollowUp) <= new Date() && (
                  <div className="absolute -top-2 -right-2">
                    <span className="flex h-5 w-5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-orange-500 items-center justify-center">
                        <Clock className="h-3 w-3 text-white" />
                      </span>
                    </span>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{lead.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={statusColors[lead.status]}>
                          {statusLabels[lead.status]}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {sourceLabels[lead.source]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contact Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a>
                    </div>
                    {lead.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${lead.email}`} className="hover:underline text-muted-foreground">
                          {lead.email}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Interested Plan */}
                  {lead.interestedPlanName && (
                    <div className="p-2 rounded-lg bg-secondary/50">
                      <p className="text-xs text-muted-foreground">Plan de interes</p>
                      <p className="text-sm font-medium">{lead.interestedPlanName}</p>
                    </div>
                  )}

                  {/* Next Follow Up */}
                  {lead.nextFollowUp && (
                    <div className={`p-2 rounded-lg ${
                      new Date(lead.nextFollowUp) <= new Date() 
                        ? "bg-orange-500/10 border border-orange-500/30" 
                        : "bg-secondary/50"
                    }`}>
                      <p className="text-xs text-muted-foreground">Proximo seguimiento</p>
                      <p className={`text-sm font-medium ${
                        new Date(lead.nextFollowUp) <= new Date() ? "text-orange-400" : ""
                      }`}>
                        {new Date(lead.nextFollowUp).toLocaleDateString("es-AR")}
                      </p>
                    </div>
                  )}

                  {/* Contact History Count */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MessageSquare className="h-3 w-3" />
                    {lead.contactHistory?.length || 0} contactos registrados
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetail(lead)}
                      className="gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openContactDialog(lead)}
                      className="gap-1"
                    >
                      <PhoneCall className="h-3 w-3" />
                      Contacto
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openStatusDialog(lead)}
                      className="gap-1"
                    >
                      Estado
                    </Button>
                    {lead.status === "interesado" && (
                      <Button
                        size="sm"
                        onClick={() => handleConvertToSale(lead)}
                        className="gap-1"
                      >
                        <ArrowRight className="h-3 w-3" />
                        Vender
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Add Contact Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Contacto</DialogTitle>
            <DialogDescription>
              Registra tu interaccion con {selectedLead?.name}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="grid gap-4 py-4">
            <Field>
              <FieldLabel>Tipo de Contacto *</FieldLabel>
              <Select
                value={contactData.type}
                onValueChange={(value) => setContactData(prev => ({ ...prev, type: value as ContactType }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(contactTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Resultado *</FieldLabel>
              <Select
                value={contactData.outcome}
                onValueChange={(value) => setContactData(prev => ({ ...prev, outcome: value as ContactOutcome }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar resultado" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(outcomeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Notas</FieldLabel>
              <Textarea
                value={contactData.notes}
                onChange={(e) => setContactData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Describe la conversacion..."
                rows={3}
              />
            </Field>
            <Field>
              <FieldLabel>Proxima Accion</FieldLabel>
              <Input
                value={contactData.nextAction}
                onChange={(e) => setContactData(prev => ({ ...prev, nextAction: e.target.value }))}
                placeholder="Ej: Llamar para confirmar interes"
              />
            </Field>
            <Field>
              <FieldLabel>Fecha de Seguimiento</FieldLabel>
              <Input
                type="date"
                value={contactData.nextActionDate}
                onChange={(e) => setContactData(prev => ({ ...prev, nextActionDate: e.target.value }))}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContactDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddContact} disabled={isSubmitting}>
              {isSubmitting ? <Spinner className="h-4 w-4 mr-2" /> : null}
              Registrar Contacto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar Estado</DialogTitle>
            <DialogDescription>
              Actualiza el estado del lead {selectedLead?.name}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="grid gap-4 py-4">
            <Field>
              <FieldLabel>Nuevo Estado</FieldLabel>
              <Select
                value={newStatus}
                onValueChange={(value) => setNewStatus(value as LeadStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Notas (opcional)</FieldLabel>
              <Textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Razon del cambio de estado..."
                rows={3}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateStatus} disabled={isSubmitting}>
              {isSubmitting ? <Spinner className="h-4 w-4 mr-2" /> : null}
              Actualizar Estado
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
                  <a href={`tel:${selectedLead.phone}`} className="font-medium hover:underline flex items-center gap-1">
                    {selectedLead.phone}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {selectedLead.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a href={`mailto:${selectedLead.email}`} className="font-medium hover:underline">
                      {selectedLead.email}
                    </a>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge className={statusColors[selectedLead.status]}>
                    {statusLabels[selectedLead.status]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Origen</p>
                  <p className="font-medium">{sourceLabels[selectedLead.source]}</p>
                </div>
                {selectedLead.interestedPlanName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Plan de Interes</p>
                    <p className="font-medium">{selectedLead.interestedPlanName}</p>
                  </div>
                )}
              </div>

              {/* Address */}
              {selectedLead.address && (selectedLead.address.street || selectedLead.address.city) && (
                <div>
                  <h4 className="font-medium mb-2">Direccion</h4>
                  <p className="text-sm text-muted-foreground">
                    {[
                      selectedLead.address.street,
                      selectedLead.address.number,
                      selectedLead.address.city,
                      selectedLead.address.province,
                    ].filter(Boolean).join(", ")}
                  </p>
                </div>
              )}

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
                          <Badge variant="outline">{contactTypeLabels[contact.type as ContactType] || contact.type}</Badge>
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
                            {outcomeLabels[contact.outcome as ContactOutcome] || contact.outcome}
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
              if (selectedLead) openContactDialog(selectedLead)
            }}>
              Registrar Contacto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
