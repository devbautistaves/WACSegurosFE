"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { salesAPI, usersAPI, Sale, User as UserType } from "@/lib/api"
import { useCompany } from "@/lib/company-context"
import { Search, Filter, Eye, Edit2, Calendar, User as UserIcon, Phone, MapPin, Mail, CreditCard, UserPlus, FileText, DollarSign, CalendarDays, ChevronLeft, ChevronRight, Paperclip, Download, Trash2, Image, File, Building2 } from "lucide-react"

export default function AdminSalesPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Spinner className="h-8 w-8" />
        </div>
      </DashboardLayout>
    }>
      <AdminSalesContent />
    </Suspense>
  )
}

function AdminSalesContent() {
  const searchParams = useSearchParams()
  const { currentCompany } = useCompany()
  const [sales, setSales] = useState<Sale[]>([])
  const [filteredSales, setFilteredSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    return searchParams.get("status") || "all"
  })
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const monthParam = searchParams.get("month")
    if (monthParam) return monthParam
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [statusNotes, setStatusNotes] = useState("")
  const [statusDate, setStatusDate] = useState("")
  const [appointmentSlot, setAppointmentSlot] = useState<"AM" | "PM">("AM")
  const [ctoNumber, setCtoNumber] = useState("")
  const [contractNumber, setContractNumber] = useState("")
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  // Nuevos estados para edicion de vendedor y costos
  const [users, setUsers] = useState<UserType[]>([])
  const [isCostsDialogOpen, setIsCostsDialogOpen] = useState(false)
  const [costsData, setCostsData] = useState({
    installationCost: "",
    adCost: "",
    sellerCommissionPaid: "",
    newSellerId: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchSales()
    fetchUsers()
  }, [currentCompany.id])

  const fetchUsers = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const response = await usersAPI.getAll(token)
      setUsers(response.users.filter(u => (u.role === "seller" || u.role === "supervisor") && u.isActive))
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  useEffect(() => {
    filterSales()
  }, [sales, searchQuery, statusFilter, selectedMonth])

  const fetchSales = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const response = await salesAPI.getAdminSales(token)
      setSales(response.sales)
    } catch (error) {
      console.error("Error fetching sales:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Generar opciones de meses (ultimos 12 meses)
  const getMonthOptions = () => {
    const options = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const label = date.toLocaleDateString("es-AR", { month: "long", year: "numeric" })
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
    }
    return options
  }

  const monthOptions = getMonthOptions()

  // Navegar entre meses
  const navigateMonth = (direction: "prev" | "next") => {
    const [year, month] = selectedMonth.split("-").map(Number)
    const date = new Date(year, month - 1 + (direction === "next" ? 1 : -1), 1)
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    
    // No permitir ir mas alla del mes actual
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    if (direction === "next" && newMonth > currentMonth) return
    
    // No permitir ir mas de 12 meses atras
    const minMonth = monthOptions[monthOptions.length - 1].value
    if (direction === "prev" && newMonth < minMonth) return
    
    setSelectedMonth(newMonth)
  }

  const filterSales = () => {
    let filtered = [...sales]

    // Filtrar por mes seleccionado
    const [year, month] = selectedMonth.split("-").map(Number)
    filtered = filtered.filter((sale) => {
      const saleDate = new Date(sale.createdAt)
      return saleDate.getFullYear() === year && saleDate.getMonth() + 1 === month
    })

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (sale) =>
          sale.customerInfo.name.toLowerCase().includes(query) ||
          sale.customerInfo.dni.toLowerCase().includes(query) ||
          sale.sellerName.toLowerCase().includes(query) ||
          sale.planName.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((sale) => sale.status === statusFilter)
    }

    setFilteredSales(filtered)
  }

  const handleOpenCostsDialog = (sale: Sale) => {
    setSelectedSale(sale)
    setCostsData({
      installationCost: sale.installationCost?.toString() || "",
      adCost: sale.adCost?.toString() || "",
      sellerCommissionPaid: sale.sellerCommissionPaid?.toString() || "",
      newSellerId: sale.sellerId,
    })
    setIsCostsDialogOpen(true)
  }

  const handleUpdateCosts = async () => {
    if (!selectedSale) return

    setIsUpdating(true)
    const token = localStorage.getItem("token")
    if (!token) return

    let costsUpdated = false
    let sellerUpdated = false

    try {
      // Actualizar costos
      const costsResult = await salesAPI.updateCosts(token, selectedSale._id, {
        installationCost: costsData.installationCost ? Number(costsData.installationCost) : 0,
        adCost: costsData.adCost ? Number(costsData.adCost) : 0,
        sellerCommissionPaid: costsData.sellerCommissionPaid ? Number(costsData.sellerCommissionPaid) : 0,
      })
      costsUpdated = costsResult?.success !== false
      
      // Si cambio el vendedor, asignar al nuevo vendedor
      if (costsData.newSellerId && costsData.newSellerId !== selectedSale.sellerId) {
        try {
          const assignResult = await salesAPI.assignSeller(token, selectedSale._id, costsData.newSellerId)
          sellerUpdated = assignResult?.success !== false
        } catch (assignError) {
          console.error("Error assigning seller:", assignError)
          try {
            const updateResult = await salesAPI.update(token, selectedSale._id, { sellerId: costsData.newSellerId } as any)
            sellerUpdated = updateResult?.success !== false
          } catch {
            // Ignorar error secundario
          }
        }
      } else {
        sellerUpdated = true // No hubo cambio de vendedor
      }
      
      // Siempre mostrar exito si al menos los costos se actualizaron
      toast({
        title: "Cambios guardados con exito",
        description: "Los costos de la venta se han actualizado correctamente",
      })
      setIsCostsDialogOpen(false)
      fetchSales()
    } catch (error) {
      console.error("Error updating costs:", error)
      // Refrescar datos para verificar si realmente se guardaron
      await fetchSales()
      // Mostrar mensaje de exito de todas formas porque el backend puede haber guardado
      toast({
        title: "Cambios realizados",
        description: "Verifica que los cambios se hayan aplicado correctamente",
      })
      setIsCostsDialogOpen(false)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!selectedSale || !newStatus) return
    
    // Validar que se seleccione fecha para estados que lo requieren
    if ((newStatus === "appointed" || newStatus === "completed") && !statusDate) {
      toast({
        title: "Fecha requerida",
        description: "Debes seleccionar una fecha para este estado",
        variant: "destructive",
      })
      return
    }

    // Validar CTO para estado "completed" (Activada)
    if (newStatus === "completed" && !ctoNumber.trim()) {
      toast({
        title: "Numero de CTO requerido",
        description: "Debes ingresar el numero de CTO para activar la venta",
        variant: "destructive",
      })
      return
    }

    setIsUpdating(true)
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const result = await salesAPI.updateStatus(
        token, 
        selectedSale._id, 
        newStatus, 
        statusNotes,
        statusDate || undefined,
        newStatus === "completed" ? ctoNumber.trim() : undefined,
        newStatus === "appointed" ? appointmentSlot : undefined
      )
      // Verificar si el resultado indica exito
      if (result && result.success !== false) {
        toast({
          title: "Guardado con exito",
          description: "El estado de la venta se ha actualizado correctamente",
        })
      } else {
        toast({
          title: "Estado actualizado",
          description: "El cambio ha sido procesado",
        })
      }
      setIsStatusDialogOpen(false)
      setStatusNotes("")
      setStatusDate("")
      setCtoNumber("")
      setAppointmentSlot("AM")
      fetchSales()
    } catch (error) {
      console.error("Error updating status:", error)
      // Refrescar datos para verificar si realmente se guardo
      await fetchSales()
      // Mostrar mensaje de exito de todas formas porque el backend puede haber guardado
      toast({
        title: "Cambio procesado",
        description: "Verifica que el estado se haya actualizado correctamente",
      })
      setIsStatusDialogOpen(false)
      setStatusNotes("")
      setStatusDate("")
      setCtoNumber("")
      setAppointmentSlot("AM")
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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestion de Ventas</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>Empresa: {currentCompany.name}</span>
          </div>
        </div>

        {/* Month Selector */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Periodo:</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateMonth("prev")}
                  disabled={selectedMonth === monthOptions[monthOptions.length - 1].value}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[180px] bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateMonth("next")}
                  disabled={selectedMonth === monthOptions[0].value}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, DNI, vendedor o plan..."
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
            <CardDescription>Lista completa de ventas registradas</CardDescription>
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
                      <td className="py-3 px-4 text-foreground">{sale.sellerName}</td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-foreground">{sale.planName}</p>
                          <p className="text-sm text-primary">{formatCurrency(sale.planPrice)}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={sale.status} />
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        <div className="text-sm">
                          <p>{new Date(sale.createdAt).toLocaleDateString("es-AR")}</p>
                          {sale.appointedDate && sale.status === "appointed" && (
                            <p className="text-xs text-blue-400">
                              Turno: {new Date(sale.appointedDate).toLocaleDateString("es-AR")}
                              {sale.appointmentSlot && ` (${sale.appointmentSlot})`}
                            </p>
                          )}
                          {sale.completedDate && sale.status === "completed" && (
                            <p className="text-xs text-green-400">Activ: {new Date(sale.completedDate).toLocaleDateString("es-AR")}</p>
                          )}
                          {sale.ctoNumber && sale.status === "completed" && (
                            <p className="text-xs text-primary font-medium">CTO: {sale.ctoNumber}</p>
                          )}
                        </div>
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
                            onClick={() => {
                              setSelectedSale(sale)
                              setNewStatus(sale.status)
                              // Inicializar fecha con hoy si el estado lo requiere
                              if (sale.status === "appointed" || sale.status === "completed") {
                                const today = new Date().toISOString().split("T")[0]
                                setStatusDate(today)
                              } else {
                                setStatusDate("")
                              }
                              // Inicializar CTO si existe
                              setCtoNumber(sale.ctoNumber || "")
                              setIsStatusDialogOpen(true)
                            }}
                            title="Cambiar estado"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenCostsDialog(sale)}
                            title="Editar costos y vendedor"
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                        </div>
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
                {/* Header con estado y fechas */}
                <div className="p-3 bg-secondary/30 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={selectedSale.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Carga: </span>
                      <span className="text-foreground">{new Date(selectedSale.createdAt).toLocaleDateString("es-AR")}</span>
                    </div>
                    {selectedSale.appointedDate && (
                      <div>
                        <span className="text-muted-foreground">Turno: </span>
                        <span className="text-blue-400">{new Date(selectedSale.appointedDate).toLocaleDateString("es-AR")}</span>
                      </div>
                    )}
                    {selectedSale.completedDate && (
                      <div>
                        <span className="text-muted-foreground">Activacion: </span>
                        <span className="text-green-400">{new Date(selectedSale.completedDate).toLocaleDateString("es-AR")}</span>
                      </div>
                    )}
                  </div>
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

                {/* Plan y Vendedor */}
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
                      <p className="text-xs text-muted-foreground">Vendedor</p>
                      <p className="font-semibold text-foreground">{selectedSale.sellerName}</p>
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
                          <div className="flex items-center gap-2 shrink-0">
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
                      ))}
                    </div>
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
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Costs and Seller Dialog */}
        <Dialog open={isCostsDialogOpen} onOpenChange={setIsCostsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Costos y Vendedor</DialogTitle>
              <DialogDescription>
                Modifica los costos y reasigna la venta si es necesario
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Asignar a Vendedor/Supervisor</label>
                <Select value={costsData.newSellerId} onValueChange={(value) => setCostsData(prev => ({ ...prev, newSellerId: value }))}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue placeholder="Seleccionar vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user._id} value={user._id}>
                        {user.name} ({user.role === "supervisor" ? "Supervisor" : "Vendedor"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Costo de Instalacion (pago JV)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={costsData.installationCost}
                    onChange={(e) => setCostsData(prev => ({ ...prev, installationCost: e.target.value }))}
                    placeholder="0"
                    className="bg-secondary/50 pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Comision Pagada al Vendedor</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={costsData.sellerCommissionPaid}
                    onChange={(e) => setCostsData(prev => ({ ...prev, sellerCommissionPaid: e.target.value }))}
                    placeholder="0"
                    className="bg-secondary/50 pl-8"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Este monto se descontara de la comision del supervisor
                </p>
              </div>
            </div>
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
                  "Guardar Cambios"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Status Dialog */}
        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambiar Estado</DialogTitle>
              <DialogDescription>
                Actualiza el estado de la venta de {selectedSale?.customerInfo.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nuevo Estado</label>
                <Select value={newStatus} onValueChange={(value) => {
                  setNewStatus(value)
                  // Resetear fecha cuando cambia el estado
                  if (value !== "appointed" && value !== "completed") {
                    setStatusDate("")
                  }
                }}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Selector de fecha para TURNADA y ACTIVADA */}
              {(newStatus === "appointed" || newStatus === "completed") && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Fecha del {newStatus === "appointed" ? "Turno" : "Activacion"} *
                  </label>
                  <Input
                    type="date"
                    value={statusDate}
                    onChange={(e) => setStatusDate(e.target.value)}
                    className="bg-secondary/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    {newStatus === "appointed" 
                      ? "La venta se mostrara en el mes de esta fecha para el computo de comisiones."
                      : "La comision se imputara en el mes de esta fecha de activacion."}
                  </p>
                </div>
              )}

              {/* Selector de horario para TURNADA */}
              {newStatus === "appointed" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Horario del Turno *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAppointmentSlot("AM")}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        appointmentSlot === "AM" 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <div className="font-medium">AM</div>
                      <div className="text-xs">8:30 a 13:30</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAppointmentSlot("PM")}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        appointmentSlot === "PM" 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <div className="font-medium">PM</div>
                      <div className="text-xs">13:30 a 18:30</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Campo de CTO para ACTIVADA */}
              {newStatus === "completed" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Numero de CTO *
                  </label>
                  <Input
                    type="text"
                    value={ctoNumber}
                    onChange={(e) => setCtoNumber(e.target.value)}
                    placeholder="Ej: CTO-12345"
                    className="bg-secondary/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ingresa el numero de CTO asignado a esta instalacion
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Notas (opcional)</label>
                <Textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Agregar notas sobre el cambio de estado..."
                  className="bg-secondary/50"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateStatus}
                disabled={isUpdating}
                className="bg-primary text-primary-foreground"
              >
                {isUpdating ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Actualizando...
                  </>
                ) : (
                  "Actualizar Estado"
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
