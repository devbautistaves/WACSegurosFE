"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { companySettingsAPI, tpyDemosAPI, User, Sale, CommissionScale, TPY_Demo } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { 
  DollarSign, 
  Calendar, 
  Edit2, 
  Save, 
  TrendingUp,
  Users,
  Globe,
  X,
  Plus,
  Trash2,
  UserCog,
  Layers
} from "lucide-react"

interface TuPaginaYaCommissionsPanelProps {
  users: User[]
  sales: Sale[]
  isLoading: boolean
}

export function TuPaginaYaCommissionsPanel({ users, sales, isLoading }: TuPaginaYaCommissionsPanelProps) {
  const { token } = useAuth()
  const { currentCompany } = useCompany()
  const [basePrice, setBasePrice] = useState<number>(15000)
  const [editingBasePrice, setEditingBasePrice] = useState(false)
  const [newBasePrice, setNewBasePrice] = useState<string>("")
  const [isSavingPrice, setIsSavingPrice] = useState(false)
  
  // Escalas de comision
  const [commissionScales, setCommissionScales] = useState<CommissionScale[]>([
    { minSales: 1, maxSales: 5, commissionAmount: 2000 },
    { minSales: 6, maxSales: 10, commissionAmount: 2500 },
    { minSales: 11, maxSales: null, commissionAmount: 3000 },
  ])
  const [editingScales, setEditingScales] = useState(false)
  const [tempScales, setTempScales] = useState<CommissionScale[]>([])
  const [isSavingScales, setIsSavingScales] = useState(false)
  
  // Comision fija de supervisor
  const [supervisorCommission, setSupervisorCommission] = useState<number>(500)
  const [editingSupervisorComm, setEditingSupervisorComm] = useState(false)
  const [newSupervisorComm, setNewSupervisorComm] = useState<string>("")
  const [isSavingSupervisorComm, setIsSavingSupervisorComm] = useState(false)
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  
  // Demos de Empresa 2 (clientes activos)
  const [activatedDemos, setActivatedDemos] = useState<TPY_Demo[]>([])
  const [isLoadingDemos, setIsLoadingDemos] = useState(false)
  
  const { toast } = useToast()

  // Cargar configuracion al inicio
  useEffect(() => {
    if (token) {
      loadSettings()
      loadActivatedDemos()
    }
  }, [token, selectedMonth])

  const loadActivatedDemos = async () => {
    if (!token) return
    setIsLoadingDemos(true)
    try {
      const response = await tpyDemosAPI.getAll(token, { status: "web_activada", month: selectedMonth })
      if (response.success) {
        setActivatedDemos(response.demos || [])
      }
    } catch (error) {
      console.error("Error loading activated demos:", error)
    } finally {
      setIsLoadingDemos(false)
    }
  }

  const loadSettings = async () => {
    if (!token) return
    try {
      const response = await companySettingsAPI.get(token, currentCompany.id)
      if (response?.settings) {
        const settings = response.settings
        if (settings.basePrice) setBasePrice(settings.basePrice)
        if (settings.commissionScales && settings.commissionScales.length > 0) {
          setCommissionScales(settings.commissionScales)
        }
        if (settings.supervisorFixedCommission !== undefined) {
          setSupervisorCommission(settings.supervisorFixedCommission)
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error)
    }
  }

  const handleSaveBasePrice = async () => {
    if (!token) return
    const price = parseFloat(newBasePrice)
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Error",
        description: "Ingresa un precio valido",
        variant: "destructive",
      })
      return
    }

    setIsSavingPrice(true)
    try {
      await companySettingsAPI.update(token, currentCompany.id, { basePrice: price })
      setBasePrice(price)
      setEditingBasePrice(false)
      setNewBasePrice("")
      toast({
        title: "Precio actualizado",
        description: `El precio base se actualizo a $${price.toLocaleString("es-AR")}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el precio",
        variant: "destructive",
      })
    } finally {
      setIsSavingPrice(false)
    }
  }

  const handleSaveScales = async () => {
    if (!token) return
    // Validar escalas
    for (let i = 0; i < tempScales.length; i++) {
      const scale = tempScales[i]
      if (scale.minSales < 1 || scale.commissionAmount < 0) {
        toast({
          title: "Error",
          description: "Los valores deben ser positivos",
          variant: "destructive",
        })
        return
      }
      if (scale.maxSales !== null && scale.maxSales < scale.minSales) {
        toast({
          title: "Error",
          description: "El maximo debe ser mayor o igual al minimo",
          variant: "destructive",
        })
        return
      }
    }

    setIsSavingScales(true)
    try {
      await companySettingsAPI.update(token, currentCompany.id, { commissionScales: tempScales })
      setCommissionScales(tempScales)
      setEditingScales(false)
      toast({
        title: "Escalas actualizadas",
        description: "Las escalas de comision se guardaron correctamente",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar las escalas",
        variant: "destructive",
      })
    } finally {
      setIsSavingScales(false)
    }
  }

  const handleSaveSupervisorCommission = async () => {
    if (!token) return
    const amount = parseFloat(newSupervisorComm)
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Error",
        description: "Ingresa un monto valido",
        variant: "destructive",
      })
      return
    }

    setIsSavingSupervisorComm(true)
    try {
      await companySettingsAPI.update(token, currentCompany.id, { supervisorFixedCommission: amount })
      setSupervisorCommission(amount)
      setEditingSupervisorComm(false)
      setNewSupervisorComm("")
      toast({
        title: "Comision actualizada",
        description: `La comision de supervisores se actualizo a $${amount.toLocaleString("es-AR")}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la comision",
        variant: "destructive",
      })
    } finally {
      setIsSavingSupervisorComm(false)
    }
  }

  const addScale = () => {
    const lastScale = tempScales[tempScales.length - 1]
    const newMin = lastScale?.maxSales ? lastScale.maxSales + 1 : 1
    setTempScales([...tempScales, { minSales: newMin, maxSales: null, commissionAmount: 0 }])
  }

  const removeScale = (index: number) => {
    setTempScales(tempScales.filter((_, i) => i !== index))
  }

  const updateScale = (index: number, field: keyof CommissionScale, value: number | null) => {
    const updated = [...tempScales]
    updated[index] = { ...updated[index], [field]: value }
    setTempScales(updated)
  }

  // Calcular comision por escala
  const getCommissionForSalesCount = (salesCount: number): number => {
    for (const scale of commissionScales) {
      if (salesCount >= scale.minSales && (scale.maxSales === null || salesCount <= scale.maxSales)) {
        return scale.commissionAmount
      }
    }
    return commissionScales[commissionScales.length - 1]?.commissionAmount || 0
  }

  // Generar lista de meses
  const generateMonths = () => {
    const months = []
    const currentDate = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const label = date.toLocaleDateString("es-AR", { month: "long", year: "numeric" })
      months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
    }
    return months
  }

  // Usar demos activadas (web_activada) para calcular comisiones
  // Las demos ya vienen filtradas por mes desde el backend
  const activatedWebsThisMonth = activatedDemos

  // Calcular estadisticas
  const totalSales = activatedWebsThisMonth.length
  const totalRevenue = activatedWebsThisMonth.reduce((acc, demo) => {
    const price = demo.monthlyPrice || basePrice
    return acc + price
  }, 0)
  const activeSellers = new Set(activatedWebsThisMonth.map(d => {
    const sellerId = typeof d.sellerId === 'object' ? d.sellerId?._id : d.sellerId
    return sellerId
  }).filter(Boolean)).size

  // Calcular comisiones por vendedor con escalas basado en demos activadas
  const sellerCommissions = activatedWebsThisMonth.reduce((acc, demo) => {
    const sellerId = typeof demo.sellerId === 'object' ? demo.sellerId?._id : demo.sellerId
    const sellerName = typeof demo.sellerId === 'object' ? demo.sellerId?.name : demo.sellerName
    if (!sellerId) return acc
    
    if (!acc[sellerId]) {
      acc[sellerId] = { name: sellerName || "Vendedor desconocido", sales: 0, totalCommission: 0 }
    }
    acc[sellerId].sales += 1
    return acc
  }, {} as Record<string, { name: string; sales: number; totalCommission: number }>)

  // Calcular comision total por vendedor basada en escala
  Object.keys(sellerCommissions).forEach(sellerId => {
    const seller = sellerCommissions[sellerId]
    const commPerSale = getCommissionForSalesCount(seller.sales)
    seller.totalCommission = seller.sales * commPerSale
  })

  // Calcular comisiones de supervisores basado en demos activadas
  const supervisorCommissions = users
    .filter(u => u.role === "supervisor" && (u.company === "tupaginaya" || u.company === "paginas" || u.companyId === currentCompany.id))
    .map(supervisor => {
      // Demos de vendedores bajo este supervisor
      const teamDemos = activatedWebsThisMonth.filter(demo => {
        const sellerId = typeof demo.sellerId === 'object' ? demo.sellerId?._id : demo.sellerId
        const seller = users.find(u => u._id === sellerId)
        return seller?.supervisor === supervisor._id
      })
      // Tambien contar demos propias del supervisor
      const ownDemos = activatedWebsThisMonth.filter(demo => {
        const sellerId = typeof demo.sellerId === 'object' ? demo.sellerId?._id : demo.sellerId
        return sellerId === supervisor._id
      })
      const totalTeamDemos = teamDemos.length + ownDemos.length
      return {
        id: supervisor._id,
        name: supervisor.name,
        teamSales: totalTeamDemos,
        totalCommission: totalTeamDemos * supervisorCommission
      }
    })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Comisiones Empresa 2</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Configura escalas de comision para vendedores y supervisores
          </p>
        </div>
        
        {/* Selector de mes */}
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {generateMonths().map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Configuracion principal - Grid de 3 cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Precio Base */}
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary" />
              Precio Base
            </CardTitle>
            <CardDescription className="text-xs">
              Precio por venta de pagina web
            </CardDescription>
          </CardHeader>
          <CardContent>
            {editingBasePrice ? (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">$</span>
                <Input
                  type="number"
                  value={newBasePrice}
                  onChange={(e) => setNewBasePrice(e.target.value)}
                  placeholder={basePrice.toString()}
                  className="w-24 text-lg font-bold"
                  autoFocus
                />
                <Button onClick={handleSaveBasePrice} disabled={isSavingPrice} size="sm" variant="default">
                  {isSavingPrice ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditingBasePrice(false); setNewBasePrice("") }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary">
                  ${basePrice.toLocaleString("es-AR")}
                </span>
                <Button variant="ghost" size="sm" onClick={() => { setEditingBasePrice(true); setNewBasePrice(basePrice.toString()) }}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comision Supervisor */}
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCog className="h-5 w-5 text-amber-600" />
              Comision Supervisor
            </CardTitle>
            <CardDescription className="text-xs">
              Fijo por cada venta de su equipo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {editingSupervisorComm ? (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">$</span>
                <Input
                  type="number"
                  value={newSupervisorComm}
                  onChange={(e) => setNewSupervisorComm(e.target.value)}
                  placeholder={supervisorCommission.toString()}
                  className="w-24 text-lg font-bold"
                  autoFocus
                />
                <Button onClick={handleSaveSupervisorCommission} disabled={isSavingSupervisorComm} size="sm" variant="default">
                  {isSavingSupervisorComm ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditingSupervisorComm(false); setNewSupervisorComm("") }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-amber-600">
                  ${supervisorCommission.toLocaleString("es-AR")}
                </span>
                <Button variant="ghost" size="sm" onClick={() => { setEditingSupervisorComm(true); setNewSupervisorComm(supervisorCommission.toString()) }}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Escalas de Comision */}
        <Card className="border-emerald-500/50 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="h-5 w-5 text-emerald-600" />
              Escalas Vendedores
            </CardTitle>
            <CardDescription className="text-xs">
              Comision por cantidad de ventas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => { setEditingScales(true); setTempScales([...commissionScales]) }}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Configurar Escalas
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Resumen de Escalas Actuales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Escalas de Comision Actuales</CardTitle>
          <CardDescription>
            Comision que recibe el vendedor segun su cantidad de ventas en el mes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {commissionScales.map((scale, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">
                  {scale.maxSales === null 
                    ? `${scale.minSales}+ ventas` 
                    : scale.minSales === scale.maxSales 
                      ? `${scale.minSales} venta${scale.minSales > 1 ? 's' : ''}`
                      : `${scale.minSales}-${scale.maxSales} ventas`}
                </span>
                <span className="font-bold text-emerald-600">
                  ${scale.commissionAmount.toLocaleString("es-AR")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Estadisticas del mes */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales}</div>
            <p className="text-xs text-muted-foreground">Webs activadas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              ${totalRevenue.toLocaleString("es-AR")}
            </div>
            <p className="text-xs text-muted-foreground">Facturacion del mes</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vendedores Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSellers}</div>
            <p className="text-xs text-muted-foreground">Con ventas este mes</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de comisiones por vendedor */}
      <Card>
        <CardHeader>
          <CardTitle>Comisiones Vendedores</CardTitle>
          <CardDescription>
            Comisiones calculadas por escala segun webs activadas del mes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(sellerCommissions).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay ventas registradas en este mes</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-center">Ventas</TableHead>
                  <TableHead className="text-center">Comision/Venta</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(sellerCommissions).map(([id, data]) => (
                  <TableRow key={id}>
                    <TableCell className="font-medium">{data.name}</TableCell>
                    <TableCell className="text-center">{data.sales}</TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      ${getCommissionForSalesCount(data.sales).toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">
                      ${data.totalCommission.toLocaleString("es-AR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tabla de comisiones por supervisor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-amber-600" />
            Comisiones Supervisores
          </CardTitle>
          <CardDescription>
            Comision fija de ${supervisorCommission.toLocaleString("es-AR")} por cada venta de su equipo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {supervisorCommissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay supervisores configurados para Empresa 2</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supervisor</TableHead>
                  <TableHead className="text-center">Ventas del Equipo</TableHead>
                  <TableHead className="text-right">Comision Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supervisorCommissions.map((sup) => (
                  <TableRow key={sup.id}>
                    <TableCell className="font-medium">{sup.name}</TableCell>
                    <TableCell className="text-center">{sup.teamSales}</TableCell>
                    <TableCell className="text-right font-semibold text-amber-600">
                      ${sup.totalCommission.toLocaleString("es-AR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para editar escalas */}
      <Dialog open={editingScales} onOpenChange={setEditingScales}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurar Escalas de Comision</DialogTitle>
            <DialogDescription>
              Define cuanto gana el vendedor segun la cantidad de ventas que realice en el mes
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {tempScales.map((scale, index) => (
              <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Desde</label>
                    <Input
                      type="number"
                      value={scale.minSales}
                      onChange={(e) => updateScale(index, "minSales", parseInt(e.target.value) || 1)}
                      min={1}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Hasta</label>
                    <Input
                      type="number"
                      value={scale.maxSales ?? ""}
                      onChange={(e) => updateScale(index, "maxSales", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Sin limite"
                      className="h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Comision $</label>
                    <Input
                      type="number"
                      value={scale.commissionAmount}
                      onChange={(e) => updateScale(index, "commissionAmount", parseInt(e.target.value) || 0)}
                      min={0}
                      className="h-8"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeScale(index)}
                  disabled={tempScales.length <= 1}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={addScale} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Escala
          </Button>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingScales(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveScales} disabled={isSavingScales}>
              {isSavingScales ? <Spinner className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Escalas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
