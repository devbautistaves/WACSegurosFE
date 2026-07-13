"use client"

// CRM aislado — botón "Exportar mis datos" (Excel con pólizas, cobranzas,
// siniestros, seguimiento y usuarios). Réplica de la función de SegurOS flota,
// adaptada single-tenant (endpoint /api/aseguradora/export → .xlsx).

import { useState } from "react"
import { Download, Loader2, FileSpreadsheet } from "lucide-react"

export function ExportarDatos() {
  const [downloading, setDownloading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const handleDescargar = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) return
    setDownloading(true); setErr(null); setOk(null)
    try {
      const r = await fetch("/api/proxy/aseguradora/export", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({ error: r.statusText }))
        throw new Error(d.error || "No se pudo generar el export")
      }
      const blob = await r.blob()
      const cd = r.headers.get("Content-Disposition") || ""
      const m = cd.match(/filename="?([^";]+)/i)
      const filename = m?.[1] || `export-datos-${new Date().toISOString().slice(0, 10)}.xlsx`
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = filename
      document.body.appendChild(a); a.click()
      a.remove(); URL.revokeObjectURL(url)
      setOk("Descarga lista")
    } catch (e: any) { setErr(e.message) }
    finally { setDownloading(false) }
  }

  return (
    <div className="rounded-xl border bg-white p-5 space-y-3">
      <div className="flex items-start gap-3">
        <FileSpreadsheet className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h2 className="font-semibold text-sm">Exportar mis datos</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Descargá un Excel con tus pólizas, cobranzas, siniestros, seguimiento y usuarios. Útil para auditoría, respaldo o migrar.
          </p>
        </div>
      </div>
      {ok  && <div className="rounded-lg border border-green-300 bg-green-50 text-green-700 p-2.5 text-sm">{ok}</div>}
      {err && <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 p-2.5 text-sm">{err}</div>}
      <button
        onClick={handleDescargar}
        disabled={downloading}
        type="button"
        className="h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
      >
        {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {downloading ? "Generando…" : "Descargar Excel"}
      </button>
    </div>
  )
}
