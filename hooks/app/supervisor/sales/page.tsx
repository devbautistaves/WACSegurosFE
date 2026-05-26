"use client"

import { useEffect, useState } from "react"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { useToast } from "@/hooks/use-toast"
import { salesAPI, usersAPI, Sale, User } from "@/lib/api"
import { Search, Filter, Eye, Edit2, DollarSign, User as UserIcon, Phone, MapPin, Mail, CreditCard, UserPlus, FileText, Calendar, Users, Paperclip, Download, Trash2, Image, File } from "lucide-react"

export default function SupervisorSalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [filteredSales, setFilteredSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCostsDialogOpen, setIsCostsDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [sellers, setSellers] = useState<User[]>([])
  const [selectedSellerId, setSelectedSellerId] = useState("")
  const [costForm, setCostForm] = useState({
    installationCost: 0,
    adminCost: 0,
    adCost: 0,
    sellerCommissionPaid: 0,
  })
  const [contractNumber, setContractNumber] = useState("")
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSales()
    fetchSellers()
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

  const fetchSellers = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const response = await usersAPI.getSellers(token)
      setSellers(response.sellers || [])
    } catch (error) {
      console.error("Error fetching sellers:", error)
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
          sale.planName.toLowerCase().includes(query) ||
          sale.sellerName.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((sale) => sale.status === statusFilter)
    }

    setFilteredSales(filtered)
  }

  const handleOpenCostsDialog = (sale: Sale) => {
    setSelectedSale(sale)
    setCostForm({
      installationCost: sale.installationCost || 0,
      adminCost: sale.adminCost || 0,
      adCost: sale.adCost || 0,
      sellerCommissionPaid: sale.sellerCommissionPaid || 0,
    })
    setIsCostsDialogOpen(true)
  }

  const handleOpenAssignDialog = (sale: Sale) => {
    setSelectedSale(sale)
    setSelectedSellerId(sale.sellerId || "")
    setIsAssignDialogOpen(true)
  }

  const handleUpdateCosts = async () => {
    if (!selectedSale) return

    setIsUpdating(true)
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      await salesAPI.updateCosts(token, selectedSale._id, {
        installationCost: costForm.installationCost || 0,
        adminCost: costForm.adminCost || 0,
        adCost: costForm.adCost || 0,
        sellerCommissionPaid: costForm.sellerCommissionPaid || 0,
      })
      toast({
        title: "Costos actualizados",
        description: "Los costos de la venta se han actualizado correctamente",
      })
      setIsCostsDialogOpen(false)
      fetchSales()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar los costos",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAssignSeller = async () => {
    if (!selectedSale || !selectedSellerId) return

    setIsUpdating(true)
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      await salesAPI.assignSeller(token, selectedSale._id, selectedSellerId)
      toast({
        title: "Vendedor asignado",
        description: "La venta ha sido asignada al vendedor correctamente",
      })
      setIsAssignDialogOpen(false)
      fetchSales()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al asignar vendedor",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
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
      <DashboardLayout requiredRole="supervisor">
        <div className="flex items-center justify-center h-[60vh]">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="supervisor">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mis Ventas</h1>
          <p className="text-muted-foreground">
            Gestiona tus ventas y asigna vendedores
          </p>
        </div>

        {/* Filters */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, DNI, plan o vendedor..."
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

        {/* Sales Table */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>Ventas ({filteredSales.length})</CardTitle>
            <CardDescription>Lista de tus ventas registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">DNI</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Contrato</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Vendedor</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Plan</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Estado</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Costos</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Fecha</th>
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
                        <button
                          onClick={() => {
                            setSelectedSale(sale)
                            setContractNumber(sale.contractNumber || "")
                            setIsContractDialogOpen(true)
                          }}
                          className="text-foreground hover:text-primary transition-colors"
                        >
                          {sale.contractNumber || <span className="text-muted-foreground text-xs">Sin contrato</span>}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-foreground">{sale.sellerName}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-foreground">{sale.planName}</p>
                          <p className="text-sm text-primary">{formatCurrency(sale.planPrice)}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={sale.status} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs space-y-1">
                          {sale.installationCost ? (
                            <p className="text-muted-foreground">Inst: {formatCurrency(sale.installationCost)}</p>
                          ) : null}
                          {sale.adminCost ? (
                            <p className="text-muted-foreground">Admin: {formatCurrency(sale.adminCost)}</p>
                          ) : null}
                          {sale.adCost ? (
                            <p className="text-muted-foreground">Anuncio: {formatCurrency(sale.adCost)}</p>
                          ) : null}
                          {sale.sellerCommissionPaid ? (
                            <p className="text-muted-foreground">Com. Vend: {formatCurrency(sale.sellerCommissionPaid)}</p>
                          ) : null}
                          {!sale.installationCost && !sale.adminCost && !sale.adCost && !sale.sellerCommissionPaid && (
                            <p className="text-muted-foreground">Sin costos</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(sale.createdAt).toLocaleDateString("es-AR")}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedSale(sale)
                              setIsDetailOpen(true)
                            }}
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenCostsDialog(sale)}
                            title="Editar costos"
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenAssignDialog(sale)}
                            title="Asignar vendedor"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-muted-foreground">
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
                    <UserIcon className="h-4 w-4 text-primary" />
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
                    {selectedSale.customerInfo.birthDate && (
                      <div className="bg-secondary/20 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Fecha de Nacimiento</p>
                        <p className="font-medium text-foreground flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(selectedSale.customerInfo.birthDate).toLocaleDateString("es-AR")}
                        </p>
                      </div>
                    )}
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

                {/* Vendedor Asignado */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                    <Users className="h-4 w-4 text-primary" />
                    Vendedor Asignado
                  </h4>
                  <div className="bg-secondary/20 p-3 rounded-lg">
                    <p className="font-medium text-foreground">{selectedSale.sellerName}</p>
                  </div>
                </div>

                {/* Costos */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Costos Aplicados
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="bg-secondary/20 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Costo Instalacion</p>
                      <p className="font-medium text-foreground">{formatCurrency(selectedSale.installationCost || 0)}</p>
                    </div>
                    <div className="bg-secondary/20 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Costo Admin</p>
                      <p className="font-medium text-foreground">{formatCurrency(selectedSale.adminCost || 0)}</p>
                    </div>
                    <div className="bg-secondary/20 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Costo Anuncio</p>
                      <p className="font-medium text-foreground">{formatCurrency(selectedSale.adCost || 0)}</p>
                    </div>
                    <div className="bg-secondary/20 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Comision Vendedor</p>
                      <p className="font-medium text-foreground">{formatCurrency(selectedSale.sellerCommissionPaid || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* Archivos Adjuntos */}
                {selectedSale.installationAttachments && selectedSale.installationAttachments.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                      <Paperclip className="h-4 w-4 text-primary" />
                      Archivos Adjuntos ({selectedSale.installationAttachments.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedSale.installationAttachments.map((attachment, index) => (
                        <div key={attachment._id || index} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/30">
                          <div className="flex items-center gap-3 min-w-0">
                            {attachment.mimetype?.startsWith("image/") ? (
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
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="h-8 w-8 text-primary hover:text-primary/80"
                          >
                            <a href={attachment.url} target="_blank" rel="noopener noreferrer" download>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Costs Dialog */}
        <Dialog open={isCostsDialogOpen} onOpenChange={setIsCostsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Costos de Venta</DialogTitle>
              <DialogDescription>
                Ingresa los costos aplicables a esta venta
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="installationCost">Costo de Instalacion (pagado por JV)</FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="installationCost"
                    type="number"
                    value={costForm.installationCost}
                    onChange={(e) => setCostForm(prev => ({ ...prev, installationCost: Number(e.target.value) }))}
                    className="bg-secondary/50 pl-8"
                  />
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="adminCost">Costo de Administracion (JV)</FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="adminCost"
                    type="number"
                    value={costForm.adminCost}
                    onChange={(e) => setCostForm(prev => ({ ...prev, adminCost: Number(e.target.value) }))}
                    className="bg-secondary/50 pl-8"
                  />
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="adCost">Costo de Anuncio</FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="adCost"
                    type="number"
                    value={costForm.adCost}
                    onChange={(e) => setCostForm(prev => ({ ...prev, adCost: Number(e.target.value) }))}
                    className="bg-secondary/50 pl-8"
                  />
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="sellerCommissionPaid">Comision del Vendedor</FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="sellerCommissionPaid"
                    type="number"
                    value={costForm.sellerCommissionPaid}
                    onChange={(e) => setCostForm(prev => ({ ...prev, sellerCommissionPaid: Number(e.target.value) }))}
                    className="bg-secondary/50 pl-8"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Este monto se descontara de tu comision total
                </p>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCostsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateCosts}
                disabled={isUpdating}
                className="bg-primary text-primary-foreground"
              >
                {isUpdating ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Costos"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Seller Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Asignar Vendedor</DialogTitle>
              <DialogDescription>
                Asigna esta venta a uno de tus vendedores. La venta aparecera en el panel del vendedor seleccionado.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Field>
                <FieldLabel>Seleccionar Vendedor</FieldLabel>
                <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue placeholder="Selecciona un vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map((seller) => (
                      <SelectItem key={seller._id} value={seller._id}>
                        {seller.name} - {seller.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {sellers.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  No hay vendedores activos disponibles
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleAssignSeller}
                disabled={isUpdating || !selectedSellerId}
                className="bg-primary text-primary-foreground"
              >
                {isUpdating ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Asignando...
                  </>
                ) : (
                  "Asignar Vendedor"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Contract Number Dialog */}
        <Dialog open={isContractDialogOpen} onOpenChange={setIsContractDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Numero de Contrato</DialogTitle>
              <DialogDescription>
                {selectedSale?.customerInfo.name} - {selectedSale?.customerInfo.dni}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Numero de Contrato</label>
                <Input
                  type="text"
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value)}
                  placeholder="Ej: CONT-12345"
                  className="bg-secondary/50"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsContractDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedSale) return
                  setIsUpdating(true)
                  const token = localStorage.getItem("token")
                  if (!token) return
                  try {
                    await salesAPI.updateContract(token, selectedSale._id, contractNumber)
                    toast({
                      title: "Contrato actualizado",
                      description: "El numero de contrato se ha guardado correctamente",
                    })
                    setIsContractDialogOpen(false)
                    fetchSales()
                  } catch (error) {
                    console.error("Error updating contract:", error)
                    toast({
                      title: "Error",
                      description: "No se pudo guardar el contrato",
                      variant: "destructive",
                    })
                  } finally {
                    setIsUpdating(false)
                  }
                }}
                disabled={isUpdating}
                className="bg-primary text-primary-foreground"
              >
                {isUpdating ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Contrato"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
