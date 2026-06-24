"use client"

import { useCallback, useEffect, useState } from "react"
import { legajoAseguradoAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Inbox, CheckCircle2, XCircle, ChevronDown, ChevronRight, ImageOff, FileText } from "lucide-react"

// Banner + acordeón con los comprobantes que los asegurados subieron desde su
// legajo público. El PAS confirma el pago (marca COBRADA + email al asegurado)
// o lo rechaza con motivo.

type ItemPendiente = {
  cobranzaId: string
  nombreApellido: string
  aseguradora?: string
  patente?: string
  ramo?: string
  mes: string
  mesLabel?: string
  monto?: number | null
  subidoEn?: string
  tieneImagen: boolean
}

const dateAR = (d?: string | null) => d ? new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "2-digit" }) : ""
const labelCia = (s?: string) => (s || "").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())

export function ComprobantesPendientesPanel({ autoOpenKey }: { autoOpenKey?: { cobranzaId: string; mes: string } | null }) {
  const [items, setItems] = useState<ItemPendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState(true)
  const [abierto, setAbierto] = useState<string | null>(null) // key cobranzaId:mes
  const [imgs, setImgs] = useState<Record<string, string>>({})
  const [working, setWorking] = useState<string | null>(null)
  const [rechazoMotivo, setRechazoMotivo] = useState<Record<string, string>>({})
  const [monto, setMonto] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  const cargar = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const r = await legajoAseguradoAPI.comprobantesPendientes(token)
      setItems(r.items)
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => { cargar() }, [cargar])

  // Auto-abre el comprobante si la URL trae ?comprobante=... &mes=...
  useEffect(() => {
    if (!autoOpenKey) return
    const k = `${autoOpenKey.cobranzaId}:${autoOpenKey.mes}`
    setExpandido(true); setAbierto(k); abrirImagen(k, autoOpenKey.cobranzaId, autoOpenKey.mes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenKey])

  const abrirImagen = async (key: string, cobranzaId: string, mes: string) => {
    if (imgs[key] || !token) return
    try {
      const r = await legajoAseguradoAPI.getComprobante(token, cobranzaId, mes)
      setImgs(prev => ({ ...prev, [key]: r.comprobante.dataUrl }))
    } catch (e: any) { toast({ variant: "destructive", title: "No se pudo abrir el comprobante", description: e.message }) }
  }

  const confirmar = async (it: ItemPendiente) => {
    if (!token) return
    const key = `${it.cobranzaId}:${it.mes}`
    setWorking(key)
    try {
      const m = monto[key] ? Number(monto[key]) : undefined
      await legajoAseguradoAPI.confirmarComprobante(token, it.cobranzaId, { mes: it.mes, monto: m })
      toast({ title: "Pago confirmado", description: `${it.nombreApellido} — ${it.mesLabel || it.mes}` })
      await cargar()
    } catch (e: any) { toast({ variant: "destructive", title: "No se pudo confirmar", description: e.message }) }
    finally { setWorking(null) }
  }

  const rechazar = async (it: ItemPendiente) => {
    if (!token) return
    const key = `${it.cobranzaId}:${it.mes}`
    setWorking(key)
    try {
      await legajoAseguradoAPI.rechazarComprobante(token, it.cobranzaId, { mes: it.mes, motivo: rechazoMotivo[key] || "" })
      toast({ title: "Comprobante rechazado", description: "El asegurado puede subir uno nuevo." })
      await cargar()
    } catch (e: any) { toast({ variant: "destructive", title: "No se pudo rechazar", description: e.message }) }
    finally { setWorking(null) }
  }

  if (loading && items.length === 0) return null
  if (items.length === 0) return null

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/40 mb-4">
      <button onClick={() => setExpandido(v => !v)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <span className="h-9 w-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
          <Inbox className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-blue-900">
            {items.length} comprobante{items.length === 1 ? "" : "s"} esperando tu confirmación
          </p>
          <p className="text-xs text-blue-700/70">
            Subidos por tus asegurados desde su legajo público.
          </p>
        </div>
        {expandido ? <ChevronDown className="h-4 w-4 text-blue-700" /> : <ChevronRight className="h-4 w-4 text-blue-700" />}
      </button>

      {expandido && (
        <div className="border-t border-blue-200 divide-y divide-blue-100">
          {items.map(it => {
            const key = `${it.cobranzaId}:${it.mes}`
            const open = abierto === key
            return (
              <div key={key} className="bg-white">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                  onClick={() => { setAbierto(open ? null : key); if (!open) abrirImagen(key, it.cobranzaId, it.mes) }}
                >
                  <span className="h-8 w-8 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold uppercase">
                    {it.tieneImagen ? <FileText className="h-4 w-4" /> : <ImageOff className="h-4 w-4" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{it.nombreApellido}</p>
                    <p className="text-xs text-muted-foreground">
                      {labelCia(it.aseguradora) || "Cobranza"}
                      {it.patente ? ` · ${it.patente}` : ""}
                      {" · "}{it.mesLabel || it.mes}
                      {it.subidoEn ? ` · ${dateAR(it.subidoEn)}` : ""}
                    </p>
                  </div>
                  {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
                {open && (
                  <div className="px-4 pb-4 pt-1 grid md:grid-cols-2 gap-4 bg-gray-50/40">
                    <div className="bg-white border rounded-lg p-2 min-h-[160px] flex items-center justify-center">
                      {imgs[key]
                        ? (imgs[key].startsWith("data:application/pdf")
                            ? <a href={imgs[key]} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm">Abrir PDF</a>
                            // eslint-disable-next-line @next/next/no-img-element
                            : <img src={imgs[key]} alt="comprobante" className="max-h-[320px] max-w-full rounded" />)
                        : <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Monto cobrado (opcional)</label>
                        <input type="number" inputMode="decimal"
                          className="mt-1 w-full h-9 rounded-md border px-3 text-sm"
                          placeholder="Lo registramos para tu cuenta corriente"
                          value={monto[key] || ""} onChange={e => setMonto(prev => ({ ...prev, [key]: e.target.value }))} />
                      </div>
                      <button onClick={() => confirmar(it)} disabled={working === key}
                        className="w-full h-10 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                        {working === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Confirmar pago
                      </button>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Si vas a rechazar, contale por qué</label>
                        <input
                          className="mt-1 w-full h-9 rounded-md border px-3 text-sm"
                          placeholder="Ej: el monto no coincide"
                          value={rechazoMotivo[key] || ""} onChange={e => setRechazoMotivo(prev => ({ ...prev, [key]: e.target.value }))} />
                      </div>
                      <button onClick={() => rechazar(it)} disabled={working === key}
                        className="w-full h-9 rounded-md border border-red-200 bg-white hover:bg-red-50 text-red-700 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
                        <XCircle className="h-4 w-4" /> Rechazar comprobante
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
