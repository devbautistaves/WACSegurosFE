"use client"

/**
 * Wizard de importación inteligente de pólizas.
 *
 * 3 pasos:
 *   1. Upload: drag&drop de Excel/CSV. POST /api/seguros/import/preview
 *      devuelve filas normalizadas + auto-mapeo de columnas.
 *   2. Mapeo: el broker revisa/edita el mapeo de columnas del archivo →
 *      campos destino. Reenvía a preview para refrescar el normalizado.
 *   3. Confirmar: tabla preview con badges OK / WARN / ERR, dedupe selector,
 *      inline-edit del nombre/numPoliza/aseguradora. POST /import/polizas
 *      hace upsert + auto-cobranza + actualiza catálogos.
 */

import { useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { polizasAPI } from "@/lib/api"
import {
  Upload, FileSpreadsheet, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle,
  XCircle, Download, Loader2, Wand2, Save, ListChecks, MessageCircle, LifeBuoy,
} from "lucide-react"

// Soporte (WhatsApp). Si la importación falla o el broker no puede, le ofrecemos
// mandar el archivo y que lo subamos manualmente.
const SOPORTE_WA = "5491135767915"

type Diagnostico = {
  ok: boolean
  warnings: string[]
  errores: string[]
  fuzzyHits: Record<string, { sugerido: string; original: string }>
}
type FilaPreview = {
  fila: number
  raw: Record<string, unknown>
  normalizada: Record<string, unknown>
  diagnostico: Diagnostico
}
type PreviewResp = Awaited<ReturnType<typeof polizasAPI.importPreview>>

const FIELD_LABELS: Record<string, string> = {
  numPoliza: "Nro de póliza",
  aseguradora: "Aseguradora",
  ramo: "Ramo",
  tipoCobertura: "Tipo de cobertura",
  fechaInicVig: "Fecha inicio vig.",
  fechaFinVig: "Fecha fin vig.",
  medioDePago: "Medio de pago",
  estado: "Estado",
  nombreApellido: "Nombre y apellido",
  dni: "DNI",
  fechaNacimiento: "Fecha nacimiento",
  celular: "Celular",
  email: "Email",
  domicilio: "Domicilio",
  localidad: "Localidad",
  cp: "CP",
  patente: "Patente",
  chasis: "Chasis",
  motor: "Motor",
  gnc: "GNC",
  datosRiesgo: "Datos de riesgo",
  motivoAnulacion: "Motivo anulación",
}

function fmtCell(v: unknown): string {
  if (v == null || v === "") return ""
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10)
  if (typeof v === "boolean") return v ? "SI" : "NO"
  return String(v)
}

// Abre WhatsApp de soporte con un mensaje pre-armado (incluye datos de la cuenta).
function abrirSoporte(motivo?: string) {
  let quien = ""
  try {
    const u = JSON.parse(localStorage.getItem("user") || "null")
    if (u) quien = ` Soy ${u.name || u.email || ""}${u.name && u.email ? ` (${u.email})` : ""}.`
  } catch {}
  const partes = [
    `Hola, necesito ayuda para importar mi cartera de pólizas a WAC Seguros.${quien}`,
    motivo ? motivo : "",
    "¿Me ayudan a subirla? Les puedo enviar el archivo por acá.",
  ].filter(Boolean)
  const msg = encodeURIComponent(partes.join(" "))
  window.open(`https://wa.me/${SOPORTE_WA}?text=${msg}`, "_blank")
}

// Tarjeta de "lo subimos por vos". `prominente` = variante destacada (cuando falló algo).
function SoporteCTA({ prominente, detalle, motivo }: { prominente?: boolean; detalle?: string; motivo?: string }) {
  return (
    <Card className={`p-4 ${prominente ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}>
      <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">¿No se pudo importar? La subimos nosotros</p>
          <p className="text-sm text-muted-foreground">
            {detalle || "Mandanos tu archivo de cartera por WhatsApp y nuestro equipo la carga por vos, sin costo."}
          </p>
        </div>
        <Button onClick={() => abrirSoporte(motivo)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 shrink-0">
          <MessageCircle className="h-4 w-4" /> Soporte por WhatsApp
        </Button>
      </div>
    </Card>
  )
}

export default function ImportarPolizasPage() {
  const router = useRouter()
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<1 | 2>(1)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResp | null>(null)
  const [filas, setFilas] = useState<FilaPreview[]>([])
  const [mapeo, setMapeo] = useState<Record<string, string | null>>({})
  const [modoDuplicado, setModoDuplicado] = useState<"saltar" | "actualizar">("saltar")
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [filtroErrores, setFiltroErrores] = useState<"todos" | "errores" | "warnings">("todos")
  const [errorImport, setErrorImport] = useState<string | null>(null)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""

  const onPickFile = async (f: File | null) => {
    if (!f) return
    setFile(f)
    setLoading(true)
    setErrorImport(null)
    try {
      const r = await polizasAPI.importPreview(token, f)
      setPreview(r)
      setFilas(r.filas)
      setMapeo(r.mapeoSugerido)
      setStep(2)
    } catch (e: any) {
      toast({ title: "Error al leer el archivo", description: e.message, variant: "destructive" })
      setErrorImport(`No pudimos leer "${f.name}". ${e.message || ""}`.trim())
    } finally {
      setLoading(false)
    }
  }

  const reaplicarMapeo = async () => {
    if (!file) return
    setLoading(true)
    try {
      const r = await polizasAPI.importPreview(token, file, mapeo)
      setPreview(r)
      setFilas(r.filas)
    } catch (e: any) {
      toast({ title: "Error al aplicar mapeo", description: e.message, variant: "destructive" })
      setErrorImport(`Hubo un problema al procesar las columnas del archivo. ${e.message || ""}`.trim())
    } finally {
      setLoading(false)
    }
  }

  const editarCelda = (idx: number, campo: string, valor: string) => {
    setFilas(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], normalizada: { ...next[idx].normalizada, [campo]: valor } }
      return next
    })
  }

  const eliminarFila = (idx: number) => {
    setFilas(prev => prev.filter((_, i) => i !== idx))
  }

  const confirmar = async () => {
    const filasOk = filas.filter(f => f.diagnostico.ok || f.diagnostico.errores.length === 0)
    if (filasOk.length === 0) {
      toast({ title: "Nada para importar", description: "No hay filas válidas.", variant: "destructive" })
      return
    }
    setLoading(true)
    setErrorImport(null)
    try {
      const r = await polizasAPI.importConfirmar(
        token,
        filasOk.map(f => f.normalizada),
        modoDuplicado,
      )
      toast({
        title: "Importación completa",
        description: `${r.creadas} creadas · ${r.actualizadas} actualizadas · ${r.saltadas} saltadas · ${r.cobranzasCreadas} cobranzas`,
      })
      try { window.dispatchEvent(new CustomEvent("branding-updated")) } catch {}
      router.push("/admin/seguros/polizas")
    } catch (e: any) {
      toast({ title: "Error al importar", description: e.message, variant: "destructive" })
      setErrorImport(`La importación no se pudo completar. ${e.message || ""}`.trim())
    } finally {
      setLoading(false)
    }
  }

  // Plantilla generada 100% en el cliente (CSV con ; y BOM para Excel ES).
  const descargarPlantilla = () => {
    const headers = [
      "Nro Poliza","Aseguradora","Ramo","Tipo Cobertura","Fecha Inicio Vig","Fecha Fin Vig",
      "Medio de Pago","Estado","Nombre y Apellido","DNI","Fecha Nacimiento","Celular","Email",
      "Domicilio","Localidad","CP","Patente","Chasis","Motor","GNC","Datos de Riesgo",
    ]
    const ejemplo = [
      "P-12345","SANCOR","AUTOS","TODO RIESGO","01/01/2026","01/01/2027",
      "EFECTIVO","VIGENTE","Juan Perez","20111222","15/03/1985","1144556677","juan@example.com",
      "Av. Siempreviva 742","CABA","1414","AB123CD","9BWAA05U58P012345","ABC123456","NO","Toyota Corolla 2022",
    ]
    const escapar = (c: string) => `"${String(c).replace(/"/g, '""')}"`
    const csv = "﻿" + [headers, ejemplo].map(r => r.map(escapar).join(";")).join("\r\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "plantilla_polizas.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
  }

  const filasFiltradas = filas.filter(f => {
    if (filtroErrores === "errores") return f.diagnostico.errores.length > 0
    if (filtroErrores === "warnings") return f.diagnostico.warnings.length > 0
    return true
  })

  return (
    <DashboardLayout requiredRole={["admin", "admin_seguros"]}>
      <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">

        {/* Header + stepper */}
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/admin/seguros/polizas" className="hover:underline">Pólizas</Link>
            <span>/</span>
            <span>Importar</span>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <FileSpreadsheet className="h-6 w-6 text-blue-600" /> Importá tu cartera
              </h1>
              <p className="text-muted-foreground text-sm">Subí un Excel/CSV. Nosotros auto-mapeamos las columnas y validamos las filas.</p>
            </div>
            <Button variant="outline" onClick={descargarPlantilla} className="gap-2">
              <Download className="h-4 w-4" /> Plantilla .csv
            </Button>
          </div>

          {/* Stepper — 2 pasos */}
          <div className="mt-5 flex items-center gap-2 text-sm">
            {[
              { n: 1, t: "Subir archivo" },
              { n: 2, t: "Revisar e importar" },
            ].map((s, i, arr) => (
              <div key={s.n} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center justify-center h-7 w-7 rounded-full font-bold text-xs ${step >= (s.n as 1|2) ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                  {s.n}
                </div>
                <span className={`hidden sm:inline ${step === s.n ? "font-semibold" : "text-muted-foreground"}`}>{s.t}</span>
                {i < arr.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${step > s.n ? "bg-blue-600" : "bg-slate-200"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Panel de soporte destacado: aparece si la importación falló */}
        {errorImport && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 rounded-lg border border-red-200 bg-red-50 text-sm">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">No se pudo importar</p>
                <p className="text-red-700">{errorImport}</p>
                <p className="text-red-700/80 mt-1">No te preocupes: lo cargamos por vos. Escribinos por WhatsApp y mandanos el archivo.</p>
              </div>
            </div>
            <SoporteCTA prominente motivo={`Tuve un problema al importar: ${errorImport}`} />
          </div>
        )}

        {/* ── PASO 1: Upload ─────────────────────────────────────────── */}
        {step === 1 && (
          <Card className="p-8">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const f = e.dataTransfer.files?.[0]
                if (f) onPickFile(f)
              }}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${dragOver ? "border-blue-600 bg-blue-50" : "border-slate-300"}`}
            >
              <Upload className="h-12 w-12 mx-auto text-slate-400 mb-4" />
              <p className="text-lg font-semibold mb-1">Arrastrá tu archivo acá</p>
              <p className="text-sm text-muted-foreground mb-4">Excel (.xlsx, .xls) o CSV — hasta 5.000 filas</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.tsv"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0] || null)}
              />
              <Button onClick={() => inputRef.current?.click()} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Elegir archivo
              </Button>
            </div>
            <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm">
              <p className="font-semibold text-blue-900 mb-1 flex items-center gap-1"><Wand2 className="h-4 w-4" /> Cómo funciona</p>
              <ul className="text-slate-700 space-y-1 list-disc list-inside">
                <li>Detectamos automáticamente columnas comunes: <em>aseguradora, ramo, vencimiento, asegurado, patente, etc.</em></li>
                <li>Normalizamos fechas (dd/mm/yyyy, ISO, seriales de Excel) y patentes.</li>
                <li>Inferimos <strong>AUTOS</strong> si la fila tiene patente o chasis.</li>
                <li>Si una <strong>aseguradora o ramo</strong> es nuevo, lo agregamos a tu catálogo.</li>
                <li>Si el medio de pago es <strong>EFECTIVO/CUPON</strong>, generamos la cobranza inicial automáticamente.</li>
              </ul>
            </div>
            <div className="mt-4">
              <SoporteCTA detalle="¿El archivo no se sube, no tenés Excel a mano, o preferís que la carguemos nosotros? Mandanos tu cartera por WhatsApp y la subimos por vos, sin costo." />
            </div>
          </Card>
        )}

        {/* ── PASO 2: Preview + confirmar (mapeo automático) ───────── */}
        {step === 2 && preview && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground uppercase">Total</p>
                <p className="text-2xl font-bold">{filas.length}</p>
              </Card>
              <Card className="p-4 border-green-200 bg-green-50">
                <p className="text-xs text-green-700 uppercase flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> OK</p>
                <p className="text-2xl font-bold text-green-700">{filas.filter(f => f.diagnostico.ok).length}</p>
              </Card>
              <Card className="p-4 border-amber-200 bg-amber-50">
                <p className="text-xs text-amber-700 uppercase flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Con avisos</p>
                <p className="text-2xl font-bold text-amber-700">{filas.filter(f => f.diagnostico.warnings.length > 0).length}</p>
              </Card>
              <Card className="p-4 border-red-200 bg-red-50">
                <p className="text-xs text-red-700 uppercase flex items-center gap-1"><XCircle className="h-3 w-3" /> Con errores</p>
                <p className="text-2xl font-bold text-red-700">{filas.filter(f => f.diagnostico.errores.length > 0).length}</p>
              </Card>
            </div>

            {/* Mapeo manual — colapsado por defecto. */}
            <Card className="p-0 overflow-hidden">
              <details className="group">
                <summary className="cursor-pointer list-none flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2 text-sm">
                    <Wand2 className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Mapeo automático aplicado</span>
                    <span className="text-muted-foreground">
                      ({Object.values(mapeo).filter(Boolean).length} de {preview.headers.length} columnas mapeadas)
                    </span>
                  </div>
                  <span className="text-xs text-blue-600 group-open:hidden">Ajustar →</span>
                  <span className="text-xs text-blue-600 hidden group-open:inline">Cerrar ↑</span>
                </summary>
                <div className="border-t p-4 space-y-3 bg-slate-50/40">
                  <p className="text-xs text-muted-foreground">
                    Si alguna columna no se mapeó bien, corregila acá y tocá <em>"Aplicar"</em>.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[40vh] overflow-auto">
                    {preview.headers.map((h) => (
                      <div key={h} className="flex items-center gap-2 p-2 rounded border bg-white text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-muted-foreground uppercase">Tu columna</p>
                          <p className="font-medium truncate">{h}</p>
                        </div>
                        <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                        <select
                          value={mapeo[h] || ""}
                          onChange={(e) => setMapeo({ ...mapeo, [h]: e.target.value || null })}
                          className="flex-1 min-w-0 px-2 py-1 rounded border border-slate-300 bg-white text-xs"
                        >
                          <option value="">— Ignorar —</option>
                          {preview.camposDestino.map((c) => (
                            <option key={c} value={c}>{FIELD_LABELS[c] || c}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={reaplicarMapeo} disabled={loading} size="sm" className="gap-2">
                      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                      Aplicar mapeo
                    </Button>
                  </div>
                </div>
              </details>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                <div className="flex gap-2">
                  <Button size="sm" variant={filtroErrores === "todos" ? "default" : "outline"} onClick={() => setFiltroErrores("todos")}>Todos</Button>
                  <Button size="sm" variant={filtroErrores === "warnings" ? "default" : "outline"} onClick={() => setFiltroErrores("warnings")}>Avisos</Button>
                  <Button size="sm" variant={filtroErrores === "errores" ? "default" : "outline"} onClick={() => setFiltroErrores("errores")}>Errores</Button>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <label className="text-muted-foreground">Si existe la póliza:</label>
                  <select
                    value={modoDuplicado}
                    onChange={(e) => setModoDuplicado(e.target.value as any)}
                    className="px-2 py-1 rounded border border-slate-300 text-sm"
                  >
                    <option value="saltar">Saltar</option>
                    <option value="actualizar">Actualizar</option>
                  </select>
                </div>
              </div>

              <div className="overflow-auto max-h-[60vh] border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left">Fila</th>
                      <th className="px-2 py-2 text-left">Estado</th>
                      <th className="px-2 py-2 text-left">Nro Póliza</th>
                      <th className="px-2 py-2 text-left">Asegurado</th>
                      <th className="px-2 py-2 text-left">Aseguradora</th>
                      <th className="px-2 py-2 text-left">Ramo</th>
                      <th className="px-2 py-2 text-left">Patente</th>
                      <th className="px-2 py-2 text-left">Fin Vig.</th>
                      <th className="px-2 py-2 text-left">Medio</th>
                      <th className="px-2 py-2 text-left">Avisos</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasFiltradas.map((f) => {
                      const idx = filas.indexOf(f)
                      const n = f.normalizada
                      const bg = f.diagnostico.errores.length > 0 ? "bg-red-50" :
                                 f.diagnostico.warnings.length > 0 ? "bg-amber-50" : ""
                      return (
                        <tr key={f.fila} className={`border-t ${bg}`}>
                          <td className="px-2 py-1 font-mono text-muted-foreground">{f.fila}</td>
                          <td className="px-2 py-1">
                            {f.diagnostico.errores.length > 0 ? (
                              <XCircle className="h-4 w-4 text-red-600" />
                            ) : f.diagnostico.warnings.length > 0 ? (
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </td>
                          <td className="px-2 py-1">
                            <input
                              value={fmtCell(n.numPoliza)}
                              onChange={(e) => editarCelda(idx, "numPoliza", e.target.value)}
                              className="w-24 px-1 py-0.5 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              value={fmtCell(n.nombreApellido)}
                              onChange={(e) => editarCelda(idx, "nombreApellido", e.target.value)}
                              className="w-40 px-1 py-0.5 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              value={fmtCell(n.aseguradora)}
                              onChange={(e) => editarCelda(idx, "aseguradora", e.target.value)}
                              className="w-28 px-1 py-0.5 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none"
                            />
                            {f.diagnostico.fuzzyHits.aseguradora && (
                              <span className="text-[10px] text-blue-600 block">↳ {f.diagnostico.fuzzyHits.aseguradora.original}</span>
                            )}
                          </td>
                          <td className="px-2 py-1">{fmtCell(n.ramo)}</td>
                          <td className="px-2 py-1 font-mono">{fmtCell(n.patente)}</td>
                          <td className="px-2 py-1">{fmtCell(n.fechaFinVig)}</td>
                          <td className="px-2 py-1">{fmtCell(n.medioDePago)}</td>
                          <td className="px-2 py-1 text-[10px]">
                            {f.diagnostico.errores.map((e, i) => <div key={"e"+i} className="text-red-700">{e}</div>)}
                            {f.diagnostico.warnings.map((w, i) => <div key={"w"+i} className="text-amber-700">{w}</div>)}
                          </td>
                          <td className="px-2 py-1">
                            <button onClick={() => eliminarFila(idx)} className="text-red-500 hover:text-red-700" title="Quitar de la importación">
                              <XCircle className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Si quedan filas con error que el broker no puede corregir, ofrecemos soporte */}
            {filas.filter(f => f.diagnostico.errores.length > 0).length > 0 && (
              <SoporteCTA
                detalle="¿Hay filas con errores que no podés corregir? Mandanos el archivo original por WhatsApp y lo dejamos cargado por vos."
                motivo="Tengo filas con errores en la importación que no puedo corregir."
              />
            )}

            <div className="flex justify-between items-center gap-3 flex-wrap">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Cambiar archivo
              </Button>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <ListChecks className="h-4 w-4" />
                  {filas.filter(f => f.diagnostico.errores.length === 0).length} listas para importar
                </span>
                <Button onClick={confirmar} disabled={loading} size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Importar
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
