"use client"

import { useEffect, useRef, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { brandingAPI, BrandingSettings } from "@/lib/api"
import { Loader2, Plus, X, Save, Tag, Building2, CreditCard, Upload, Palette, ImageIcon } from "lucide-react"

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 text-xs px-2.5 py-1">
      {label}
      <button onClick={onRemove} className="hover:text-red-600 leading-none" type="button"><X className="h-3 w-3" /></button>
    </span>
  )
}

function TagInput({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [val, setVal] = useState("")
  const add = () => {
    const v = val.trim().toUpperCase().replace(/\s+/g, "_")
    if (!v || items.includes(v)) { setVal(""); return }
    onChange([...items, v]); setVal("")
  }
  return (
    <>
      <div className="flex gap-2">
        <input
          className="flex-1 h-9 rounded-md border px-3 text-sm"
          placeholder={placeholder}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())}
        />
        <button onClick={add} type="button" className="h-9 px-3 rounded-md bg-blue-600 text-white text-sm font-medium flex items-center gap-1">
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2 min-h-[28px]">
        {items.map(i => <Chip key={i} label={i} onRemove={() => onChange(items.filter(x => x !== i))} />)}
        {items.length === 0 && <p className="text-xs text-muted-foreground">Sin ítems cargados.</p>}
      </div>
    </>
  )
}

export default function PersonalizarPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [b, setB] = useState<BrandingSettings>({
    nombre: "", logo: "", colorPrimario: "#1e40af",
    whatsapp: "", emailContacto: "", direccion: "", cuit: "",
    aseguradorasCatalogo: [], ramosCatalogo: [], mediosPagoCatalogo: [],
  })

  const fileRef = useRef<HTMLInputElement>(null)
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  useEffect(() => {
    if (!token) return
    brandingAPI.get(token)
      .then(r => setB({ ...b, ...r.branding }))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const syncLocalStorage = (next: BrandingSettings) => {
    try {
      localStorage.setItem("branding", JSON.stringify({
        nombre: next.nombre || "",
        logo: next.logo || "",
        colorPrimario: next.colorPrimario || "#1e40af",
      }))
    } catch {}
  }

  const guardar = async () => {
    if (!token) return
    setSaving(true); setOk(null); setErr(null)
    try {
      const r = await brandingAPI.update(token, b)
      syncLocalStorage(r.branding)
      setOk("Cambios guardados correctamente — recargá si no ves el cambio en el sidebar")
    } catch (e: any) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return
    if (file.size > 2 * 1024 * 1024) { setErr("El logo no puede superar los 2MB"); return }
    setUploadingLogo(true); setErr(null); setOk(null)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(",")[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const r = await brandingAPI.uploadLogo(token, base64, file.type)
      const next = { ...b, logo: r.logo }
      setB(next)
      syncLocalStorage(next)
      setOk("Logo subido — recargá si no lo ves en el sidebar")
    } catch (e: any) { setErr(e.message) } finally { setUploadingLogo(false) }
  }

  if (loading) return (
    <DashboardLayout requiredRole={["admin", "admin_seguros"]}>
      <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout requiredRole={["admin", "admin_seguros"]}>
      <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Palette className="h-6 w-6 text-blue-600" /> Personalización del CRM
          </h1>
          <p className="text-muted-foreground text-sm">Logo, colores, datos de la oficina y catálogos.</p>
        </div>

        {err && <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 p-3 text-sm">{err}</div>}
        {ok  && <div className="rounded-lg border border-green-300 bg-green-50 text-green-700 p-3 text-sm">{ok}</div>}

        {/* Datos */}
        <div className="rounded-xl border bg-white p-5 space-y-4">
          <h2 className="font-semibold">Datos del broker</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nombre comercial</label>
              <input className="mt-1 w-full h-9 rounded-md border px-3 text-sm" value={b.nombre || ""} onChange={e => setB({ ...b, nombre: e.target.value })} placeholder="Ej: DP Gestoría Integral" />
              <p className="text-xs text-muted-foreground mt-1">Se muestra en el sidebar y en emails al cliente.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email de contacto</label>
              <input className="mt-1 w-full h-9 rounded-md border px-3 text-sm" type="email" value={b.emailContacto || ""} onChange={e => setB({ ...b, emailContacto: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">WhatsApp</label>
              <input className="mt-1 w-full h-9 rounded-md border px-3 text-sm" placeholder="5411xxxxxxxx" value={b.whatsapp || ""} onChange={e => setB({ ...b, whatsapp: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CUIT</label>
              <input className="mt-1 w-full h-9 rounded-md border px-3 text-sm" value={b.cuit || ""} onChange={e => setB({ ...b, cuit: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Color principal</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" className="h-9 w-14 p-0.5 rounded-md border cursor-pointer" value={b.colorPrimario || "#1e40af"} onChange={e => setB({ ...b, colorPrimario: e.target.value })} />
                <span className="text-sm text-muted-foreground">{b.colorPrimario}</span>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dirección</label>
              <input className="mt-1 w-full h-9 rounded-md border px-3 text-sm" value={b.direccion || ""} onChange={e => setB({ ...b, direccion: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <ImageIcon className="h-4 w-4 text-blue-600" /> Logo del broker
          </h2>
          <p className="text-xs text-muted-foreground mb-3">Aparece en el sidebar y en los emails. PNG/JPG/WebP/SVG · Máx 2MB.</p>
          <div className="flex items-center gap-4">
            {b.logo
              ? <img src={b.logo} alt="Logo" className="h-20 max-w-[220px] object-contain rounded border p-1 bg-gray-50" />
              : <div className="h-20 w-32 rounded border bg-gray-50 flex items-center justify-center text-muted-foreground text-xs">Sin logo</div>
            }
            <div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingLogo}
                className="h-9 px-4 rounded-md bg-blue-600 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                type="button"
              >
                {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {b.logo ? "Cambiar logo" : "Subir logo"}
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleLogoFile} />
            </div>
          </div>
        </div>

        {/* Catálogos */}
        <div className="grid md:grid-cols-3 gap-5">
          <div className="rounded-xl border bg-white p-5">
            <h2 className="flex items-center gap-2 font-semibold mb-3 text-sm">
              <Building2 className="h-4 w-4 text-blue-600" /> Aseguradoras ({(b.aseguradorasCatalogo || []).length})
            </h2>
            <TagInput items={b.aseguradorasCatalogo || []} onChange={v => setB({ ...b, aseguradorasCatalogo: v })} placeholder="Ej: ZURICH" />
          </div>
          <div className="rounded-xl border bg-white p-5">
            <h2 className="flex items-center gap-2 font-semibold mb-3 text-sm">
              <Tag className="h-4 w-4 text-blue-600" /> Ramos ({(b.ramosCatalogo || []).length})
            </h2>
            <TagInput items={b.ramosCatalogo || []} onChange={v => setB({ ...b, ramosCatalogo: v })} placeholder="Ej: AUTOS" />
          </div>
          <div className="rounded-xl border bg-white p-5">
            <h2 className="flex items-center gap-2 font-semibold mb-3 text-sm">
              <CreditCard className="h-4 w-4 text-blue-600" /> Medios de pago ({(b.mediosPagoCatalogo || []).length})
            </h2>
            <TagInput items={b.mediosPagoCatalogo || []} onChange={v => setB({ ...b, mediosPagoCatalogo: v })} placeholder="Ej: CBU" />
          </div>
        </div>

        <div className="sticky bottom-4 flex justify-end">
          <button
            onClick={guardar}
            disabled={saving}
            className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50 shadow-lg"
            type="button"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar cambios
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
