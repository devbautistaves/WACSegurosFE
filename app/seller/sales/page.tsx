"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge, getStatusOptions } from "@/components/ui/status-badge"
import { Spinner } from "@/components/ui/spinner"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { salesAPI, Sale } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Search, Filter, Eye, Plus, Calendar, User, Phone, MapPin, Mail, CreditCard, UserPlus, FileText, Clock, Paperclip, Download, Image, File, Trash2 } from "lucide-react"

export default function SellerSalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [filteredSales, setFilteredSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSales()
  }, [])

  useEffect(() => {
    filterSales()
  }, [sales, searchQuery, statusFilter])

  const fetchSales = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const response = await salesAPI.getMySales(token)
      setSales(response.sales)
    } catch (error) {
      console.error("Error fetching sales:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterSales = () => {
    let filtered = [...sales]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (sale) =>
          sale.customerInfo.name.toLowerCase().includes(query) ||
          sale.customerInfo.dni.toLowerCase().includes(query) ||
          sale.planName.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((sale) => sale.status === statusFilter)
    }

    setFilteredSales(filtered)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(value)
  }

  const statusOptions = getStatusOptions()

  if (isLoading) {
    return (
      <DashboardLayout requiredRole="seller">
        <div className="flex items-center justify-center h-[60vh]">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="seller">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mis Ventas</h1>
            <p className="text-muted-foreground">
              Historial de todas tus ventas
            </p>
          </div>
          <Link href="/seller/new-sale">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Venta
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, DNI o plan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-secondary/50"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-secondary/50">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {statusOptions.map((status) => {
            const count = sales.filter((s) => s.status === status.value).length
            return (
              <Card key={status.value} className="border-border/50 bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={status.value} />
                    <span className="text-2xl font-bold text-foreground">{count}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Sales Table */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>Ventas ({filteredSales.length})</CardTitle>
            <CardDescription>Tus ventas registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">DNI</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Plan</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Estado</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Fecha Turno</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Activacion</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">CTO</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale) => (
                    <tr
                      key={sale._id}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-foreground">{sale.customerInfo.name}</p>
                          <p className="text-sm text-muted-foreground">{sale.customerInfo.phone}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-foreground">{sale.customerInfo.dni}</td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-foreground">{sale.planName}</p>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={sale.status} />
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {sale.appointedDate ? (
                          <div>
                            <span>{new Date(sale.appointedDate).toLocaleDateString("es-AR")}</span>
                            {sale.appointmentSlot && (
                              <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                                {sale.appointmentSlot}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {sale.completedDate ? (
                          new Date(sale.completedDate).toLocaleDateString("es-AR")
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-foreground font-mono text-sm">
                        {sale.ctoNumber || <span className="text-muted-foreground/50">-</span>}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedSale(sale)
                            setIsDetailOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        No se encontraron ventas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Sale Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalle de Venta</DialogTitle>
              <DialogDescription>
                Informacion completa de la venta
              </DialogDescription>
            </DialogHeader>
            {selectedSale && (
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                {/* Header con estado y fecha */}
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <StatusBadge status={selectedSale.status} />
                  <span className="text-sm text-muted-foreground">
                    {new Date(selectedSale.createdAt).toLocaleString("es-AR")}
                  </span>
                </div>

                {/* Datos del Cliente */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                    <User className="h-4 w-4 text-primary" />
                    Datos del Cliente
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="bg-secondary/20 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Nombre Completo</p>
                      <p className="font-medium text-foreground">{selectedSale.customerInfo.name}</p>
                    </div>
                    <div className="bg-secondary/20 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">DNI</p>
                      <p className="font-medium text-foreground">{selectedSale.customerInfo.dni}</p>
                    </div>
                    <div className="bg-secondary/20 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium text-foreground flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {selectedSale.customerInfo.email}
                      </p>
                    </div>
                    <div className="bg-secondary/20 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Telefono</p>
                      <p className="font-medium text-foreground flex items-center gap-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {selectedSale.customerInfo.phone}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Direccion */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Direccion de Instalacion
                  </h4>
                  <div className="bg-secondary/20 p-3 rounded-lg space-y-2">
                    <p className="font-medium text-foreground">
                      {selectedSale.customerInfo.address.street} {selectedSale.customerInfo.address.number}
                      {selectedSale.customerInfo.address.floor && `, Piso ${selectedSale.customerInfo.address.floor}`}
                      {selectedSale.customerInfo.address.apartment && ` Dpto ${selectedSale.customerInfo.address.apartment}`}
                    </p>
                    {selectedSale.customerInfo.address.entreCalles && (
                      <p className="text-sm text-muted-foreground">
                        <span className="text-foreground/70">Entre calles:</span> {selectedSale.customerInfo.address.entreCalles}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {selectedSale.customerInfo.address.city}, {selectedSale.customerInfo.address.province}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      CP: {selectedSale.customerInfo.address.postalCode}
                    </p>
                    {selectedSale.customerInfo.address.googleMapsLink && (
                      <a 
                        href={selectedSale.customerInfo.address.googleMapsLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                      >
                        <MapPin className="h-3 w-3" />
                        Ver en Google Maps
                      </a>
                    )}
                  </div>
                </div>

                {/* Contacto de Emergencia */}
                {selectedSale.customerInfo.emergencyContact && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                      <UserPlus className="h-4 w-4 text-primary" />
                      Contacto de Emergencia
                    </h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="bg-secondary/20 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Nombre</p>
                        <p className="font-medium text-foreground">{selectedSale.customerInfo.emergencyContact.name}</p>
                      </div>
                      <div className="bg-secondary/20 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Telefono</p>
                        <p className="font-medium text-foreground flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {selectedSale.customerInfo.emergencyContact.phone}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Información de Turno e Instalación */}
                {(selectedSale.appointedDate || selectedSale.completedDate || selectedSale.ctoNumber) && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Turno e Instalacion
                    </h4>
                    <div className="grid gap-3 md:grid-cols-3">
                      {selectedSale.appointedDate && (
                        <div className="bg-secondary/20 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground">Fecha de Turno</p>
                          <p className="font-medium text-foreground">
                            {new Date(selectedSale.appointedDate).toLocaleDateString("es-AR")}
                            {selectedSale.appointmentSlot && (
                              <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                {selectedSale.appointmentSlot === "AM" ? "8:30 - 13:30" : "13:30 - 18:30"}
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                      {selectedSale.completedDate && (
                        <div className="bg-secondary/20 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground">Fecha de Activacion</p>
                          <p className="font-medium text-green-500">
                            {new Date(selectedSale.completedDate).toLocaleDateString("es-AR")}
                          </p>
                        </div>
                      )}
                      {selectedSale.ctoNumber && (
                        <div className="bg-secondary/20 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground">Numero de CTO</p>
                          <p className="font-mono font-medium text-foreground">{selectedSale.ctoNumber}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Plan y Precio */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Plan Contratado
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="bg-secondary/20 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Plan</p>
                      <p className="font-semibold text-foreground">{selectedSale.planName}</p>
                    </div>
                    <div className="bg-secondary/20 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Precio del Abono</p>
                      <p className="font-semibold text-primary">
                        {formatCurrency(selectedSale.customPrice || selectedSale.planPrice || 0)}
                      </p>
                    </div>
                  </div>
                  {selectedSale.planDetail && (
                    <div className="bg-secondary/20 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Detalle del Plan</p>
                      <p className="text-sm text-foreground">{selectedSale.planDetail}</p>
                    </div>
                  )}
                </div>

                {/* Metodo de Pago */}
                {selectedSale.paymentInfo && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      Metodo de Pago
                    </h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="bg-secondary/20 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Pago del Abono</p>
                        <p className="font-medium text-foreground">
                          {selectedSale.paymentInfo.paymentMethodAbono === "credit_card" 
                            ? `Tarjeta de Credito (${selectedSale.paymentInfo.cardBrand?.toUpperCase() || ""})`
                            : "Debito Automatico CBU"}
                        </p>
                        {selectedSale.paymentInfo.cbuNumber && (
                          <p className="text-xs text-muted-foreground mt-1">
                            CBU: {selectedSale.paymentInfo.cbuNumber}
                          </p>
                        )}
                      </div>
                      <div className="bg-secondary/20 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Pago de Instalacion</p>
                        <p className="font-medium text-foreground">
                          {selectedSale.paymentInfo.paymentMethodInstallation === "transfer" 
                            ? "Transferencia Bancaria"
                            : "Mercado Pago"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Observaciones */}
                {selectedSale.description && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground border-b border-border pb-2">
                      Observaciones
                    </h4>
                    <pre className="text-foreground text-sm whitespace-pre-wrap bg-secondary/20 p-3 rounded-lg">
                      {selectedSale.description}
                    </pre>
                  </div>
                )}

                {/* Historial de Estados */}
                {selectedSale.statusHistory && selectedSale.statusHistory.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Historial de Estados
                    </h4>
                    <div className="space-y-3">
                      {selectedSale.statusHistory.map((history, index) => (
                        <div key={index} className="p-3 rounded-lg bg-secondary/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={history.status} />
                              {history.changedBy && (
                                <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded">
                                  por {history.changedBy}
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {new Date(history.changedAt).toLocaleString("es-AR")}
                            </span>
                          </div>
                          {history.notes && (
                            <div className="text-sm text-foreground bg-secondary/30 p-2 rounded border-l-2 border-primary/50">
                              <span className="text-xs text-muted-foreground block mb-1">Comentario:</span>
                              {history.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Archivos Adjuntos */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                    <Paperclip className="h-4 w-4 text-primary" />
                    Archivos Adjuntos ({selectedSale.installationAttachments?.length || 0})
                  </h4>
                  
                  {/* Boton para subir archivos */}
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="attachment-upload-seller"
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const token = localStorage.getItem("token")
                        if (!token) return
                        try {
                          await salesAPI.uploadAttachment(token, selectedSale._id, file)
                          toast({ title: "Archivo subido correctamente" })
                          fetchSales()
                          const updated = await salesAPI.getMySales(token)
                          const updatedSale = updated.sales.find(s => s._id === selectedSale._id)
                          if (updatedSale) setSelectedSale(updatedSale)
                        } catch (err: any) {
                          toast({ title: "Error al subir archivo", description: err.message, variant: "destructive" })
                        }
                        e.target.value = ""
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("attachment-upload-seller")?.click()}
                      className="gap-2"
                    >
                      <Paperclip className="h-4 w-4" />
                      Adjuntar archivo
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Imagenes, PDF, Word, Excel
                    </span>
                  </div>
                  
                  {/* Lista de archivos */}
                  {selectedSale.installationAttachments && selectedSale.installationAttachments.length > 0 && (
                    <div className="space-y-2">
                      {selectedSale.installationAttachments.map((attachment, index) => {
                        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://vps-5905394-x.dattaweb.com"
                        const fullUrl = attachment.url?.startsWith("http") ? attachment.url : `${baseUrl}${attachment.url}`
                        const isImage = attachment.mimetype?.startsWith("image/")
                        
                        return (
                          <div key={attachment._id || index} className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 min-w-0">
                                {isImage ? (
                                  <Image className="h-5 w-5 text-green-400 shrink-0" />
                                ) : attachment.mimetype?.includes("pdf") ? (
                                  <FileText className="h-5 w-5 text-red-400 shrink-0" />
                                ) : (
                                  <File className="h-5 w-5 text-blue-400 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{attachment.originalName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(attachment.size / 1024).toFixed(1)} KB - {new Date(attachment.uploadedAt).toLocaleDateString("es-AR")}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  asChild
                                  className="h-8 w-8 text-primary hover:text-primary/80"
                                >
                                  <a href={fullUrl} target="_blank" rel="noopener noreferrer" download>
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={async () => {
                                    const token = localStorage.getItem("token")
                                    if (!token || !attachment._id) return
                                    try {
                                      await salesAPI.deleteAttachment(token, selectedSale._id, attachment._id)
                                      toast({ title: "Archivo eliminado" })
                                      fetchSales()
                                      const updated = await salesAPI.getMySales(token)
                                      const updatedSale = updated.sales.find(s => s._id === selectedSale._id)
                                      if (updatedSale) setSelectedSale(updatedSale)
                                    } catch {
                                      toast({ title: "Error al eliminar", variant: "destructive" })
                                    }
                                  }}
                                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {/* Vista previa de imagen */}
                            {isImage && (
                              <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
                                <img 
                                  src={fullUrl} 
                                  alt={attachment.originalName}
                                  className="max-w-full max-h-48 rounded-lg border border-border object-contain hover:opacity-90 transition-opacity"
                                />
                              </a>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
