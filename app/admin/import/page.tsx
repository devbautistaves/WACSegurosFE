"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Spinner } from "@/components/ui/spinner"
import { Upload, CheckCircle, AlertTriangle, Database, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://vps-5905394-x.dattaweb.com"

// Datos de ACTIVADAS del CSV (preview)
const activadasPreview = [
  { nombre: "RAFAEL CARLOS REYNOSO", webName: "IGLESIA REY DE GLORIA", domain: "IGLESIAREYDEGLORIA.COM.AR", activacion: 50000, suscripcion: 15000 },
  { nombre: "NICOLAS RABIALES", webName: "ELECTRO BOHEMIA", domain: "ELECTROBOHEMIA.COM.AR", activacion: 85000, suscripcion: 15000 },
  { nombre: "Omar Oscar Daniel Paez", webName: "Daniel Eventos", domain: "danieleventos.com.ar", activacion: 50000, suscripcion: 15000 },
  { nombre: "ADRIAN EDUARDO CHRISTON", webName: "PLASTICOS HD", domain: "PLASTICOSHD.COM.AR", activacion: 50000, suscripcion: 15000 },
  { nombre: "CRUZ ERICKSON", webName: "CLEAN DM LIMPIEZA", domain: "CLEANDMLIMPIEZA.COM.AR", activacion: 50000, suscripcion: 15000 },
  { nombre: "Kevin Hector Manuel Lopez", webName: "Mendoza Transfer", domain: "mendozatransfer.com.ar", activacion: 50000, suscripcion: 15000 },
  { nombre: "Cesar Fabian Trindades", webName: "Electricista Triny", domain: "electricistatriny.com.ar", activacion: 50000, suscripcion: 15000 },
  { nombre: "Sol Ramirez", webName: "Sol Coach", domain: "solramirezcoach.com.ar", activacion: 50000, suscripcion: 15000 },
  { nombre: "Javier Antonio Jara", webName: "Jara Bus", domain: "jarabus.com.ar", activacion: 50000, suscripcion: 15000 },
  { nombre: "LEANDRO EZEQUIEL RODRIGUEZ", webName: "LR TURBOS", domain: "LRTURBOS.COM.AR", activacion: 50000, suscripcion: 15000 },
  { nombre: "Manuel Alberto Chena", webName: "Itema", domain: "itemacursos.com.ar", activacion: 75000, suscripcion: 15000 },
  { nombre: "Carlos Gonzalo Etchart", webName: "GyG Aberturas", domain: "aberturasgyg.com.ar", activacion: 75000, suscripcion: 12500 },
  { nombre: "Maximiliano Sonic Boom", webName: "Sonic Boom", domain: "sonicboomstore.com.ar", activacion: 75000, suscripcion: 12500 },
]

interface SeedResult {
  success: boolean
  message: string
  clients?: { imported: number; errors: Array<{ client: string; error: string }> }
  collections?: { imported: number; errors: Array<{ collection: string; error: string }> }
}

export default function ImportPage() {
  const [isImporting, setIsImporting] = useState(false)
  const [clearExisting, setClearExisting] = useState(false)
  const [result, setResult] = useState<SeedResult | null>(null)
  const { toast } = useToast()

  const handleSeedData = async () => {
    const token = localStorage.getItem("token")
    if (!token) {
      toast({ title: "Error", description: "No autenticado", variant: "destructive" })
      return
    }

    setIsImporting(true)
    setResult(null)

    try {
      const response = await fetch(`${API_URL}/api/tpy/seed-csv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ clearExisting }),
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
        toast({
          title: "Seed completado",
          description: data.message,
        })
      } else {
        throw new Error(data.error || "Error desconocido")
      }
    } catch (error) {
      console.error("Error seeding data:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron cargar los datos",
        variant: "destructive"
      })
    }

    setIsImporting(false)
  }

  return (
    <DashboardLayout requiredRole="admin">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Cargar Datos CSV</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Cargar clientes activados y cobranzas desde los datos del CSV directamente a la base de datos
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Seed de Datos TuPaginaYa
            </CardTitle>
            <CardDescription>
              Este proceso insertara 13 clientes activados y sus cobranzas (Feb-May 2026) directamente en MongoDB.
              Los datos ya estan embebidos en el backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-amber-500/10 rounded-lg">
              <Switch 
                id="clearExisting" 
                checked={clearExisting} 
                onCheckedChange={setClearExisting}
              />
              <Label htmlFor="clearExisting" className="flex items-center gap-2 cursor-pointer">
                <Trash2 className="h-4 w-4 text-amber-600" />
                <span>Eliminar datos existentes antes de importar</span>
              </Label>
            </div>

            <Button 
              onClick={handleSeedData} 
              disabled={isImporting}
              className="w-full"
              size="lg"
            >
              {isImporting ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isImporting ? "Cargando datos..." : "Ejecutar Seed"}
            </Button>
          </CardContent>
        </Card>

        {/* Resultados */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )}
                Resultado del Seed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg font-medium">{result.message}</p>
              
              {result.clients && (
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <p className="font-medium">Clientes: {result.clients.imported} importados</p>
                  {result.clients.errors.length > 0 && (
                    <div className="mt-2 text-sm text-red-600">
                      <p className="font-medium">Errores:</p>
                      {result.clients.errors.map((err, i) => (
                        <p key={i}>- {err.client}: {err.error}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {result.collections && (
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <p className="font-medium">Cobranzas: {result.collections.imported} importadas</p>
                  {result.collections.errors.length > 0 && (
                    <div className="mt-2 text-sm text-red-600">
                      <p className="font-medium">Errores:</p>
                      {result.collections.errors.map((err, i) => (
                        <p key={i}>- {err.collection}: {err.error}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Preview de datos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Vista Previa de Datos a Cargar</CardTitle>
            <CardDescription>13 clientes activados con cobranzas de Febrero a Mayo 2026</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="min-w-[600px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Cliente</th>
                    <th className="text-left py-2 font-medium">Web</th>
                    <th className="text-left py-2 font-medium">Dominio</th>
                    <th className="text-right py-2 font-medium">Activacion</th>
                    <th className="text-right py-2 font-medium">Mensual</th>
                  </tr>
                </thead>
                <tbody>
                  {activadasPreview.map((row, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2">{row.nombre}</td>
                      <td className="py-2 text-muted-foreground">{row.webName}</td>
                      <td className="py-2 text-muted-foreground text-xs">{row.domain}</td>
                      <td className="py-2 text-right font-medium text-green-600">${row.activacion.toLocaleString()}</td>
                      <td className="py-2 text-right">${row.suscripcion.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-medium">
                    <td colSpan={3} className="py-2">Total</td>
                    <td className="py-2 text-right text-green-600">
                      ${activadasPreview.reduce((sum, r) => sum + r.activacion, 0).toLocaleString()}
                    </td>
                    <td className="py-2 text-right">
                      ${activadasPreview.reduce((sum, r) => sum + r.suscripcion, 0).toLocaleString()}/mes
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
